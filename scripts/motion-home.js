/**
 * 首页交互层 —— 按 GSAP skills：transform / autoAlpha / timeline / ScrollTrigger / quickTo
 * 目标：存在感强、反馈明确，但不在整页切换时用 autoAlpha 藏内容（防闪烁）
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin)

gsap.defaults({ ease: 'power2.out', duration: 0.55 })

const INTRO_KEY = 'three-course-home-intro'

/**
 * @param {{ restoringScroll?: boolean }} opts
 */
export function initHomeMotion({ restoringScroll = false } = {}) {
  const mm = gsap.matchMedia()

  mm.add('(prefers-reduced-motion: reduce)', () => {
    document.documentElement.classList.remove('motion-pending')
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.set(el, { clearProps: 'all' })
      el.classList.add('is-in')
    })
  })

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const cleanups = []

    const playIntro =
      !restoringScroll &&
      !sessionStorage.getItem(INTRO_KEY) &&
      document.documentElement.classList.contains('motion-pending')

    if (playIntro) {
      cleanups.push(runHeroIntro())
    } else {
      document.documentElement.classList.remove('motion-pending')
    }

    cleanups.push(setupScrollProgress())
    cleanups.push(setupTopbarScroll())
    cleanups.push(setupSectionReveals(restoringScroll))
    cleanups.push(setupMagneticCards())
    cleanups.push(setupButtonFeedback())
    cleanups.push(setupChipFeedback())
    cleanups.push(setupHeroStageLoop())
    cleanups.push(setupNavSpy())

    return () => {
      cleanups.forEach((fn) => fn?.())
      ScrollTrigger.getAll().forEach((st) => st.kill())
    }
  })

  return () => mm.revert()
}

function finishBoot() {
  document.documentElement.classList.remove('motion-pending')
}

/** 首次 Hero 入场：CSS 已预藏 */
function runHeroIntro() {
  const heroBits = gsap.utils.toArray([
    '.hero-kicker',
    '.brand-line',
    '.hero-sub',
    '.hero-lead',
    '.hero-actions > *',
    '.hero-meta:not([hidden])',
  ])

  gsap.set('.topbar', { autoAlpha: 0, y: -24 })
  gsap.set(heroBits, { autoAlpha: 0, y: 36 })
  gsap.set('.hero-stage', { autoAlpha: 0, x: 40, scale: 0.94 })
  finishBoot()

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    onComplete: () => sessionStorage.setItem(INTRO_KEY, '1'),
  })

  tl.to('.topbar', { autoAlpha: 1, y: 0, duration: 0.55, clearProps: 'transform' })
    .to(
      heroBits,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.75,
        stagger: 0.08,
        clearProps: 'transform',
      },
      '-=0.25',
    )
    .to(
      '.hero-stage',
      {
        autoAlpha: 1,
        x: 0,
        scale: 1,
        duration: 0.9,
        ease: 'power2.out',
        clearProps: 'transform',
      },
      '-=0.55',
    )
    .fromTo(
      '.brand-mark',
      { rotation: -28, scale: 0.6 },
      { rotation: 12, scale: 1, duration: 0.6, ease: 'back.out(1.8)' },
      '-=0.7',
    )

  return () => tl.kill()
}

/** 顶部阅读进度条 */
function setupScrollProgress() {
  let bar = document.querySelector('.scroll-progress-bar')
  if (!bar) {
    const wrap = document.createElement('div')
    wrap.className = 'scroll-progress'
    wrap.setAttribute('aria-hidden', 'true')
    bar = document.createElement('div')
    bar.className = 'scroll-progress-bar'
    wrap.appendChild(bar)
    document.body.prepend(wrap)
  }

  gsap.set(bar, { scaleX: 0, transformOrigin: 'left center' })

  const st = ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      gsap.set(bar, { scaleX: self.progress })
    },
  })

  return () => st.kill()
}

/** 滚动后顶栏收紧 + 阴影感 */
function setupTopbarScroll() {
  const topbar = document.querySelector('.topbar')
  if (!topbar) return () => {}

  const st = ScrollTrigger.create({
    start: 40,
    onUpdate: (self) => {
      topbar.classList.toggle('is-scrolled', self.scroll() > 40)
    },
  })

  return () => {
    st.kill()
    topbar.classList.remove('is-scrolled')
  }
}

/** 分区滚动入场：更大幅度 + 子元素 stagger */
function setupSectionReveals(restoringScroll) {
  const reveals = gsap.utils.toArray('[data-reveal]')
  if (!reveals.length) return () => {}

  if (restoringScroll) {
    gsap.set(reveals, { clearProps: 'all' })
    reveals.forEach((el) => el.classList.add('is-in'))
    return () => {}
  }

  const above = []
  const below = []
  reveals.forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight * 0.9) above.push(el)
    else below.push(el)
  })

  gsap.set(above, { clearProps: 'all' })
  above.forEach((el) => el.classList.add('is-in'))

  if (!below.length) return () => {}

  gsap.set(below, { autoAlpha: 0, y: 48 })

  const batches = ScrollTrigger.batch(below, {
    start: 'top 88%',
    once: true,
    interval: 0.08,
    batchMax: 5,
    onEnter: (elements) => {
      gsap.to(elements, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.09,
        ease: 'power3.out',
        overwrite: 'auto',
        clearProps: 'transform',
        onStart: () => {
          elements.forEach((parent) => {
            const kids = parent.querySelectorAll(
              '.how-card, .chapter, .bento-item, .concept-card, .path-step',
            )
            if (!kids.length) return
            gsap.from(kids, {
              y: 22,
              autoAlpha: 0,
              duration: 0.5,
              stagger: 0.06,
              ease: 'power2.out',
              clearProps: 'transform',
            })
          })
        },
        onComplete: () => elements.forEach((el) => el.classList.add('is-in')),
      })
    },
  })

  // section eyebrow 轻微横向滑入
  gsap.utils.toArray('.section-head .eyebrow').forEach((el) => {
    gsap.from(el, {
      x: -16,
      autoAlpha: 0,
      duration: 0.5,
      scrollTrigger: {
        trigger: el.closest('.section') || el,
        start: 'top 85%',
        once: true,
      },
    })
  })

  return () => batches.forEach((st) => st.kill())
}

/** 卡片磁吸：指针靠近时跟手微移 + 抬起（盖过 CSS hover transform） */
function setupMagneticCards() {
  const cards = gsap.utils.toArray('.chapter, .bento-item, .how-card, .concept-card')
  const cleanups = []

  cards.forEach((card) => {
    card.classList.add('has-magnetic')
    const xTo = gsap.quickTo(card, 'x', { duration: 0.35, ease: 'power3.out' })
    const yTo = gsap.quickTo(card, 'y', { duration: 0.35, ease: 'power3.out' })
    const sTo = gsap.quickTo(card, 'scale', { duration: 0.35, ease: 'power3.out' })

    const onMove = (e) => {
      const r = card.getBoundingClientRect()
      const dx = e.clientX - (r.left + r.width / 2)
      const dy = e.clientY - (r.top + r.height / 2)
      xTo(gsap.utils.clamp(-10, 10, dx * 0.08))
      yTo(gsap.utils.clamp(-10, 10, dy * 0.08 - 4))
      sTo(1.015)
    }
    const onEnter = () => sTo(1.015)
    const onLeave = () => {
      xTo(0)
      yTo(0)
      sTo(1)
    }

    card.addEventListener('pointermove', onMove)
    card.addEventListener('pointerenter', onEnter)
    card.addEventListener('pointerleave', onLeave)
    cleanups.push(() => {
      card.removeEventListener('pointermove', onMove)
      card.removeEventListener('pointerenter', onEnter)
      card.removeEventListener('pointerleave', onLeave)
      card.classList.remove('has-magnetic')
      gsap.set(card, { clearProps: 'transform' })
    })
  })

  return () => cleanups.forEach((fn) => fn())
}

/** 主按钮：悬停箭头弹一下，按下缩放 */
function setupButtonFeedback() {
  const btns = gsap.utils.toArray('.btn-primary, .topbar-cta, .chapter-cta')
  const cleanups = []

  btns.forEach((btn) => {
    const arrow = btn.querySelector('.btn-arrow')
    const onEnter = () => {
      gsap.to(btn, { y: -3, duration: 0.25, overwrite: 'auto' })
      if (arrow) {
        gsap.fromTo(
          arrow,
          { x: 0 },
          { x: 5, duration: 0.35, ease: 'power2.out', overwrite: 'auto' },
        )
      }
    }
    const onLeave = () => {
      gsap.to(btn, { y: 0, duration: 0.3, overwrite: 'auto', clearProps: 'transform' })
      if (arrow) gsap.to(arrow, { x: 0, duration: 0.25, overwrite: 'auto' })
    }
    const onDown = () => gsap.to(btn, { scale: 0.97, duration: 0.1, overwrite: 'auto' })
    const onUp = () => gsap.to(btn, { scale: 1, duration: 0.2, overwrite: 'auto' })

    btn.addEventListener('pointerenter', onEnter)
    btn.addEventListener('pointerleave', onLeave)
    btn.addEventListener('pointerdown', onDown)
    btn.addEventListener('pointerup', onUp)
    cleanups.push(() => {
      btn.removeEventListener('pointerenter', onEnter)
      btn.removeEventListener('pointerleave', onLeave)
      btn.removeEventListener('pointerdown', onDown)
      btn.removeEventListener('pointerup', onUp)
    })
  })

  return () => cleanups.forEach((fn) => fn())
}

/** 筛选芯片点击弹一下 */
function setupChipFeedback() {
  const chips = gsap.utils.toArray('.chip[data-filter]')
  const cleanups = []

  chips.forEach((chip) => {
    const onClick = () => {
      gsap.fromTo(
        chip,
        { scale: 0.92 },
        { scale: 1, duration: 0.35, ease: 'back.out(2.2)', overwrite: 'auto' },
      )
    }
    chip.addEventListener('click', onClick)
    cleanups.push(() => chip.removeEventListener('click', onClick))
  })

  return () => cleanups.forEach((fn) => fn())
}

/** Hero 舞台持续动效（比纯 CSS 更可控） */
function setupHeroStageLoop() {
  const cube = document.querySelector('.wire-cube')
  const orbA = document.querySelector('.orb-a')
  const orbB = document.querySelector('.orb-b')
  if (!cube && !orbA) return () => {}

  const tweens = []
  if (cube) {
    document.documentElement.classList.add('gsap-stage')
    tweens.push(
      gsap.to(cube, {
        rotationY: 360,
        rotationX: 360,
        duration: 14,
        repeat: -1,
        ease: 'none',
        transformOrigin: '50% 50%',
      }),
    )
  }
  if (orbA) {
    tweens.push(
      gsap.to(orbA, {
        x: 14,
        y: -18,
        scale: 1.08,
        duration: 3.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      }),
    )
  }
  if (orbB) {
    tweens.push(
      gsap.to(orbB, {
        x: -12,
        y: 14,
        scale: 1.06,
        duration: 4.1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      }),
    )
  }

  return () => {
    tweens.forEach((t) => t.kill())
    document.documentElement.classList.remove('gsap-stage')
    gsap.set([cube, orbA, orbB].filter(Boolean), { clearProps: 'transform' })
  }
}

/** 导航高亮当前区块 */
function setupNavSpy() {
  const links = gsap.utils.toArray('.nav a[href^="#"]')
  if (!links.length) return () => {}

  const map = links
    .map((a) => {
      const id = a.getAttribute('href')
      const section = id ? document.querySelector(id) : null
      return section ? { a, section } : null
    })
    .filter(Boolean)

  const triggers = map.map(({ a, section }) =>
    ScrollTrigger.create({
      trigger: section,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (self.isActive) {
          links.forEach((l) => l.classList.toggle('is-active', l === a))
        }
      },
    }),
  )

  return () => triggers.forEach((st) => st.kill())
}

/**
 * 筛选列表动画
 * @param {NodeListOf<Element>|Element[]} lessons
 * @param {(el: Element) => boolean} shouldShow
 */
export function animateFilter(lessons, shouldShow) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const list = [...lessons]
  const showList = list.filter(shouldShow)
  const hideList = list.filter((el) => !shouldShow(el))

  hideList.forEach((el) => {
    if (reduce) {
      el.classList.add('is-hidden')
      return
    }
    gsap.to(el, {
      autoAlpha: 0,
      y: 12,
      scale: 0.96,
      duration: 0.2,
      overwrite: 'auto',
      onComplete: () => {
        el.classList.add('is-hidden')
        gsap.set(el, { clearProps: 'transform,opacity,visibility' })
      },
    })
  })

  showList.forEach((el, i) => {
    el.classList.remove('is-hidden')
    if (reduce) {
      gsap.set(el, { clearProps: 'all' })
      return
    }
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 28, scale: 0.94 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.45,
        delay: Math.min(i, 10) * 0.04,
        ease: 'power3.out',
        overwrite: 'auto',
        clearProps: 'transform',
      },
    )
  })

  requestAnimationFrame(() => ScrollTrigger.refresh())
}

export function setupSmoothAnchors(root = document) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  root.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      if (!id || id === '#') return
      const target = document.querySelector(id)
      if (!target) return
      e.preventDefault()
      if (reduce) {
        target.scrollIntoView()
        return
      }
      gsap.to(window, {
        duration: 0.8,
        scrollTo: { y: target, offsetY: 72 },
        ease: 'power3.inOut',
      })
    })
  })
}
