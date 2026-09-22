/**
 * ============================================================
 * P1 · 可交互旋转展台（第一个完整小项目）
 * ============================================================
 *
 * 目标：把「零散基础」拼成一个能给别人看的完整小 demo。
 *
 * 你会用到前面学过的几乎所有基础能力：
 *   - Scene / Camera / Renderer
 *   - 灯光 + MeshStandardMaterial + 阴影
 *   - OrbitControls（拖拽旋转）
 *   - Group 组装复杂物体（展台 + 花瓶分层）
 *   - LatheGeometry：用 2D 轮廓「车」出旋转体
 *   - HTML 按钮控制 Three.js 里的材质颜色
 *
 * 记住这一句话：
 *   Group 只是「空文件夹」——子物体用本地坐标摆好，
 *   以后移动/旋转 Group，整组一起动。
 *
 * 验收清单（对照学习文档）：
 *   ✓ 拖拽流畅（damping）
 *   ✓ 窗口缩放不变形（resize）
 *   ✓ 地面有阴影
 *   ✓ 三个颜色可切换
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与轨道控制器
// ------------------------------------------------------------
// OrbitControls 不在 three 核心包里，要从 addons 单独引入。
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 颜色表：后面 UI 会用到十六进制字符串，这里先准备一份数字版
// 0x 开头 = Three.js Color / Material 常用的写法
const COLORS = {
  teal: 0x3dd6c6,
  blue: 0x6ea8ff,
  coral: 0xff8f6b,
}

// ------------------------------------------------------------
// 2. 三大件：Scene / Camera / Renderer
// ------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// Fog(颜色, near, far)：距离超过 far 的物体完全融进背景色
// 远处物体融进背景，空间感更好，也减轻「场景边缘硬切」的感觉
scene.fog = new THREE.Fog(0x0b1220, 10, 24)

// PerspectiveCamera：透视相机（近大远小）
// 产品展示常用较小 fov（45），物体显得更「端庄」；游戏常用 60～75
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// 从斜上方看展台，比正前方更有「产品照」感
camera.position.set(3.2, 2.4, 4.6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
// 像素比上限 2：超高清屏上避免过度采样浪费算力
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// 不开启 shadowMap，castShadow / receiveShadow 都不会生效
renderer.shadowMap.enabled = true
// PCFSoftShadowMap：软阴影，边缘更自然（比默认稍贵一点）
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. OrbitControls —— 鼠标拖拽环视展台
// ------------------------------------------------------------
// 第二个参数必须是 canvas（renderer.domElement），事件才会绑对
const controls = new OrbitControls(camera, renderer.domElement)
// damping：松开鼠标后还会缓缓滑行，手感更「有质量」
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.autoRotate = true // 默认自动转，像商场展台
controls.autoRotateSpeed = 1.2
// target = 旋转绕着哪个点转；对准花瓶中部，而不是地面原点
controls.target.set(0, 0.85, 0)
controls.minDistance = 2.2 // 别缩太近穿模
controls.maxDistance = 10
// maxPolarAngle：限制俯仰角。π/2 是水平；0.48π ≈ 不能翻到地面以下
controls.maxPolarAngle = Math.PI * 0.48

// ------------------------------------------------------------
// 4. 灯光 —— Ambient 铺底 + Directional 主光 + Point 补光
// ------------------------------------------------------------
// AmbientLight：无方向、无阴影，只是让暗部不至于全黑
scene.add(new THREE.AmbientLight(0xffffff, 0.35))

// DirectionalLight：平行光，类似太阳；适合做主光并投射阴影
const keyLight = new THREE.DirectionalLight(0xffffff, 1.35)
keyLight.position.set(4, 7, 3)
keyLight.castShadow = true
// 阴影贴图分辨率：越大越清楚，越吃显存。1024 对小场景够用
keyLight.shadow.mapSize.set(1024, 1024)
// 阴影相机范围：只覆盖展台附近，阴影会更清晰（范围太大 = 分辨率被摊薄）
keyLight.shadow.camera.near = 1
keyLight.shadow.camera.far = 20
keyLight.shadow.camera.left = -5
keyLight.shadow.camera.right = 5
keyLight.shadow.camera.top = 5
keyLight.shadow.camera.bottom = -5
scene.add(keyLight)

// 补光：从另一侧打一点蓝色，暗部不会死黑，也带一点环境色
const fill = new THREE.PointLight(0x6ea8ff, 1.2, 16)
fill.position.set(-3, 2, 2)
scene.add(fill)

// ------------------------------------------------------------
// 5. 地面 + 装饰环
// ------------------------------------------------------------
// CircleGeometry：圆盘当地板；要接阴影必须 receiveShadow = true
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(5, 64),
  new THREE.MeshStandardMaterial({
    color: 0x141e30,
    roughness: 0.92,
    metalness: 0.05,
  }),
)
// Plane / Circle 默认朝 +Z，转到水平面要绕 X 转 -90°
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// RingGeometry(内半径, 外半径, 分段)：圆环，当作展台装饰线
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
// 微微抬高，避免和地面共面导致 Z-fighting（闪烁）
ring.position.y = 0.002
scene.add(ring)

// ------------------------------------------------------------
// 6. Group 组装展台 + 展品
// ------------------------------------------------------------
// Group ≈ 空的「父节点」：自身没有几何体，只负责组织子物体变换。
// 好处：以后若要整体挪展台，只改 showcase.position 即可。
const showcase = new THREE.Group()
scene.add(showcase)

const pedestalMat = new THREE.MeshStandardMaterial({
  color: 0x1c2940,
  roughness: 0.55,
  metalness: 0.35,
})

// 底座大圆台：CylinderGeometry(上半径, 下半径, 高, 径向分段)
const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.25, 0.28, 48),
  pedestalMat,
)
pedestal.position.y = 0.14
pedestal.castShadow = true
pedestal.receiveShadow = true
showcase.add(pedestal) // 注意：加到 Group，不是直接 scene.add

// 中间小柱：托住花瓶
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
 * （若瓶身和瓶口要独立换色，就各自 new 一份 Material。）
 */
const productMat = new THREE.MeshStandardMaterial({
  color: COLORS.teal,
  metalness: 0.55,
  roughness: 0.28,
})

// 花瓶再包一层 Group：方便整体抬高到柱顶，也方便单独加自转
const vase = new THREE.Group()
vase.position.y = 0.85
showcase.add(vase)

/**
 * LatheGeometry：把一条 2D 轮廓线绕 Y 轴旋转，生成花瓶这类「旋转体」。
 * 每个 Vector2：x = 半径（离轴线多远），y = 高度。
 * 点要按高度大致从低到高排；分段 48 越大越圆滑。
 * 初学者不必死记参数，知道「可以用轮廓车出花瓶」即可。
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

// 瓶口金属边：TorusGeometry(圆环半径, 管半径, …)
const rim = new THREE.Mesh(
  new THREE.TorusGeometry(0.37, 0.035, 16, 48),
  new THREE.MeshStandardMaterial({
    color: 0xe8eefc,
    metalness: 0.8,
    roughness: 0.2,
  }),
)
rim.position.y = 1.42
// Torus 默认躺在 XY 平面；转到水平要绕 X 转 90°
rim.rotation.x = Math.PI / 2
rim.castShadow = true
vase.add(rim)

// ------------------------------------------------------------
// 7. UI：HTML 换色 + 自动旋转开关（DOM ↔ Three.js）
// ------------------------------------------------------------
// 学习重点：Three 负责画 3D，HTML 负责按钮；用事件把两边连起来。
const swatches = document.getElementById('swatches')

swatches?.addEventListener('click', (e) => {
  // closest：即使点到按钮内部的子元素，也能找到带 .swatch 的祖先
  const btn = e.target.closest('.swatch')
  if (!btn) return

  // dataset.color 来自 HTML 的 data-color="#3dd6c6"
  const hex = btn.dataset.color
  // Color.set 既接受 0x3dd6c6，也接受 '#3dd6c6'
  productMat.color.set(hex)

  // 高亮当前选中的色块（纯 CSS class，与 3D 无关）
  swatches.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('is-active', el === btn)
  })
})

// 把 data-color 同步到 CSS 变量，让色块按钮显示正确颜色
swatches?.querySelectorAll('.swatch').forEach((el) => {
  el.style.setProperty('--swatch', el.dataset.color)
})

document.getElementById('autoRotate')?.addEventListener('change', (e) => {
  // 复选框勾选状态 → 直接驱动控制器；不需要自己写旋转逻辑
  controls.autoRotate = e.target.checked
})

// ------------------------------------------------------------
// 8. 渲染循环 + 窗口自适应
// ------------------------------------------------------------
function animate() {
  // damping / autoRotate 都依赖每帧 update；忘了调用 = 拖拽发涩或自转停住
  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  // 改了 aspect 之后必须调用，否则不生效
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. 再加一个「金属度」滑条，改 productMat.metalness（0～1）
 * 2. 把花瓶换成自己的 GLB 模型（参考示例 04），仍挂在 vase Group 下
 * 3. 点击展品时用 Raycaster 弹出介绍文字（参考 P2 / P4）
 * 4. 试着改 LatheGeometry 轮廓点，做出「胖肚子」或「细长瓶」
 * 5. 给 showcase 加一点点 showcase.rotation.y += 0.002，对比 autoRotate
 */
