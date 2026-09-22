/**
 * ============================================================
 * P1 · 可交互旋转展台（第一个完整小项目）
 * ============================================================
 *
 * 你会用到前面学过的几乎所有基础能力：
 *   - Scene / Camera / Renderer
 *   - 灯光 + MeshStandardMaterial + 阴影
 *   - OrbitControls（拖拽旋转）
 *   - Group 组装复杂物体
 *   - HTML 按钮控制 Three.js 里的材质颜色
 *
 * 验收清单（对照学习文档）：
 *   ✓ 拖拽流畅（damping）
 *   ✓ 窗口缩放不变形（resize）
 *   ✓ 地面有阴影
 *   ✓ 三个颜色可切换
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 颜色表：后面 UI 会用到十六进制字符串，这里先准备一份数字版
const COLORS = {
  teal: 0x3dd6c6,
  blue: 0x6ea8ff,
  coral: 0xff8f6b,
}

// ======================== 三大件 ========================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// 远处物体融进背景，空间感更好
scene.fog = new THREE.Fog(0x0b1220, 10, 24)

const camera = new THREE.PerspectiveCamera(
  45, // 产品展示常用较小 fov，物体显得更「端庄」
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(3.2, 2.4, 4.6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
// PCFSoftShadowMap：软阴影，边缘更自然（比默认稍贵一点）
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// ======================== 控制器 ========================
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.autoRotate = true // 默认自动转，像商场展台
controls.autoRotateSpeed = 1.2
controls.target.set(0, 0.85, 0) // 旋转中心对准花瓶中部
controls.minDistance = 2.2 // 别缩太近穿模
controls.maxDistance = 10
// maxPolarAngle：限制俯仰，0.48π 大约是「不能翻到地面以下」
controls.maxPolarAngle = Math.PI * 0.48

// ======================== 灯光 ========================
scene.add(new THREE.AmbientLight(0xffffff, 0.35))

const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
keyLight.position.set(4, 7, 3)
keyLight.castShadow = true
// 阴影贴图分辨率：越大越清楚，越吃显存。1024 对小场景够用
keyLight.shadow.mapSize.set(1024, 1024)
// 阴影相机范围：只覆盖展台附近，阴影会更清晰
keyLight.shadow.camera.near = 1
keyLight.shadow.camera.far = 20
keyLight.shadow.camera.left = -5
keyLight.shadow.camera.right = 5
keyLight.shadow.camera.top = 5
keyLight.shadow.camera.bottom = -5
scene.add(keyLight)

// 补光：从另一侧打一点蓝色，暗部不会死黑
const fill = new THREE.PointLight(0x6ea8ff, 1.2, 16)
fill.position.set(-3, 2, 2)
scene.add(fill)

// ======================== 地面 + 装饰环 ========================
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 64),
  new THREE.MeshStandardMaterial({
    color: 0x141e30,
    roughness: 0.92,
    metalness: 0.05,
  }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// RingGeometry：圆环，当作展台装饰线
const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.55, 1.7, 64),
  new THREE.MeshStandardMaterial({
    color: 0x2a3a55,
    roughness: 0.7,
    metalness: 0.3,
    side: THREE.DoubleSide, // 圆环很薄，双面都能看见
  }),
)
ring.rotation.x = -Math.PI / 2
ring.position.y = 0.002 // 微微抬高，避免和地面 Z-fighting（闪烁）
scene.add(ring)

// ======================== 展台 + 展品（Group 组装）========================
const showcase = new THREE.Group()
scene.add(showcase)

const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x1c2940,
  roughness: 0.55,
  metalness: 0.35,
})

// 底座大圆台
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.25, 0.28, 48),
  pedestalMat,
)
pedestal.position.y = 0.14
pedestal.castShadow = true
pedestal.receiveShadow = true
showcase.add(pedestal)

// 中间小柱
const pillar = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.7, 0.55, 40),
  pedestalMat,
)
pillar.position.y = 0.55
pillar.castShadow = true
pillar.receiveShadow = true
showcase.add(pillar)

/**
 * 展品材质：后面 UI 换色时，只改这一个 material.color 即可。
 * 多个 Mesh 共用同一份 Material，换色会一起变——这是有意为之。
 */
const productMat = new THREE.MeshStandardMaterial({
  color: COLORS.teal,
  metalness: 0.55,
  roughness: 0.28,
})

const vase = new THREE.Group()
vase.position.y = 0.85
showcase.add(vase)

/**
 * LatheGeometry：把一条 2D 轮廓线绕 Y 轴旋转，生成花瓶这类「旋转体」。
 * Vector2 的 x = 半径，y = 高度。
 * 初学者不必死记，知道「可以用轮廓车出花瓶」即可。
 */
const body = new THREE.Mesh(
  new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.05, 0),
      new THREE.Vector2(0.42, 0.08),
      new THREE.Vector2(0.48, 0.35),
      new THREE.Vector2(0.32, 0.7),
      new THREE.Vector2(0.22, 1.05),
      new THREE.Vector2(0.28, 1.25),
      new THREE.Vector2(0.38, 1.35),
      new THREE.Vector2(0.36, 1.42),
    ],
    48, // 旋转分段数，越大越圆
  ),
  productMat,
)
body.castShadow = true
body.receiveShadow = true
vase.add(body)

// 瓶口金属边
const rim = new THREE.Mesh(
  new THREE.TorusGeometry(0.37, 0.035, 16, 48),
  new THREE.MeshStandardMaterial({
    color: 0xe8eefc,
    metalness: 0.8,
    roughness: 0.2,
  }),
)
rim.position.y = 1.42
rim.rotation.x = Math.PI / 2
rim.castShadow = true
vase.add(rim)

// ======================== UI：换色 + 自动旋转开关 ========================
const swatches = document.getElementById('swatches')

swatches?.addEventListener('click', (e) => {
  // closest：即使点到按钮内部元素，也能找到 .swatch
  const btn = e.target.closest('.swatch')
  if (!btn) return

  // dataset.color 来自 HTML 的 data-color="#3dd6c6"
  const hex = btn.dataset.color
  // Color.set 既接受 0x3dd6c6，也接受 '#3dd6c6'
  productMat.color.set(hex)

  // 高亮当前选中的色块
  swatches.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('is-active', el === btn)
  })
})

// 把 data-color 同步到 CSS 变量，让色块按钮显示正确颜色
swatches?.querySelectorAll('.swatch').forEach((el) => {
  el.style.setProperty('--swatch', el.dataset.color)
})

document.getElementById('autoRotate')?.addEventListener('change', (e) => {
  // 复选框勾选状态 → 直接驱动控制器
  controls.autoRotate = e.target.checked
})

// ======================== 渲染循环 ========================
function animate() {
  controls.update() // damping / autoRotate 都依赖它
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【进阶挑战】
 * 1. 再加一个「金属度」滑条，改 productMat.metalness
 * 2. 把花瓶换成自己的 GLB 模型（参考示例 04）
 * 3. 点击展品时用 Raycaster 弹出介绍文字（参考 P4）
 */
