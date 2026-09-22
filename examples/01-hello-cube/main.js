/**
 * ============================================================
 * 01 · Hello Cube —— Three.js 最小闭环（必学第一课）
 * ============================================================
 *
 * 目标：理解「要在网页上显示 3D，至少需要哪几样东西」。
 *
 * 记住这一句话：
 *   Scene（舞台） + Camera（观众眼睛） + Renderer（摄影机）
 *   = 每一帧画到屏幕上的画面
 *
 * 再加上：
 *   Geometry（形状） + Material（外观） = Mesh（真正放进舞台的物体）
 *   Animation Loop（动画循环）= 每秒大约画 60 次，物体才会「动起来」
 */

// ------------------------------------------------------------
// 1. 引入 Three.js
// ------------------------------------------------------------
// `import * as THREE from 'three'` 的意思是：
// 把 three 这个包里的所有导出，都挂到名为 THREE 的对象上。
// 之后写 THREE.Scene、THREE.BoxGeometry 都来自这里。
import * as THREE from 'three'

// ------------------------------------------------------------
// 2. 创建场景 Scene —— 所有 3D 物体都要「装进」这里
// ------------------------------------------------------------
const scene = new THREE.Scene()
// background：场景背景色。0x0b1220 是十六进制颜色（深蓝黑）
// 写成 '0x' + RRGGBB，和 CSS 的 #0b1220 是同一套写法。
scene.background = new THREE.Color(0x0b1220)

// ------------------------------------------------------------
// 3. 创建相机 Camera —— 决定「从哪里看、看得有多宽」
// ------------------------------------------------------------
// PerspectiveCamera = 透视相机（近大远小，最接近人眼）
// 四个参数依次是：
//   fov   : 视野角度（度）。75 比较宽，人眼大约 60～70
//   aspect: 画布宽高比。必须和窗口一致，否则画面会拉伸变形
//   near  : 近裁剪面。比这个更近的物体不会被画出来
//   far   : 远裁剪面。比这个更远的物体也不会被画出来
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// 默认相机在原点 (0,0,0)，朝向 -Z。
// 把相机往后挪一点（+Z），才能看到放在原点附近的方块。
camera.position.z = 3

// ------------------------------------------------------------
// 4. 创建渲染器 Renderer —— 真正把 3D 画到 <canvas> 上
// ------------------------------------------------------------
// antialias: true 开启抗锯齿，边缘更平滑（稍微费一点性能）
const renderer = new THREE.WebGLRenderer({ antialias: true })
// 设置绘制区域大小 = 整个浏览器窗口
renderer.setSize(window.innerWidth, window.innerHeight)
// 像素比：手机视网膜屏可能是 2、3。
// 上限设为 2，避免在超高清屏上算力浪费太多。
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// renderer.domElement 就是一块 <canvas>，把它塞进页面里
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 5. 创建网格 Mesh = Geometry（形状）+ Material（外观）
// ------------------------------------------------------------
// BoxGeometry(宽, 高, 深) —— 单位没有「米/厘米」，是你自己定的「场景单位」
const geometry = new THREE.BoxGeometry(1, 1, 1)

// MeshBasicMaterial：最简单的材质，不受灯光影响。
// 初学者用它最不容易「全黑看不到」。
// 以后学灯光时，会改成 MeshStandardMaterial。
const material = new THREE.MeshBasicMaterial({ color: 0x3dd6c6 })

// Mesh 把形状和外观绑在一起，才能被放进场景
const cube = new THREE.Mesh(geometry, material)
scene.add(cube) // 忘记 add = 物体存在但永远看不见

// ------------------------------------------------------------
// 6. 动画循环 —— 每一帧更新物体，再画一次
// ------------------------------------------------------------
// setAnimationLoop 会在浏览器允许时反复调用 animate。
// 参数 time 是从页面加载起经过的毫秒数。
function animate(time) {
  // 用时间驱动旋转：画面才会随时间平滑变化
  // 除以越大的数，转得越慢
  cube.rotation.x = time / 2000 // 绕 X 轴（左右翻转）
  cube.rotation.y = time / 1000 // 绕 Y 轴（水平旋转）

  // 关键：把「当前场景」用「当前相机」画出来
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ------------------------------------------------------------
// 7. 窗口尺寸变化时，相机和渲染器都要同步更新
// ------------------------------------------------------------
// 否则拉大/缩小窗口会出现画面拉伸或留黑边。
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  // 改了 aspect 之后必须调用，否则不生效
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. 把 BoxGeometry 换成 SphereGeometry(0.7, 32, 32)
 * 2. 改 material 的 color，例如 0xff8f6b
 * 3. 再创建一个 cube2，scene.add(cube2)，让它反方向转
 */
