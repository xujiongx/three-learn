/**
 * 示例页教学壳：概念面板、上下课导航、返回时记住首页滚动位置
 */
import { LESSON_BY_ID, lessonIdFromPath } from './lessons-data.js'

const SCROLL_KEY = 'three-course-home-scroll'
const STORAGE_KEY = 'three-course-last'
const VISITED_KEY = 'three-course-visited'

const id = lessonIdFromPath()
const lesson = id ? LESSON_BY_ID[id] : null

function markVisited(lessonId) {
  try {
    const list = new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]'))
    list.add(lessonId)
    localStorage.setItem(VISITED_KEY, JSON.stringify([...list]))
    localStorage.setItem(STORAGE_KEY, lessonId)
  } catch {}
}

function saveHomeScrollBeforeLeave() {
  // 返回首页时，浏览器可能用 bfcache；仍写入标记让首页知道「需要恢复」
  sessionStorage.setItem(SCROLL_KEY + ':pending', '1')
}

if (lesson) {
  markVisited(lesson.id)
  document.title = `${lesson.index} · ${lesson.title} · 三维课`
  buildShell(lesson)
}

function buildShell(l) {
  document.body.classList.add('has-lesson-shell')

  // 返回链接：带上 restore 标记
  const back = document.querySelector('a.back')
  if (back) {
    back.addEventListener('click', saveHomeScrollBeforeLeave)
  }

  // 顶部课程条
  const bar = document.createElement('header')
  bar.className = 'lesson-bar'
  bar.innerHTML = `
    <div class="lesson-bar-main">
      <p class="lesson-bar-kicker">${l.stage === 'basics' ? '基础课' : l.stage === 'practice' ? '练手坊' : '挑战'} · ${l.index}</p>
      <h1 class="lesson-bar-title">${l.title}</h1>
      <p class="lesson-bar-summary">${l.summary}</p>
    </div>
    <button type="button" class="lesson-toggle" id="conceptToggle" aria-expanded="false">
      概念说明
    </button>
  `
  document.body.appendChild(bar)

  // 概念抽屉
  const drawer = document.createElement('aside')
  drawer.className = 'lesson-drawer'
  drawer.id = 'conceptDrawer'
  drawer.setAttribute('aria-hidden', 'true')
  drawer.innerHTML = `
    <div class="lesson-drawer-inner">
      <div class="lesson-drawer-head">
        <h2>这一课在讲什么</h2>
        <button type="button" class="lesson-drawer-close" id="conceptClose" aria-label="关闭">×</button>
      </div>
      <p class="lesson-why">${l.why}</p>
      <h3>核心概念</h3>
      <ul class="lesson-concepts">
        ${l.concepts.map((c) => `<li>${c}</li>`).join('')}
      </ul>
      <h3>建议动手</h3>
      <ol class="lesson-try">
        ${l.try.map((t) => `<li>${t}</li>`).join('')}
      </ol>
      <p class="lesson-tip">源码 <code>main.js</code> 里有面向初学者的详细注释，建议对照着改参数。</p>
    </div>
  `
  document.body.appendChild(drawer)

  // 底部上下课
  const nav = document.createElement('nav')
  nav.className = 'lesson-pager'
  nav.setAttribute('aria-label', '上下课')
  const prev = l.prev ? LESSON_BY_ID[l.prev] : null
  const next = l.next ? LESSON_BY_ID[l.next] : null
  nav.innerHTML = `
    ${
      prev
        ? `<a class="pager-link pager-prev" href="${prev.href}"><span>上一课</span><strong>${prev.index} ${prev.title}</strong></a>`
        : `<span class="pager-link is-disabled"><span>上一课</span><strong>已是第一课</strong></span>`
    }
    <a class="pager-link pager-home" href="/">课程目录</a>
    ${
      next
        ? `<a class="pager-link pager-next" href="${next.href}"><span>下一课</span><strong>${next.index} ${next.title}</strong></a>`
        : `<span class="pager-link is-disabled"><span>下一课</span><strong>全部完成</strong></span>`
    }
  `
  document.body.appendChild(nav)

  // 精简原 HUD：避免与新壳重复，若存在则改为短提示
  const hud = document.querySelector('.hud')
  if (hud) {
    hud.classList.add('hud-compact')
    hud.innerHTML = `<p>拖拽 / 滚轮操作场景 · 点右上角查看概念</p>`
  }

  const toggle = document.getElementById('conceptToggle')
  const close = document.getElementById('conceptClose')

  function setOpen(open) {
    drawer.classList.toggle('is-open', open)
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true')
    toggle?.setAttribute('aria-expanded', open ? 'true' : 'false')
    document.body.classList.toggle('drawer-open', open)
  }

  toggle?.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')))
  close?.addEventListener('click', () => setOpen(false))
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) setOpen(false)
  })

  // 首次进入自动展开概念 2.5s 提示感：移动端不自动开，桌面首次开
  const seenKey = `three-course-drawer-seen:${l.id}`
  if (!sessionStorage.getItem(seenKey) && window.matchMedia('(min-width: 900px)').matches) {
    setOpen(true)
    sessionStorage.setItem(seenKey, '1')
  }
}
