/**
 * ============================================================
 * P2 · 太阳系（简化版）—— 父子变换的经典课
 * ============================================================
 *
 * 核心思想（一定要懂）：
 *   想让行星「公转」，不要每帧自己算 x=cos、z=sin（当然可以），
 *   更优雅的方式是：
 *
 *     pivot（空物体，在太阳位置）
 *       └── planet（放在 pivot 的右边，比如 x = 轨道半径）
 *
 *     每帧只转 pivot.rotation.y
 *     → 子物体会跟着绕 pivot 原点转圈 = 公转！
 *
 *   行星自转则转 planet.rotation.y 自己。
 *
 * 另外会学到：
 *   - EllipseCurve 画轨道线
 *   - Raycaster 鼠标点选物体
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050910)

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200,
)
camera.position.set(0, 12, 18) // 从斜上方俯视太阳系

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.15))
// 太阳本身用 PointLight：照亮周围行星
const sunLight = new THREE.PointLight(0xfff2c9, 3.5, 80)
scene.add(sunLight)

// ——— 背景星点（简化版粒子）———
{
  const count = 800
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // 在一个大立方体范围内随机撒点
    positions[i * 3] = (Math.random() - 0.5) * 80
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        sizeAttenuation: true,
      }),
    ),
  )
}

// ——— 太阳 ———
// 太阳用 MeshBasicMaterial：自己发光，不依赖灯光
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc857 }),
)
sun.name = '太阳'
sun.userData.label = '太阳 Sun' // userData：你可以挂任何自定义数据
scene.add(sun)

// 半透明大一点的球 = 廉价「光晕」效果
const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.22,
  }),
)
sun.add(sunGlow) // 加到太阳下面，会跟着太阳动

/**
 * 行星配置表（数据驱动：改数字就能调关卡，不用改逻辑）
 * radius 行星半径 | orbit 轨道半径 | speed 公转速度 | spin 自转速度
 */
const PLANETS = [
  { name: '水星 Mercury', color: 0xb0b0b0, radius: 0.22, orbit: 3.2, speed: 1.6, spin: 2.2 },
  { name: '金星 Venus', color: 0xe3c27a, radius: 0.35, orbit: 4.5, speed: 1.15, spin: 1.4 },
  { name: '地球 Earth', color: 0x4f8fd8, radius: 0.38, orbit: 6.0, speed: 0.85, spin: 2.8 },
  { name: '火星 Mars', color: 0xd96b4c, radius: 0.28, orbit: 7.6, speed: 0.65, spin: 2.4 },
]

const orbits = [] // 保存 { pivot, mesh, speed, spin } 方便动画更新
const pickables = [sun] // Raycaster 可点击列表

/** 用椭圆曲线采样一圈点，再连成 Line，当作轨道辅助线 */
function createOrbitRing(radius) {
  const curve = new THREE.EllipseCurve(
    0, 0,           // 圆心
    radius, radius, // x半径、y半径（正圆）
    0, Math.PI * 2, // 起止角度
    false, 0,
  )
  // getPoints 得到的是 Vector2，要转成 3D 的 Vector3（y=0 的水平面）
  const points = curve.getPoints(128).map((p) => new THREE.Vector3(p.x, 0, p.y))
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({
      color: 0x2a3a55,
      transparent: true,
      opacity: 0.7,
    }),
  )
}

for (const cfg of PLANETS) {
  // pivot：空的 Object3D，只负责「转」
  const pivot = new THREE.Object3D()
  scene.add(pivot)

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(cfg.radius, 24, 24),
    new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: 0.7,
      metalness: 0.15,
    }),
  )
  // 关键：行星放在 pivot 本地坐标的 +X 上
  // 之后转 pivot，行星就会绕原点画圆
  mesh.position.x = cfg.orbit
  mesh.name = cfg.name
  mesh.userData.label = cfg.name
  pivot.add(mesh)

  scene.add(createOrbitRing(cfg.orbit))

  orbits.push({ pivot, mesh, speed: cfg.speed, spin: cfg.spin })
  pickables.push(mesh)
}

// 地球再加月球：演示「多层父子」
// moonPivot 加在地球上 → 地球公转时月球跟着走
// 再转 moonPivot → 月球绕地球转
const earthEntry = orbits.find((o) => o.mesh.userData.label.startsWith('地球'))
if (earthEntry) {
  const moonPivot = new THREE.Object3D()
  earthEntry.mesh.add(moonPivot)

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.85 }),
  )
  moon.position.x = 0.7 // 相对地球的距离
  moon.userData.label = '月球 Moon'
  moonPivot.add(moon)

  pickables.push(moon)
  earthEntry.moonPivot = moonPivot
}

// ======================== 鼠标点击拾取 ========================
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2() // NDC 坐标：x/y 都在 -1 ~ +1
const nameEl = document.getElementById('planetName')

function onPointerDown(event) {
  // 把屏幕像素坐标 → 标准化设备坐标（NDC）
  // 左上角大约 (-1, +1)，右下角大约 (+1, -1)，中心 (0, 0)
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 从相机射出一条射线
  raycaster.setFromCamera(pointer, camera)
  // 和可点击物体列表求交（false = 不递归检查子物体）
  const hits = raycaster.intersectObjects(pickables, false)

  if (hits.length && nameEl) {
    // hits 按距离从近到远排序，取第一个就是点中的
    nameEl.textContent = hits[0].object.userData.label || hits[0].object.name
  }
}

window.addEventListener('pointerdown', onPointerDown)

let paused = false
document.getElementById('pause')?.addEventListener('change', (e) => {
  paused = e.target.checked
})

function animate(time) {
  const t = time * 0.001

  sun.rotation.y = t * 0.2

  if (!paused) {
    for (const o of orbits) {
      o.pivot.rotation.y = t * o.speed // 公转
      o.mesh.rotation.y = t * o.spin   // 自转
      if (o.moonPivot) o.moonPivot.rotation.y = t * 3.5 // 月转
    }
  }

  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. 在 PLANETS 里加一颗「木星」
 * 2. 给轨道加一点倾斜：pivot.rotation.x = 0.1
 * 3. 点击后让相机缓动飞到行星附近（进阶）
 */
