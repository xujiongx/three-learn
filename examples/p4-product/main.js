/**
 * ============================================================
 * P4 · 产品展示页 —— 换材质 + 热点标注
 * ============================================================
 *
 * 目标：理解电商/品牌站常见的「可旋转产品 + 卖点点击」交互。
 *
 * 典型玩法：
 *   1. 中间放产品，OrbitControls 可旋转（本例还开了 autoRotate）
 *   2. UI 色板切换颜色（改 material.color，共享材质一次变多处）
 *   3. 点击产品部件，旁边显示卖点文案（Raycaster + userData）
 *
 * 本课两个核心难点：
 *   · userData：把「业务数据」挂在 Mesh 上，拾取后直接读
 *   · Raycaster：把屏幕点击变成一条射线，求与哪些物体相交
 *
 * 本例用几何体拼了一副耳机。
 * 真实项目只需把 createHeadphones() 换成 GLTFLoader 加载的模型，
 * 热点逻辑（userData + Raycaster）可以原样复用。
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与轨道控制器
// ------------------------------------------------------------
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 2. 场景 / 相机 / 渲染器
// ------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// 雾：远景渐渐融入背景色，产品更「聚焦」在画面中心
scene.fog = new THREE.Fog(0x0b1220, 8, 18)

// 较小 fov（40）→ 透视压缩，产品更像静物摄影
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100)
camera.position.set(2.8, 1.6, 3.4)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. OrbitControls —— 展示向旋转（含自动转）
// ------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true // 无人操作时缓慢自转，更有「展台」感
controls.autoRotateSpeed = 0.8
controls.target.set(0, 0.6, 0) // 对准耳机大致中心
controls.minDistance = 2
controls.maxDistance = 7
// 限制仰角上限，避免翻到产品底下（略小于 π/2）
controls.maxPolarAngle = Math.PI * 0.49

// ------------------------------------------------------------
// 4. 灯光与地面
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const key = new THREE.DirectionalLight(0xffffff, 1.3)
key.position.set(3, 6, 4)
key.castShadow = true
scene.add(key)

// PointLight 作为补光：从另一侧提亮暗部
// position.set 返回对象本身，所以可以链式写（本例拆开写更清晰）
const fillLight = new THREE.PointLight(0x6ea8ff, 1.5, 12)
fillLight.position.set(-2, 2, 0)
scene.add(fillLight)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 64),
  new THREE.MeshStandardMaterial({ color: 0x121a2b, roughness: 0.9 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ------------------------------------------------------------
// 5. 三种材质 —— 共享引用是换色的关键
// ------------------------------------------------------------
// shellMat 被头梁、耳罩多处共用：改一次 color，所有引用处一起变
const shellMat = new THREE.MeshStandardMaterial({
  color: 0x3dd6c6,
  metalness: 0.35,
  roughness: 0.35,
})
const darkMat = new THREE.MeshStandardMaterial({
  color: 0x1a2235,
  metalness: 0.5,
  roughness: 0.4,
})
const metalMat = new THREE.MeshStandardMaterial({
  color: 0xc9d4ee,
  metalness: 0.9,
  roughness: 0.2,
})

// ------------------------------------------------------------
// 6. 程序化拼装耳机；可点击部件写入 userData.hotspot
// ------------------------------------------------------------
/**
 * userData 是 Object3D 上的「自定义杂物袋」。
 * Three.js 不会用它做渲染，专门留给你挂业务信息。
 * 这里挂字符串；真实项目也可挂 { id, title, url } 等对象。
 */
function createHeadphones() {
  const root = new THREE.Group()

  // 头梁：半个圆环（Torus 的最后一个参数是弧长，Math.PI = 半圈）
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.07, 16, 48, Math.PI),
    shellMat,
  )
  band.rotation.z = Math.PI / 2
  band.rotation.y = Math.PI / 2
  band.position.y = 1.15
  band.castShadow = true
  root.add(band)

  // 左右耳罩：side = -1 / 1，对称摆放
  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.28, 32),
      shellMat,
    )
    cup.rotation.z = Math.PI / 2
    cup.position.set(side * 0.85, 0.55, 0)
    cup.castShadow = true
    // ★ 热点文案挂在 userData 上，点击命中后读出来即可
    cup.userData.hotspot =
      side < 0 ? '左侧耳罩 · 40mm 动圈单元' : '右侧耳罩 · 触控板手势'
    root.add(cup)

    // 耳垫：装饰用，不写 hotspot → 点到它不会弹出文案
    const pad = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.08, 12, 32),
      darkMat,
    )
    pad.rotation.y = Math.PI / 2
    pad.position.set(side * 0.72, 0.55, 0)
    root.add(pad)
  }

  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.5, 12),
    metalMat,
  )
  bridge.rotation.z = Math.PI / 2
  bridge.position.y = 0.55
  bridge.userData.hotspot = '航空级铝合金头梁'
  bridge.castShadow = true
  root.add(bridge)

  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.08, 24),
    metalMat,
  )
  badge.position.set(0.85, 0.55, 0.15)
  badge.userData.hotspot = 'LED 状态灯 · 续航 32h'
  root.add(badge)

  // 统一打开投射阴影（避免漏设）
  root.traverse((c) => {
    if (c.isMesh) c.castShadow = true
  })
  return root
}

const product = createHeadphones()
scene.add(product)

// ------------------------------------------------------------
// 7. 收集热点 Mesh + Raycaster 拾取
// ------------------------------------------------------------
// 只把「带 hotspot」的物体交给 intersectObjects，
// 避免点到地面/耳垫也触发，且能略微提升性能。
const hotspots = []
product.traverse((c) => {
  if (c.userData.hotspot) hotspots.push(c)
})

const infoEl = document.getElementById('hotspotInfo')
const raycaster = new THREE.Raycaster()
// NDC 坐标：x/y 都在 [-1, 1]，屏幕中心是 (0, 0)
const pointer = new THREE.Vector2()

/**
 * 屏幕像素 → 归一化设备坐标（NDC）→ 从相机发出射线 → 求交。
 *
 * 为什么 Y 要取负？
 *   DOM 的 Y 向下增大，而 NDC 的 Y 向上为正，所以要反过来。
 * hits[0] 是离相机最近的交点；object 就是被点中的 Mesh。
 */
function onPointer(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  // 第二个参数 false：不递归子树（hotspots 里已经是具体 Mesh）
  const hits = raycaster.intersectObjects(hotspots, false)
  if (hits.length) {
    infoEl.textContent = hits[0].object.userData.hotspot
    // 点到热点时暂停自动转，方便阅读文案
    controls.autoRotate = false
  }
}

addEventListener('pointerdown', onPointer)

// ------------------------------------------------------------
// 8. 色板：只改共享的 shellMat.color
// ------------------------------------------------------------
document.getElementById('swatches').addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch')
  if (!btn) return
  // dataset.color 来自 HTML 的 data-color 属性
  shellMat.color.set(btn.dataset.color)
  document.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('is-active', el === btn)
  })
})

// ------------------------------------------------------------
// 9. 动画循环与窗口自适应
// ------------------------------------------------------------
renderer.setAnimationLoop(() => {
  controls.update() // autoRotate / damping 都依赖每帧 update
  renderer.render(scene, camera)
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 把耳机换成 Sketchfab / 自己的 GLB，热点仍写在对应 Mesh.userData 上
 * 2. 热点改成屏幕上跟随的 HTML 标签（把 3D 点投影到 2D，进阶）
 * 3. 增加「磨砂 / 亮面」按钮，切换 shellMat.roughness
 * 4. 命中时给 hits[0].object 短暂提高 emissive，做「选中高亮」反馈
 */
