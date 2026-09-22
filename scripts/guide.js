/**
 * 学习指南页：把 Markdown 渲染成排版好的网页，并生成侧栏目录
 */
import { marked } from 'marked'
import guideMd from '../docs/threejs-learning-guide.md?raw'

marked.setOptions({
  gfm: true,
  breaks: false,
})

const contentEl = document.getElementById('guideContent')
const tocNav = document.getElementById('tocNav')

/** 给标题生成稳定 id，供目录跳转 */
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
}

function enhanceHtml(html) {
  const wrap = document.createElement('div')
  wrap.innerHTML = html

  // 去掉文章里重复的一级标题（页面 hero 已有）
  const h1 = wrap.querySelector('h1')
  if (h1) h1.remove()

  // 引用块里的第一段作为导语时保留
  wrap.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') || ''
    // 仓库相对链接：examples → 可点进案例
    if (href.startsWith('../examples/')) {
      a.setAttribute('href', href.replace('../examples/', '/examples/'))
    } else if (href.startsWith('./examples/')) {
      a.setAttribute('href', href.replace('./examples/', '/examples/'))
    } else if (href.includes('examples/') && !href.startsWith('http') && !href.startsWith('/')) {
      const m = href.match(/examples\/[^)\s#]+/)
      if (m) a.setAttribute('href', `/${m[0]}`.replace(/\/$/, '/'))
    }
    // 外链新窗口
    if (/^https?:\/\//.test(a.getAttribute('href') || '')) {
      a.setAttribute('target', '_blank')
      a.setAttribute('rel', 'noreferrer')
    }
  })

  // 为标题补 id
  const used = new Set()
  wrap.querySelectorAll('h2, h3').forEach((h) => {
    let id = slugify(h.textContent || 'section')
    if (!id) id = 'section'
    let unique = id
    let i = 2
    while (used.has(unique)) {
      unique = `${id}-${i++}`
    }
    used.add(unique)
    h.id = unique
  })

  return wrap
}

function buildToc(articleRoot) {
  const headings = [...articleRoot.querySelectorAll('h2')]
  if (!headings.length) {
    tocNav.innerHTML = '<p class="toc-empty">暂无目录</p>'
    return
  }
  tocNav.innerHTML = headings
    .map(
      (h) =>
        `<a href="#${h.id}" class="toc-link">${h.textContent}</a>`,
    )
    .join('')
}

function setupScrollSpy() {
  const links = [...tocNav.querySelectorAll('.toc-link')]
  const map = links
    .map((a) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1))
      return { a, el: document.getElementById(id) }
    })
    .filter((x) => x.el)

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const id = entry.target.id
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${id}`))
      })
    },
    { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
  )

  map.forEach(({ el }) => io.observe(el))
}

try {
  const rawHtml = marked.parse(guideMd)
  const article = enhanceHtml(rawHtml)
  contentEl.innerHTML = ''
  contentEl.append(...article.childNodes)
  buildToc(contentEl)
  setupScrollSpy()
} catch (err) {
  contentEl.innerHTML = `<p class="error">指南加载失败：${err.message || err}</p>`
}
