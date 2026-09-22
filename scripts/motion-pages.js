/**
 * 课时 / 指南：不再做整页 from(autoAlpha:0) 入场。
 * 异步加载后再藏内容会造成「先闪一下再淡入」。
 * 交互动效集中在首页 motion-home；此处仅保留空实现，避免旧调用报错。
 */

export function animateLessonShell(_root) {
  // no-op：课时页保持即时可见，避免切换闪烁
}

export function animateGuidePage() {
  // no-op：指南页保持即时可见
}
