/**
 * ============================================================
 * P2 · 太阳系（简化版）—— 父子变换的经典课
 * ============================================================
 *
 * 目标：用「空父物体旋转」实现公转，而不是每帧手算 cos/sin。
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
 *   - userData 挂自定义标签
 *   - 多层父子：地球 → moonPivot → 月球
 */

// ------------------------------------------------------------
// 1. 引入与三大件
// ------------------------------------------------------------
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050910)

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200, // far 要够大，才能看到远处「星点」
)
// 从斜上方俯视太阳系，比正侧面更容易看清轨道
camera.position.set(0, 12, 18)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 0, 0) // 绕太阳转视角

// ------------------------------------------------------------
// 2. 灯光 —— 环境微光 + 太阳点光
// ------------------------------------------------------------
// Ambient 很弱：太空里主要靠太阳照亮，但完全 0 会让背光面死黑难辨
scene.add(new THREE.AmbientLight(0xffffff, 0.15))
// PointLight：从一点向四周发光；把太阳放在原点时，行星自然被照到
const sunLight = new THREE.PointLight(0xfff2c9, 3.5, 80)
scene.add(sunLight)

// ------------------------------------------------------------
// 3. 背景星点（简化版粒子）
// ------------------------------------------------------------
// Points = BufferGeometry 里一堆顶点 + PointsMaterial 画成点精灵
{
  const count = 800
  const positions = new Float32Array(count * 3) // 每个点 xyz 共 3 个数
  for (let i = 0; i < count; i++) {
    // 在一个大立方体范围内随机撒点（不必真的做成球壳）
    positions[i * 3] = (Math.random() - 0.5) * 80
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80
  }
  const geo = new THREE.BufferGeometry()
  // itemSize = 3：每 3 个 float 组成一个顶点
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.08,
        sizeAttenuation: true, // 远小近大，更有景深
      }),
    ),
  )
}

// ------------------------------------------------------------
// 4. 太阳（自发光球 + 廉价光晕）
// ------------------------------------------------------------
// MeshBasicMaterial：不受灯光影响，看起来像「自己在发光」
const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.4, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0xffc857 }),
)
sun.name = '太阳'
// userData：你可以挂任何自定义数据，Raycaster 点中后用来显示文案
sun.userData.label = '太阳 Sun'
scene.add(sun)

// 半透明大一点的球 = 廉价「光晕」效果（真体积光更贵，学习阶段够用）
const sunGlow = new THREE.Mesh(
  new THREE.SphereGeometry(1.7, 32, 32),
  new THREE.MeshBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.22,
  }),
)
sun.add(sunGlow) // 加到太阳下面，会跟着太阳自转/移动

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
const pickables = [sun] // Raycaster 可点击列表（只放真正要点的 Mesh）

// ------------------------------------------------------------
// 5. 轨道辅助线（EllipseCurve → Line）
// ------------------------------------------------------------
/** 用椭圆曲线采样一圈点，再连成 Line，当作轨道辅助线 */
function createOrbitRing(radius) {
  const curve = new THREE.EllipseCurve(
    0, 0,           // 圆心
    radius, radius, // x半径、y半径（相等 = 正圆）
    0, Math.PI * 2, // 起止角度：一整圈
    false, 0,
  )
  // getPoints 得到的是 Vector2，要转成 3D 的 Vector3（y=0 的水平面）
  // 注意：Vector2 的 y 映射到世界的 z，这样轨道躺在 XZ 平面上
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

// ------------------------------------------------------------
// 6. 创建行星：pivot 公转 + mesh 自转
// ------------------------------------------------------------
for (const cfg of PLANETS) {
  // pivot：空的 Object3D，只负责「转」，本身看不见
  // 它在原点（太阳处）→ 子物体绕原点转 = 绕太阳公转
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
  // ★ 关键：行星放在 pivot 本地坐标的 +X 上（距离 = 轨道半径）
  // 之后每帧转 pivot.rotation.y，行星就会绕原点画圆
  mesh.position.x = cfg.orbit
  mesh.name = cfg.name
  mesh.userData.label = cfg.name
  pivot.add(mesh)

  scene.add(createOrbitRing(cfg.orbit))

  orbits.push({ pivot, mesh, speed: cfg.speed, spin: cfg.spin })
  pickables.push(mesh)
}

// ------------------------------------------------------------
// 7. 月球：多层父子变换演示
// ------------------------------------------------------------
// moonPivot 加在地球上 → 地球公转时月球跟着走
// 再转 moonPivot → 月球绕地球转（相对运动）
const earthEntry = orbits.find((o) => o.mesh.userData.label.startsWith('地球'))
if (earthEntry) {
  const moonPivot = new THREE.Object3D()
  earthEntry.mesh.add(moonPivot)

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.85 }),
  )
  moon.position.x = 0.7 // 相对地球的距离（本地坐标）
  moon.userData.label = '月球 Moon'
  moonPivot.add(moon)

  pickables.push(moon)
  earthEntry.moonPivot = moonPivot // 挂到 orbits 条目上，动画里一起更新
}

// ------------------------------------------------------------
// 8. Raycaster：鼠标点击拾取
// ------------------------------------------------------------
// 流程：屏幕像素 → NDC → 从相机射射线 → 与物体求交 → 取最近命中
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2() // NDC 坐标：x/y 都在 -1 ~ +1
const nameEl = document.getElementById('planetName')

function onPointerDown(event) {
  // 把屏幕像素坐标 → 标准化设备坐标（NDC）
  // 左上角大约 (-1, +1)，右下角大约 (+1, -1)，中心 (0, 0)
  // Y 要取负：屏幕向下为正，NDC 向上为正
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1

  // 从相机射出一条射线（方向由 pointer 决定）
  raycaster.setFromCamera(pointer, camera)
  // 和可点击物体列表求交（false = 不递归检查子物体）
  // 月球/行星都已单独放进 pickables，所以 false 即可
  const hits = raycaster.intersectObjects(pickables, false)

  if (hits.length && nameEl) {
    // hits 按距离从近到远排序，取第一个就是点中的
    nameEl.textContent = hits[0].object.userData.label || hits[0].object.name
  }
}

window.addEventListener('pointerdown', onPointerDown)

// ------------------------------------------------------------
// 9. 暂停开关 + 动画循环
// ------------------------------------------------------------
let paused = false
document.getElementById('pause')?.addEventListener('change', (e) => {
  paused = e.target.checked
})

function animate(time) {
  // time 是毫秒；乘 0.001 得到秒，方便调速度手感
  const t = time * 0.001

  sun.rotation.y = t * 0.2

  if (!paused) {
    for (const o of orbits) {
      o.pivot.rotation.y = t * o.speed // 公转：转的是空父物体
      o.mesh.rotation.y = t * o.spin   // 自转：转的是行星自己
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
 * 1. 在 PLANETS 里加一颗「木星」（更大 radius、更远 orbit、更慢 speed）
 * 2. 给轨道加一点倾斜：创建后 pivot.rotation.x = 0.1
 * 3. 点击后让相机缓动飞到行星附近（插值 camera.position → 目标）
 * 4. 把太阳换成带 emissive 的 StandardMaterial，对比 Basic 的「自发光」感
 * 5. 试着不用 pivot，改用 x = cos(t)*r、z = sin(t)*r，对比两种写法
 */
