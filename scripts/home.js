/**
 * 三维课首页交互
 * - 离开前保存滚动位置，返回时恢复
 * - 课程筛选 / 滚动渐入 / 续学
 */

import { LESSONS } from './lessons-data.js'

const STORAGE_KEY = 'three-course-last'
const VISITED_KEY = 'three-course-visited'
const SCROLL_KEY = 'three-course-home-scroll'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

function getVisited() {
  try {
    return JSON.parse(localStorage.getItem(VISITED_KEY) || '[]')
  } catch {
    return []
  }
}

function markVisited(id) {
  const list = new Set(getVisited())
  list.add(id)
  localStorage.setItem(VISITED_KEY, JSON.stringify([...list]))
  localStorage.setItem(STORAGE_KEY, id)
}

function saveScroll() {
  sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)))
  sessionStorage.setItem(SCROLL_KEY + ':pending', '1')
}

function restoreScroll() {
  const pending = sessionStorage.getItem(SCROLL_KEY + ':pending')
  const raw = sessionStorage.getItem(SCROLL_KEY)
  if (!pending || raw == null) return

  const top = Number(raw)
  if (!Number.isFinite(top)) return

  // 恢复前先显示所有 reveal，避免滚到半空仍透明
  document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-in'))

  const jump = () => window.scrollTo(0, top)
  jump()
  requestAnimationFrame(() => {
    jump()
    requestAnimationFrame(() => {
      jump()
      sessionStorage.removeItem(SCROLL_KEY + ':pending')
    })
  })
}

function applyVisitedState() {
  const visited = new Set(getVisited())
  document.querySelectorAll('[data-id]').forEach((el) => {
    if (visited.has(el.dataset.id)) el.classList.add('is-visited')
  })
}

function setupResumeHint() {
  const last = localStorage.getItem(STORAGE_KEY)
  const hint = document.getElementById('resumeHint')
  if (!last || !hint) return

  const lesson = LESSONS.find((l) => l.id === last)
  if (!lesson) return

  hint.hidden = false
  hint.innerHTML = `上次学到 <a href="${lesson.href}">${lesson.index} ${lesson.title}</a>，可从这里继续。`

  const startBtn = document.getElementById('startBtn')
  if (startBtn && last !== '01-hello-cube') {
    startBtn.href = lesson.href
    startBtn.innerHTML = `继续上次<span class="btn-arrow" aria-hidden="true">→</span>`
  }
}

function setupFilters() {
  const chips = document.querySelectorAll('.chip[data-filter]')
  const lessons = document.querySelectorAll('[data-filterable]')

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const filter = chip.dataset.filter
      chips.forEach((c) => {
        const on = c === chip
        c.classList.toggle('is-active', on)
        c.setAttribute('aria-selected', on ? 'true' : 'false')
      })

      lessons.forEach((el) => {
        const tags = (el.dataset.tags || '').split(/\s+/)
        const show = filter === 'all' || tags.includes(filter)
        el.classList.toggle('is-hidden', !show)
      })

      if (filter === 'practice' || filter === 'challenge') {
        document.getElementById('studio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (filter === 'basics') {
        document.getElementById('fundamentals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}

function setupReveal() {
  const nodes = document.querySelectorAll('[data-reveal]')
  if (!nodes.length) return

  // 若正在恢复滚动，setupReveal 外已全部 is-in，这里跳过观察即可
  if (sessionStorage.getItem(SCROLL_KEY + ':pending')) {
    nodes.forEach((n) => n.classList.add('is-in'))
    return
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach((n) => n.classList.add('is-in'))
    return
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in')
          io.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1, rootMargin: '0px 0px -6% 0px' },
  )

  nodes.forEach((n, i) => {
    n.style.transitionDelay = `${Math.min(i % 5, 4) * 40}ms`
    io.observe(n)
  })
}

function setupTrackClicks() {
  document.querySelectorAll('a[href*="/examples/"]').forEach((a) => {
    a.addEventListener('click', () => {
      saveScroll()
      const host = a.closest('[data-id]')
      const id = host?.dataset.id || a.getAttribute('href')?.split('/').filter(Boolean).pop()
      if (id) markVisited(id)
    })
  })
}

// 页面显示时恢复（含浏览器后退）
window.addEventListener('pageshow', (event) => {
  // bfcache 回来时浏览器通常已恢复滚动；若我们有 pending 仍对齐一次
  if (event.persisted || sessionStorage.getItem(SCROLL_KEY + ':pending')) {
    restoreScroll()
  }
})

applyVisitedState()
setupResumeHint()
setupFilters()
setupTrackClicks()
setupReveal()
restoreScroll()

// 滚动中节流保存，防止未点链接就刷新丢失（可选增强）
let scrollTimer = 0
window.addEventListener(
  'scroll',
  () => {
    window.clearTimeout(scrollTimer)
    scrollTimer = window.setTimeout(() => {
      sessionStorage.setItem(SCROLL_KEY, String(Math.round(window.scrollY)))
    }, 120)
  },
  { passive: true },
)
