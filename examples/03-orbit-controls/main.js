/**
 * ============================================================
 * 03 · OrbitControls —— 用鼠标「环绕」观察场景
 * ============================================================
 *
 * 目标：学会用官方附加模块控制相机，让场景「可交互地看」。
 *
 * 和前两课的关系：
 *   01 / 02 的相机是写死的（position + lookAt）。
 *   本课把相机交给 OrbitControls，用鼠标环绕、缩放、平移。
 *   灯光仍用 Standard 材质那一套（继承 02 的心智模型）。
 *
 * OrbitControls 不是 three 核心包自带的，它在「官方附加模块」里：
 *   three/addons/controls/OrbitControls.js
 * （Vite 等打包工具能直接解析这个路径；别手写错成 controls/...）
 *
 * 常见操作：
 *   左键拖拽 = 旋转视角
 *   滚轮     = 缩放
 *   右键拖拽 = 平移
 *
 * 特别注意（本课最大的坑）：
 *   如果开启了 enableDamping（惯性），每一帧都要 controls.update()
 *   否则拖拽会感觉「没反应」或卡顿。
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与 OrbitControls
// ------------------------------------------------------------
import * as THREE from 'three'
// 从 addons 引入控制器（路径写对很重要）
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 2. 场景 / 相机 / 渲染器
// ------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// Fog：距离雾。靠近相机颜色正常，远处逐渐融进雾色。
// 参数：(颜色, 开始有雾的距离, 完全被雾挡住的距离)
// 雾色和背景色相同 → 远处物体会「溶」进背景，景深感更强
scene.fog = new THREE.Fog(0x0b1220, 8, 22)

const camera = new THREE.PerspectiveCamera(
  55, // 比上两课再收一点，环绕观察时更稳
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// 初始机位：斜上方。之后用户拖拽会改这个位置，Controls 会接管
camera.position.set(4, 3, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// Controls 第二个参数必须是「接收鼠标事件」的 DOM —— 通常就是 canvas
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. 创建轨道控制器：把「相机」和「画布 DOM」交给它管理
// ------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)

// 阻尼 = 松手后还会滑一点点，手感更自然（产品展示页几乎都会开）
controls.enableDamping = true
controls.dampingFactor = 0.05 // 越大停得越快；太小会「滑很久」

// target：旋转时的「绕着哪个点转」（默认是原点）
// 抬高一点到 y=0.5，视线对准物体圈的高度，而不是对着地面中心
controls.target.set(0, 0.5, 0)

// 可选限制（产品展示页常用，先注释掉留给你练习）：
// controls.minDistance = 2
// controls.maxDistance = 10
// controls.maxPolarAngle = Math.PI / 2  // 不能翻到地面以下

// ------------------------------------------------------------
// 4. 灯光（延续 02：Standard 材质需要灯）
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 8, 3)
scene.add(light)

// ------------------------------------------------------------
// 5. GridHelper —— 调试神器：感知远近和比例
// ------------------------------------------------------------
// 参数：(尺寸, 分段数, 中心线颜色, 网格线颜色)
// 正式产品可删；学习/摆物体时非常有用
const grid = new THREE.GridHelper(16, 16, 0x3dd6c6, 0x1e2a40)
scene.add(grid)

// ------------------------------------------------------------
// 6. Group：把多个物体当成「一个整体」移动/旋转
// ------------------------------------------------------------
// 旋转 group 时，里面的所有孩子会一起转（绕 group 自己的原点）
// 常见坑：把 mesh 直接 add 到 scene，再想「整圈一起转」就麻烦了
const group = new THREE.Group()
scene.add(group)

for (let i = 0; i < 12; i++) {
  const mesh = new THREE.Mesh(
    // IcosahedronGeometry：二十面体，detail=0 就是最粗糙的多面体
    // detail 越大越接近球体，面数也指数增长
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({
      // setHSL(色相0~1, 饱和度, 亮度) —— 用循环做彩虹色很方便
      // i/12 让 12 个物体均分色相环
      color: new THREE.Color().setHSL(i / 12, 0.65, 0.55),
      roughness: 0.35,
      metalness: 0.25,
    }),
  )

  // 把 12 个物体均匀摆在圆周上（极坐标 → 直角坐标）
  const angle = (i / 12) * Math.PI * 2 // 0 ~ 2π
  mesh.position.set(
    Math.cos(angle) * 2.2, // x
    0.5,                   // y 稍微抬高，别埋进网格
    Math.sin(angle) * 2.2, // z
  )
  group.add(mesh) // 注意：加到 group，不是直接加到 scene
}

// ------------------------------------------------------------
// 7. 动画循环 —— 整圈自转 + 每帧更新 Controls
// ------------------------------------------------------------
function animate(time) {
  // 整圈物体慢慢自转（和鼠标拖拽互不冲突：一个转物体，一个转相机）
  group.rotation.y = time * 0.00025

  // ★ 开了 damping 就必须每帧 update；忘了这行是本课头号坑
  // autoRotate 同理，也依赖 update
  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ------------------------------------------------------------
// 8. 窗口尺寸变化
// ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. controls.autoRotate = true，再调 autoRotateSpeed，看自动展示效果
 * 2. 设置 minDistance / maxDistance，限制缩放范围（做产品页常用）
 * 3. 把 GridHelper 换成 AxesHelper(2)，观察 XYZ 轴向（红X 绿Y 蓝Z）
 * 4. 关掉 enableDamping，对比有无惯性的手感差异
 * 5. 下一课会加载「模型」：Controls 几乎是标配，记得继续每帧 update
 */
