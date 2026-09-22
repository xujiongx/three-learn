/**
 * ============================================================
 * P5 · 第一人称画廊 —— WASD 走路 + 鼠标视角 + 撞墙
 * ============================================================
 *
 * 和 OrbitControls 不同：
 *   OrbitControls = 相机绕着目标转（第三人称观察）
 *   PointerLockControls = 鼠标锁定后控制「朝向」，像 FPS 游戏
 *
 * 流程：
 *   1. 用户点击页面 → controls.lock() 锁定鼠标
 *   2. 键盘 WASD 改变速度，controls.moveForward / moveRight 移动
 *   3. 移动后检测是否撞墙（简单 AABB），撞了就退回
 *   4. 靠近画作时显示说明文字
 *
 * AABB = Axis-Aligned Bounding Box（轴对齐包围盒）
 *   用 minX/maxX/minZ/maxZ 描述一块矩形障碍，判断点是否在里面。
 */

import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x2a2433)
scene.fog = new THREE.Fog(0x2a2433, 12, 28)

// 第一人称常用较大 fov（更沉浸）
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 1.6, 6) // y=1.6 约等于人眼高度（米）

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
document.body.appendChild(renderer.domElement)

const controls = new PointerLockControls(camera, document.body)
const blocker = document.getElementById('blocker')
const caption = document.getElementById('caption')

// 浏览器安全策略：必须由用户手势触发才能锁定鼠标
blocker.addEventListener('click', () => {
  controls.lock()
})
controls.addEventListener('lock', () => {
  blocker.style.display = 'none'
})
controls.addEventListener('unlock', () => {
  blocker.style.display = 'flex'
})

// 展厅照明：环境光 + 顶灯 + 每幅画一盏射灯
scene.add(new THREE.AmbientLight(0xfff5eb, 0.45))
scene.add(new THREE.HemisphereLight(0xfff0e0, 0x4a3f55, 0.9))
const lamp = new THREE.PointLight(0xfff5e8, 2.4, 22, 1.4)
lamp.position.set(0, 3.2, 0)
scene.add(lamp)
const fill = new THREE.PointLight(0xdde8ff, 1.1, 16, 1.6)
fill.position.set(0, 2.4, 4)
scene.add(fill)

const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4256, roughness: 0.88, metalness: 0.05 })
const floorMat = new THREE.MeshStandardMaterial({ color: 0x5c5044, roughness: 0.8, metalness: 0.05 })

const roomW = 14
const roomD = 14
const roomH = 4

const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat)
floor.rotation.x = -Math.PI / 2
scene.add(floor)

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(roomW, roomD),
  new THREE.MeshStandardMaterial({ color: 0x3a3344, roughness: 1 }),
)
ceiling.rotation.x = Math.PI / 2
ceiling.position.y = roomH
scene.add(ceiling)

/** 碰撞盒列表：每项 { minX, maxX, minZ, maxZ } */
const colliders = []

/**
 * 创建一面墙，同时登记碰撞盒。
 * 碰撞盒比视觉墙壁稍厚一点（±0.25），避免视角穿模。
 */
function addWall(w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
  mesh.position.set(x, y, z)
  scene.add(mesh)
  colliders.push({
    minX: x - w / 2 - 0.25,
    maxX: x + w / 2 + 0.25,
    minZ: z - d / 2 - 0.25,
    maxZ: z + d / 2 + 0.25,
  })
}

// 四面墙
addWall(roomW, roomH, 0.3, 0, roomH / 2, -roomD / 2)
addWall(roomW, roomH, 0.3, 0, roomH / 2, roomD / 2)
addWall(0.3, roomH, roomD, -roomW / 2, roomH / 2, 0)
addWall(0.3, roomH, roomD, roomW / 2, roomH / 2, 0)

/** 用 Canvas 程序化生成「画作」贴图 */
function paintingTexture(title, color) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 384
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 512, 384)
  g.addColorStop(0, color)
  g.addColorStop(1, '#1a1520')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 512, 384)
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`
    ctx.beginPath()
    ctx.arc(Math.random() * 512, Math.random() * 384, Math.random() * 40, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 36px sans-serif'
  ctx.fillText(title, 28, 340)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const arts = [
  { title: '潮汐', color: '#3dd6c6', desc: '《潮汐》— 程序化抽象，青绿主调', x: 0, z: -roomD / 2 + 0.2, ry: 0 },
  { title: '雾港', color: '#6ea8ff', desc: '《雾港》— 冷色层叠与颗粒', x: -roomW / 2 + 0.2, z: 0, ry: Math.PI / 2 },
  { title: '余烬', color: '#ff8f6b', desc: '《余烬》— 暖色块面构成', x: roomW / 2 - 0.2, z: 0, ry: -Math.PI / 2 },
]

const paintings = []
for (const a of arts) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.8),
    new THREE.MeshStandardMaterial({
      map: paintingTexture(a.title, a.color),
      roughness: 0.55,
      metalness: 0.05,
      emissive: new THREE.Color(a.color),
      emissiveIntensity: 0.12,
    }),
  )
  mesh.position.set(a.x, 1.8, a.z)
  mesh.rotation.y = a.ry
  mesh.userData.desc = a.desc
  scene.add(mesh)
  paintings.push(mesh)

  // 射灯照向画作，保证画面清晰
  const spot = new THREE.SpotLight(0xfff4e8, 3.2, 12, Math.PI / 5, 0.45, 1)
  const ox = a.ry === Math.PI / 2 ? 1.8 : a.ry === -Math.PI / 2 ? -1.8 : 0
  const oz = a.ry === 0 ? 1.8 : 0
  spot.position.set(a.x + ox, 3.4, a.z + oz)
  spot.target.position.copy(mesh.position)
  scene.add(spot)
  scene.add(spot.target)

  // 深色底框，让画作更像挂在墙上
  const frame = new THREE.Mesh(
    new THREE.PlaneGeometry(2.55, 1.95),
    new THREE.MeshStandardMaterial({ color: 0x2a2433 }),
  )
  frame.position.set(a.x, 1.8, a.z)
  if (a.ry === 0) frame.position.z += 0.02
  if (a.ry === Math.PI / 2) frame.position.x += 0.02
  if (a.ry === -Math.PI / 2) frame.position.x -= 0.02
  frame.rotation.y = a.ry
  scene.add(frame)
}

// 键盘状态表：按下 true，松开 false
const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false }
addEventListener('keydown', (e) => {
  if (e.code in keys) keys[e.code] = true
})
addEventListener('keyup', (e) => {
  if (e.code in keys) keys[e.code] = false
})

const velocity = new THREE.Vector3() // 当前速度
const direction = new THREE.Vector3() // 输入方向
let prev = performance.now()

/** 某个水平位置是否撞墙 */
function collides(x, z) {
  for (const b of colliders) {
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true
  }
  return false
}

function animate(now) {
  // dt = 两帧间隔（秒）。用 dt 乘速度，不同刷新率手感更一致
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (controls.isLocked) {
    // 简单阻尼：没有按键时速度逐渐衰减到 0
    velocity.x -= velocity.x * 8 * dt
    velocity.z -= velocity.z * 8 * dt

    // Number(true)=1, Number(false)=0，方便合成方向
    direction.z = Number(keys.KeyW) - Number(keys.KeyS)
    direction.x = Number(keys.KeyD) - Number(keys.KeyA)
    direction.normalize() // 斜走时速度不会变成 √2 倍

    if (keys.KeyW || keys.KeyS) velocity.z -= direction.z * 28 * dt
    if (keys.KeyA || keys.KeyD) velocity.x -= direction.x * 28 * dt

    // 先记下移动前位置，撞墙就还原
    const before = camera.position.clone()
    controls.moveRight(-velocity.x * dt)
    controls.moveForward(-velocity.z * dt)

    if (collides(camera.position.x, camera.position.z)) {
      camera.position.x = before.x
      camera.position.z = before.z
    }
    // 锁死身高，避免飞起来
    camera.position.y = 1.6

    // 找最近的画作：够近就显示说明
    let nearest = null
    let nearestDist = 3
    for (const p of paintings) {
      const d = camera.position.distanceTo(p.position)
      if (d < nearestDist) {
        nearestDist = d
        nearest = p
      }
    }
    caption.textContent = nearest ? nearest.userData.desc : ''
    caption.style.opacity = nearest ? '1' : '0'
  }

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
 * 1. 在房间中间加一根柱子（记得加 collider）
 * 2. 按空格跳跃（改 y，再加重力）
 * 3. 换成迷宫地图（二维数组生成墙）
 */
