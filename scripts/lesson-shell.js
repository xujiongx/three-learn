/**
 * 示例页教学壳：
 * - 与首页统一的浅色教学工作台
 * - 桌面：左说明/代码 · 右预览
 * - 移动：上预览 · 下说明/代码
 * - 修改代码后可运行重载
 */
import { LESSON_BY_ID, lessonIdFromPath } from './lessons-data.js'

const SCROLL_KEY = 'three-course-home-scroll'
const STORAGE_KEY = 'three-course-last'
const VISITED_KEY = 'three-course-visited'
const THREE_VERSION = '0.170.0'

const RAW_SOURCES = import.meta.glob('../examples/**/main.js', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function getRawSource(lessonId) {
  const entry = Object.entries(RAW_SOURCES).find(([path]) =>
    path.replace(/\\/g, '/').endsWith(`/examples/${lessonId}/main.js`),
  )
  return entry ? entry[1] : null
}

function normalizeImports(code) {
  return code
    .replace(
      /from\s+["']\/node_modules\/\.vite\/deps\/three\.js[^"']*["']/g,
      "from 'three'",
    )
    .replace(
      /from\s+["']\/@fs\/[^"']*\/node_modules\/three\/build\/three\.module\.js[^"']*["']/g,
      "from 'three'",
    )
    .replace(
      /from\s+["'][^"']*\/three\/examples\/jsm\/([^"']+)["']/g,
      (_m, sub) => `from 'three/addons/${sub}'`,
    )
    .replace(/from\s+["']\/node_modules\/\.vite\/deps\/([^"']+)["']/g, (_m, dep) => {
      if (/OrbitControls/i.test(dep)) return "from 'three/addons/controls/OrbitControls.js'"
      if (/PointerLockControls/i.test(dep)) {
        return "from 'three/addons/controls/PointerLockControls.js'"
      }
      return "from 'three'"
    })
}

const id = lessonIdFromPath()
const lesson = id ? LESSON_BY_ID[id] : null

const UI_SELECTORS = [
  '.panel',
  '.blocker',
  '.hud-top',
  '.overlay-center',
  '.tooltip',
  '.room-info',
  '.caption',
]

let originalCode = ''
let previewFrame = null
let codeEditor = null
let statusEl = null
let stageHost = null

function markVisited(lessonId) {
  try {
    const list = new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || '[]'))
    list.add(lessonId)
    localStorage.setItem(VISITED_KEY, JSON.stringify([...list]))
    localStorage.setItem(STORAGE_KEY, lessonId)
  } catch {}
}

function saveHomeScrollBeforeLeave() {
  sessionStorage.setItem(`${SCROLL_KEY}:pending`, '1')
}

function collectUiHtml() {
  return UI_SELECTORS.map((sel) => {
    const el = document.querySelector(sel)
    return el ? el.outerHTML : ''
  })
    .filter(Boolean)
    .join('\n')
}

function hideParentUi() {
  UI_SELECTORS.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.classList.add('ui-for-preview'))
  })
  document.querySelectorAll('.hud, a.back').forEach((el) => el.classList.add('ui-for-preview'))
}

function stageLabel(l) {
  if (l.stage === 'basics') return '基础课'
  if (l.stage === 'practice') return '练手坊'
  return '挑战'
}

function buildSrcdoc(code) {
  const uiHtml = collectUiHtml()
  const b64 = btoa(unescape(encodeURIComponent(code)))

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <base href="${location.href}" />
  <link rel="stylesheet" href="/styles/example.css" />
  <link rel="stylesheet" href="/styles/practice.css" />
  <link rel="stylesheet" href="./style.css" />
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #12141a; }
    canvas { display: block; }
    .back, .lesson-workspace, .hud, .ui-for-preview { display: none !important; }
  </style>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/"
    }
  }
  </script>
</head>
<body>
  ${uiHtml}
  <script type="module">
    const kickResize = () => window.dispatchEvent(new Event('resize'))
    new ResizeObserver(() => kickResize()).observe(document.documentElement)
    window.addEventListener('error', (e) => {
      parent.postMessage({ type: 'lesson-error', message: e.message }, '*')
    })
    window.addEventListener('unhandledrejection', (e) => {
      parent.postMessage({ type: 'lesson-error', message: String(e.reason?.message || e.reason || e) }, '*')
    })
    parent.postMessage({ type: 'lesson-running' }, '*')
    try {
      const code = decodeURIComponent(escape(atob(${JSON.stringify(b64)})))
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }))
      await import(url)
      requestAnimationFrame(() => {
        kickResize()
        requestAnimationFrame(kickResize)
      })
      parent.postMessage({ type: 'lesson-ok' }, '*')
    } catch (err) {
      parent.postMessage({ type: 'lesson-error', message: err?.message || String(err) }, '*')
    }
  </script>
</body>
</html>`
}

function setStatus(text, kind = '') {
  if (!statusEl) return
  statusEl.textContent = text
  statusEl.dataset.kind = kind
}

function runCode(code) {
  if (!previewFrame || !stageHost) return
  setStatus('运行中…', 'pending')
  const safeCode = normalizeImports(code)
  const next = document.createElement('iframe')
  next.id = 'live-preview'
  next.title = '案例实时预览'
  next.className = 'live-preview'
  next.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock')
  previewFrame.replaceWith(next)
  previewFrame = next
  previewFrame.srcdoc = buildSrcdoc(safeCode)
}

function setupPreviewMessaging() {
  window.addEventListener('message', (event) => {
    const data = event.data
    if (!data || typeof data !== 'object') return
    if (data.type === 'lesson-ok') setStatus('运行成功。改代码后点「运行」可重载。', 'ok')
    if (data.type === 'lesson-running') setStatus('运行中…', 'pending')
    if (data.type === 'lesson-error') setStatus(`运行出错：${data.message}`, 'error')
  })
}

function loadSource(lessonId) {
  const text = getRawSource(lessonId)
  if (typeof text !== 'string') {
    return Promise.reject(new Error(`找不到原始源码：examples/${lessonId}/main.js`))
  }
  return Promise.resolve(text)
}

function buildShell(l) {
  document.body.classList.add('has-lesson-shell', 'has-live-preview')
  hideParentUi()

  const prev = l.prev ? LESSON_BY_ID[l.prev] : null
  const next = l.next ? LESSON_BY_ID[l.next] : null

  const root = document.createElement('div')
  root.className = 'lesson-workspace'
  root.innerHTML = `
    <header class="ws-top">
      <a class="ws-brand" href="/" id="wsHome">
        <span class="ws-brand-mark" aria-hidden="true"></span>
        <span>三维课</span>
      </a>
      <div class="ws-title-block">
        <p class="ws-kicker">${stageLabel(l)} · ${l.index}</p>
        <h1 class="ws-title">${l.title}</h1>
        <p class="ws-summary">${l.summary}</p>
      </div>
      <div class="ws-actions">
        <button type="button" class="ws-btn ws-btn-primary" id="runBtnTop">运行</button>
        ${
          prev
            ? `<a class="ws-btn ws-btn-ghost ws-nav-prev" href="${prev.href}">上一课</a>`
            : `<span class="ws-btn ws-btn-ghost ws-nav-prev is-disabled">上一课</span>`
        }
        ${
          next
            ? `<a class="ws-btn ws-btn-ghost ws-nav-next" href="${next.href}">下一课</a>`
            : `<span class="ws-btn ws-btn-ghost ws-nav-next is-disabled">下一课</span>`
        }
      </div>
    </header>

    <div class="ws-main">
      <aside class="ws-side" aria-label="课程概览与说明">
        <div class="ws-tabs" role="tablist">
          <button type="button" class="ws-tab is-active" data-tab="concept" role="tab" aria-selected="true">概念说明</button>
          <button type="button" class="ws-tab" data-tab="code" role="tab" aria-selected="false">完整代码</button>
        </div>

        <div class="ws-panel is-active" data-panel="concept">
          <p class="ws-why">${l.why}</p>
          <h2>核心概念</h2>
          <ul class="ws-list">
            ${l.concepts.map((c) => `<li>${c}</li>`).join('')}
          </ul>
          <h2>建议动手</h2>
          <ol class="ws-list ws-list-ordered">
            ${l.try.map((t) => `<li>${t}</li>`).join('')}
          </ol>
          <p class="ws-tip">切到「完整代码」可改 <code>main.js</code>，点「运行」立即刷新预览。</p>
        </div>

        <div class="ws-panel" data-panel="code">
          <div class="code-toolbar">
            <span class="code-filename">main.js</span>
            <div class="code-toolbar-actions">
              <button type="button" class="ws-btn ws-btn-ghost" id="resetBtn">重置</button>
              <button type="button" class="ws-btn ws-btn-primary" id="runBtn">运行</button>
            </div>
          </div>
          <div class="code-editor-host" id="codeEditorHost" role="textbox" aria-label="案例源码编辑器"></div>
          <p class="code-status" id="codeStatus" data-kind="">加载源码中…</p>
        </div>
      </aside>

      <section class="ws-stage-wrap" aria-label="实时预览">
        <div class="ws-stage-head">
          <span class="ws-stage-label">预览</span>
          <span class="ws-stage-hint">场景在此运行 · 可拖拽交互</span>
        </div>
        <div class="ws-stage" id="stageHost"></div>
      </section>
    </div>

    <footer class="ws-foot">
      ${
        prev
          ? `<a class="ws-foot-link" href="${prev.href}"><span>上一课</span><strong>${prev.index} ${prev.title}</strong></a>`
          : `<span class="ws-foot-link is-disabled"><span>上一课</span><strong>已是第一课</strong></span>`
      }
      <a class="ws-foot-home" href="/" id="wsHomeFoot">返回课程目录</a>
      ${
        next
          ? `<a class="ws-foot-link ws-foot-next" href="${next.href}"><span>下一课</span><strong>${next.index} ${next.title}</strong></a>`
          : `<span class="ws-foot-link is-disabled ws-foot-next"><span>下一课</span><strong>全部完成</strong></span>`
      }
    </footer>
  `
  document.body.appendChild(root)

  document.getElementById('wsHome')?.addEventListener('click', saveHomeScrollBeforeLeave)
  document.getElementById('wsHomeFoot')?.addEventListener('click', saveHomeScrollBeforeLeave)
  root.querySelectorAll('a[href*="/examples/"]').forEach((a) => {
    a.addEventListener('click', saveHomeScrollBeforeLeave)
  })

  stageHost = document.getElementById('stageHost')
  previewFrame = document.createElement('iframe')
  previewFrame.id = 'live-preview'
  previewFrame.title = '案例实时预览'
  previewFrame.className = 'live-preview'
  previewFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock')
  stageHost.appendChild(previewFrame)

  statusEl = document.getElementById('codeStatus')
  const editorHost = document.getElementById('codeEditorHost')

  const doRun = () => {
    const code = codeEditor?.getValue() ?? originalCode
    runCode(code)
  }

  async function ensureEditor() {
    if (codeEditor) return codeEditor
    const { createCodeEditor } = await import('./code-editor.js')
    codeEditor = createCodeEditor(editorHost, {
      doc: originalCode || '',
      onRun: () => doRun(),
    })
    return codeEditor
  }

  const tabs = root.querySelectorAll('.ws-tab')
  const panels = root.querySelectorAll('.ws-panel')
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab
      tabs.forEach((t) => {
        const on = t === tab
        t.classList.toggle('is-active', on)
        t.setAttribute('aria-selected', on ? 'true' : 'false')
      })
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === name))
      if (name === 'code') {
        ensureEditor().then(() => {
          requestAnimationFrame(() => codeEditor?.view.requestMeasure())
        })
      }
    })
  })

  document.getElementById('runBtn')?.addEventListener('click', doRun)
  document.getElementById('runBtnTop')?.addEventListener('click', doRun)
  document.getElementById('resetBtn')?.addEventListener('click', async () => {
    await ensureEditor()
    codeEditor.setValue(originalCode)
    setStatus('已恢复原始代码，点击「运行」重载。', '')
    codeEditor.focus()
  })

  setupPreviewMessaging()

  loadSource(l.id)
    .then(async (text) => {
      originalCode = text
      await ensureEditor()
      codeEditor.setValue(text)
      setStatus('源码已加载。可修改后点「运行」（Ctrl/⌘ + Enter）。', 'ok')
      runCode(text)
      // 默认展示概念；代码编辑器已就绪，切 tab 即见高亮
    })
    .catch((err) => {
      setStatus(err.message || String(err), 'error')
    })
}

if (lesson) {
  markVisited(lesson.id)
  document.title = `${lesson.index} · ${lesson.title} · 三维课`
  buildShell(lesson)
}
