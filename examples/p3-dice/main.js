/**
 * ============================================================
 * P3 · 3D 骰子 —— 旋转插值 + 缓动 + 「朝上点数」映射
 * ============================================================
 *
 * 难点不在「让骰子转」，而在：
 *   转完之后，哪一面朝上？点数对不对？
 *
 * 做法：
 *   1. 给立方体 6 个面分别贴 1～6 点的 Canvas 纹理
 *   2. 事先约定：最终 rotation 取某组值时，+Y 朝上对应点数 N
 *   3. 动画时从当前角度插值到「目标角度 + 多圈空翻」
 *   4. 用缓动函数（easeOut）让结尾减速，更像真实骰子
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(3.5, 3, 4.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0.5, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const light = new THREE.DirectionalLight(0xffffff, 1.2)
light.position.set(4, 8, 5)
light.castShadow = true
scene.add(light)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

/**
 * 用浏览器 Canvas 2D API「画」出骰子点数，再转成 Three.js 纹理。
 * 这样不需要准备 6 张图片文件，对初学者非常友好。
 */
function faceTexture(n) {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  // 白底
  ctx.fillStyle = '#f4f6fb'
  ctx.fillRect(0, 0, size, size)
  // 边框
  ctx.strokeStyle = '#c5cddf'
  ctx.lineWidth = 8
  ctx.strokeRect(4, 4, size - 8, size - 8)

  // 每个点数对应的圆点相对坐标（0~1）
  const dots = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [
      [0.28, 0.25], [0.72, 0.25],
      [0.28, 0.5], [0.72, 0.5],
      [0.28, 0.75], [0.72, 0.75],
    ],
  }

  ctx.fillStyle = '#1a2235'
  for (const [x, y] of dots[n]) {
    ctx.beginPath()
    ctx.arc(x * size, y * size, size * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(c)
  // r152+ 彩色贴图建议声明为 sRGB，颜色才正确
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * BoxGeometry 六个面的材质顺序固定为：
 *   0:+X  1:-X  2:+Y  3:-Y  4:+Z  5:-Z
 *
 * 我们约定：「结果点数」= 最终朝上（世界 +Y）的那一面。
 * faceUp[n] 保存：当 n 朝上时，骰子 rotation.x / rotation.z 应取的值。
 */
const faceUp = {
  1: { x: 0, z: 0 },
  2: { x: -Math.PI / 2, z: 0 },
  3: { x: 0, z: Math.PI / 2 },
  4: { x: 0, z: -Math.PI / 2 },
  5: { x: Math.PI / 2, z: 0 },
  6: { x: Math.PI, z: 0 },
}

const materials = [
  new THREE.MeshStandardMaterial({ map: faceTexture(3), roughness: 0.45 }), // +X
  new THREE.MeshStandardMaterial({ map: faceTexture(4), roughness: 0.45 }), // -X
  new THREE.MeshStandardMaterial({ map: faceTexture(1), roughness: 0.45 }), // +Y
  new THREE.MeshStandardMaterial({ map: faceTexture(6), roughness: 0.45 }), // -Y
  new THREE.MeshStandardMaterial({ map: faceTexture(2), roughness: 0.45 }), // +Z
  new THREE.MeshStandardMaterial({ map: faceTexture(5), roughness: 0.45 }), // -Z
]

const dice = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), materials)
dice.position.y = 0.7
dice.castShadow = true
scene.add(dice)

const resultEl = document.getElementById('result')
const rollBtn = document.getElementById('rollBtn')

/** 正在播放的动画状态；null 表示空闲可再掷 */
let anim = null

/** 缓出三次方：开始快、结束慢，适合「停下」的手感 */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

function roll() {
  if (anim) return // 动画中忽略重复点击

  // 随机 1～6
  const value = 1 + Math.floor(Math.random() * 6)
  resultEl.textContent = '滚动中…'
  rollBtn.disabled = true

  // 额外空翻几圈，看起来更「掷」而不是「瞬间翻面」
  const spins = 4 + Math.floor(Math.random() * 3)
  const target = faceUp[value]

  const startX = dice.rotation.x
  const startZ = dice.rotation.z
  // 终点 = 目标朝向 + 整数圈（2π 的倍数），视觉上多转几圈
  const endX = target.x + spins * Math.PI * 2
  const endZ = target.z + spins * Math.PI * 2
  const startY = dice.position.y
  const duration = 1400 // 毫秒
  const t0 = performance.now()

  anim = { value, startX, startZ, endX, endZ, startY, duration, t0 }
}

rollBtn.addEventListener('click', roll)

function animate(now) {
  if (anim) {
    // t: 0 → 1 的进度
    const t = Math.min(1, (now - anim.t0) / anim.duration)
    const e = easeOutCubic(t)

    // 线性插值公式：start + (end - start) * e
    dice.rotation.x = anim.startX + (anim.endX - anim.startX) * e
    dice.rotation.z = anim.startZ + (anim.endZ - anim.startZ) * e
    // 用 sin(πt) 做抛物线轻跳：中间最高，两端为 0
    dice.position.y = anim.startY + Math.sin(t * Math.PI) * 1.2

    if (t >= 1) {
      // 收敛到精确目标角，避免浮点误差导致「差一点没对准」
      dice.rotation.x = faceUp[anim.value].x
      dice.rotation.z = faceUp[anim.value].z
      dice.position.y = anim.startY
      resultEl.textContent = `点数：${anim.value}`
      rollBtn.disabled = false
      anim = null
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 改 duration / spins，感受手感差异
 * 2. 换成 easeOutBack，做出「回弹」效果
 * 3. 同时掷两颗骰子，显示点数之和
 */
