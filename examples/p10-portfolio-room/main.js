/**
 * ============================================================
 * P10 · 3D 作品集房间 —— 用场景讲故事
 * ============================================================
 *
 * 这是很多作品集网站的思路：
 *   不把链接做成普通列表，
 *   而做成一个可探索的「房间」：
 *     书桌 = 博客
 *     书架上的书 = 各个项目
 *     墙上的画 = 视觉作品
 *
 * 技术上你已经会了：
 *   OrbitControls + Raycaster + userData
 *
 * 重点变成「场景构图」和「交互文案」。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
// 浅色室内氛围（和前面深色宇宙风形成对比）
scene.background = new THREE.Color(0xf0e8dc)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(5.5, 3.5, 6.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1.2, 0)
controls.minDistance = 3
controls.maxDistance = 12
controls.maxPolarAngle = Math.PI * 0.48

scene.add(new THREE.AmbientLight(0xfff5e8, 0.55))
const sun = new THREE.DirectionalLight(0xffe6c8, 1.2)
sun.position.set(4, 8, 3)
sun.castShadow = true
scene.add(sun)

// 材质复用：同类物体共用，改一处全局变
const wood = new THREE.MeshStandardMaterial({ color: 0xb08968, roughness: 0.75 })
const wall = new THREE.MeshStandardMaterial({ color: 0xf7f1e8, roughness: 0.95 })
const floorMat = new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.85 })
const accent = new THREE.MeshStandardMaterial({
  color: 0x3dd6c6,
  metalness: 0.2,
  roughness: 0.4,
})

const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), floorMat)
floor.rotation.x = -Math.PI / 2
floor.receiveShadow = true
scene.add(floor)

function wallPlane(w, h, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wall)
  m.position.set(x, y, z)
  m.rotation.y = ry
  m.receiveShadow = true
  scene.add(m)
}
wallPlane(10, 4, 0, 2, -5) // 后墙
wallPlane(10, 4, -5, 2, 0, Math.PI / 2) // 左墙
wallPlane(10, 4, 5, 2, 0, -Math.PI / 2) // 右墙

/** 所有可点击物体放这里 */
const interactives = []

/**
 * 给 Mesh 挂上标题/说明，并加入拾取列表。
 * 之后所有「可点击家具」都走这个函数，避免漏设 userData。
 */
function makeHotspot(mesh, title, desc) {
  mesh.userData = { title, desc }
  mesh.castShadow = true
  mesh.receiveShadow = true
  interactives.push(mesh)
  return mesh
}

// ——— 书桌 ———
const desk = new THREE.Group()
const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.1), wood)
deskTop.position.y = 0.9
desk.add(deskTop)
for (const x of [-1, 1]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), wood)
  leg.position.set(x * 1.05, 0.45, 0.4)
  desk.add(leg)
  const leg2 = leg.clone()
  leg2.position.z = -0.4
  desk.add(leg2)
}
desk.position.set(1.5, 0, -2.5)
scene.add(desk)
makeHotspot(deskTop, '书桌 · 博客', '技术笔记与 Three.js 学习日志。点击代表「博客入口」。')

// ——— 笔记本 ———
const laptop = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.04, 0.5),
  new THREE.MeshStandardMaterial({ color: 0x2a2f3a, metalness: 0.6, roughness: 0.3 }),
)
laptop.position.set(1.5, 0.98, -2.5)
scene.add(laptop)

const screen = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.03), accent)
screen.position.set(1.5, 1.2, -2.72)
screen.rotation.x = -0.15
scene.add(screen)
makeHotspot(screen, '电脑 · 在线作品', '部署在 Vercel / GitHub Pages 的交互 Demo 集合。')

// ——— 书架 + 书（每本书一个项目）———
const shelf = new THREE.Group()
const shelfBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.12), wood)
shelfBack.position.set(0, 1.1, 0)
shelf.add(shelfBack)

for (let i = 0; i < 3; i++) {
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.35), wood)
  plank.position.set(0, 0.4 + i * 0.65, 0.1)
  shelf.add(plank)
}

const bookColors = [0x6ea8ff, 0xff8f6b, 0x3dd6c6, 0xe8d5a3, 0xc084fc, 0xf472b6]
const bookTitles = [
  '太阳系 Demo',
  '音频可视化',
  '跑酷小游戏',
  '数据大屏',
  'Shader 水面',
  '产品展台',
]

for (let i = 0; i < 6; i++) {
  const book = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.4, 0.28),
    new THREE.MeshStandardMaterial({ color: bookColors[i] }),
  )
  // 两层，每层三本
  book.position.set(-0.6 + (i % 3) * 0.35, 0.65 + Math.floor(i / 3) * 0.65, 0.12)
  shelf.add(book)
  makeHotspot(book, `项目 ${i + 1}`, bookTitles[i])
}
shelf.position.set(-3.2, 0, -4.4)
scene.add(shelf)

/** 墙上画框 */
function frame(x, z, color, title, desc) {
  const border = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.06), wood)
  border.position.set(x, 2.0, z)
  scene.add(border)

  const art = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.8),
    new THREE.MeshStandardMaterial({ color }),
  )
  art.position.set(x, 2.0, z + 0.04)
  scene.add(art)
  makeHotspot(art, title, desc)
}

frame(-1.2, -4.92, 0x6ea8ff, '画作 · 雾港', '静态渲染作品，探索雾效与体积光。')
frame(1.5, -4.92, 0xff8f6b, '画作 · 余烬', '暖色构图练习，品牌视觉实验。')

// 地毯：让构图有中心感
const rug = new THREE.Mesh(
  new THREE.CircleGeometry(1.6, 48),
  new THREE.MeshStandardMaterial({ color: 0xc4a484, roughness: 1 }),
)
rug.rotation.x = -Math.PI / 2
rug.position.set(0.5, 0.01, 0.5)
rug.receiveShadow = true
scene.add(rug)

// ——— 点击交互：更新左下角信息卡 ———
const info = document.getElementById('info')
const infoTitle = document.getElementById('infoTitle')
const infoDesc = document.getElementById('infoDesc')
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

addEventListener('pointerdown', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(interactives, false)

  if (hits.length) {
    const d = hits[0].object.userData
    infoTitle.textContent = d.title
    infoDesc.textContent = d.desc
    info.classList.add('show')
  } else {
    // 点空白处关闭信息卡
    info.classList.remove('show')
  }
})

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 把 userData 里加上 url，点击后 window.open(url)
 * 2. 加载真实家具 GLB，替换几何体拼装
 * 3. 加一道「门」，点击切换到另一个场景（作品集路由）
 */
