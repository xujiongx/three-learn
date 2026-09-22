/**
 * ============================================================
 * 05 · 粒子系统 —— 一次画出成千上万个点
 * ============================================================
 *
 * 目标：理解「批处理」思路 —— 用一份几何数据画出成千上万个点。
 *
 * 和前几课的关系：
 *   01～04 每个物体基本是一个 Mesh（三角面）。
 *   如果为每个星星各建一个 Mesh，CPU/GPU 开销会炸。
 *   本课改用 Points：一份 BufferGeometry + 一次 draw call。
 *
 * 正确做法（心智模型）：
 *   1. 用一个很大的 Float32Array 存所有点的 x,y,z
 *   2. 塞进 BufferGeometry 的 position 属性
 *   3. 用 Points + PointsMaterial 一次画完
 *
 * 这就叫「批处理」。游戏里的雪花、火焰、星空都常用这招。
 * 后面项目（如音频可视化）也会：每帧改 positions，再标记 needsUpdate。
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与 OrbitControls
// ------------------------------------------------------------
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 2. 粒子数量 —— 先从几千开始试
// ------------------------------------------------------------
// 越大越密，也越吃性能。先搞懂结构，再往上加。
const COUNT = 4000

// ------------------------------------------------------------
// 3. 场景 / 相机 / 渲染器
// ------------------------------------------------------------
const scene = new THREE.Scene()
// 比前几课更深的背景，衬托发光粒子（AdditiveBlending 在深色底上更好看）
scene.background = new THREE.Color(0x050910)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// 粒子团在原点附近的球壳上，相机退到 z=6 就能整团入画
camera.position.z = 6

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 4. 轨道控制器 —— 自动旋转方便欣赏星云
// ------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true // 自动慢慢转，方便欣赏
controls.autoRotateSpeed = 0.6 // 数值越大转得越快；和 damping 一样依赖 update

// ------------------------------------------------------------
// 5. 准备 CPU 端的数组：每个粒子占 3 个数（x, y, z）
// ------------------------------------------------------------
// Float32Array：类型化数组，和 GPU 缓冲格式一致，传输更高效
const positions = new Float32Array(COUNT * 3)
const colors = new Float32Array(COUNT * 3)
// 复用一个 Color 对象，避免循环里反复 new（小优化，习惯很好）
const color = new THREE.Color()

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3 // 第 i 个粒子在数组里的起始下标

  // —— 球壳分布：让粒子落在「空心球壳」附近，而不是挤在中心 ——
  // 若用纯随机 xyz，中心会过密、边缘稀疏，看起来像「一团糊」
  // 球坐标：r / theta（经度）/ phi（纬度）
  const r = 1.2 + Math.random() * 2.8 // 内径 1.2～外径 4 的壳层
  const theta = Math.random() * Math.PI * 2
  // acos(2*u-1) 是均匀球面采样的常用写法；直接随机 phi 会在两极过密
  const phi = Math.acos(2 * Math.random() - 1)

  positions[i3] = r * Math.sin(phi) * Math.cos(theta)     // x
  positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) // y
  positions[i3 + 2] = r * Math.cos(phi)                   // z

  // 每个粒子自己的颜色（后面 PointsMaterial 要开 vertexColors）
  // 色相集中在青绿一带，再加一点随机亮暗，更有星云感
  color.setHSL(0.45 + Math.random() * 0.2, 0.7, 0.55 + Math.random() * 0.3)
  colors[i3] = color.r
  colors[i3 + 1] = color.g
  colors[i3 + 2] = color.b
}

// ------------------------------------------------------------
// 6. 把数组交给 GPU：BufferGeometry + BufferAttribute
// ------------------------------------------------------------
const geometry = new THREE.BufferGeometry()
// 第二个参数 3 表示「每 3 个数组成一个顶点」
// 常见坑：写成 1 或忘了 setAttribute → 粒子全挤在原点或直接报错
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.PointsMaterial({
  size: 0.035,              // 点的大小（世界单位，受透视影响）
  vertexColors: true,       // 使用上面每个顶点自己的颜色；关掉则全体同色
  transparent: true,
  opacity: 0.9,
  depthWrite: false,        // 透明物体常关深度写入，减少排序瑕疵
  blending: THREE.AdditiveBlending, // 叠加混合：重叠处更亮，适合星云/火焰
  sizeAttenuation: true,    // 近大远小；false 则所有点屏幕像素大小相同
})

// Points 类似 Mesh，但是画的是「点」而不是三角面
// 注意：这里不需要灯光 —— PointsMaterial 默认不受光（和 MeshBasic 类似）
const points = new THREE.Points(geometry, material)
scene.add(points)

// ------------------------------------------------------------
// 7. 动画循环 —— 整团缓慢翻转 + 更新 Controls
// ------------------------------------------------------------
function animate(time) {
  const t = time * 0.00015
  // 转的是整份 Points，不是逐个粒子 —— 成本极低
  points.rotation.y = t
  points.rotation.x = Math.sin(t * 0.5) * 0.15

  // autoRotate / damping 都依赖这行
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
 * 1. 把 COUNT 改成 20000，观察帧率变化（感受批处理上限）
 * 2. 每帧修改 positions[i3+1] 并设置
 *    geometry.attributes.position.needsUpdate = true
 *    就能让粒子动起来（P6 音频可视化就是这招）
 * 3. 试着改成「只在地面附近」的萤火虫分布（缩小 y 范围）
 * 4. 关掉 AdditiveBlending / depthWrite，对比星云「发光感」差异
 * 5. 把 sizeAttenuation 设为 false，观察远近点大小是否还变化
 */
