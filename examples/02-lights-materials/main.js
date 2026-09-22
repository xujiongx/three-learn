/**
 * ============================================================
 * 02 · 灯光与材质 —— 为什么换了 Standard 材质场景会变黑？
 * ============================================================
 *
 * 目标：弄清「材质」和「灯光」的搭档关系，并第一次正确打开阴影。
 *
 * 和上一课（01 Hello Cube）的关系：
 *   01 用的是 MeshBasicMaterial —— 不受光，自己发光一样能看见。
 *   本课改用 MeshStandardMaterial（PBR 物理材质）—— 必须有灯光，
 *   否则几乎全黑。很多人第一次换材质就踩这个坑。
 *
 * 记住这一句话：
 *   Basic 材质 = 不需要灯也能看见
 *   Standard 材质 = 没有灯 ≈ 全黑；有灯才显出金属/塑料手感
 *
 * 核心知识点：
 * 1. MeshBasicMaterial 不受光；MeshStandardMaterial 必须有灯光
 * 2. 阴影需要「渲染器开阴影 + 灯光能投影 + 物体能投射/接收」三件套
 * 3. metalness（金属度）和 roughness（粗糙度）是 Standard 材质的灵魂：
 *      metalness: 0 = 塑料/木头感，1 = 金属感
 *      roughness: 0 = 镜面光滑，1 = 粗糙哑光
 */

// ------------------------------------------------------------
// 1. 引入 Three.js
// ------------------------------------------------------------
import * as THREE from 'three'

// ------------------------------------------------------------
// 2. 场景 / 相机 / 渲染器（和 01 相同的三大件）
// ------------------------------------------------------------
const scene = new THREE.Scene()
// 背景色沿用 01 的深蓝黑，方便前后课对比
scene.background = new THREE.Color(0x0b1220)

// fov 用 60（比 01 的 75 稍小）：透视没那么夸张，更适合「静物展示」
const camera = new THREE.PerspectiveCamera(
  60, // 视野稍小一点，透视没那么夸张
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// set(x, y, z) 一次性设置位置 —— 比分别写 .x/.y/.z 更清晰
// 斜上方看过去，才能同时看到物体侧面和地面上的影子
camera.position.set(3, 2.2, 5)
// lookAt：让相机朝向某个点（这里是世界原点）
// 01 只挪了 z，默认朝 -Z 也能看到方块；本课相机不在轴线上，必须 lookAt
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// ★ 想看见阴影，渲染器必须先打开影子开关
// 常见坑：只给灯/物体设了 castShadow，却忘了这一行 → 永远没有影子
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. 灯光：至少准备「环境光 + 一盏主光」
// ------------------------------------------------------------
// 经验法则：Standard 材质场景 ≈ AmbientLight（填暗部）+ 主光（塑形）
// 只有主光 → 暗部死黑；只有环境光 → 没有明暗立体感

// AmbientLight：均匀照亮所有地方，没有方向，也不会产生阴影。
// 作用像「房间里的漫反射底光」，避免暗部死黑。
// 参数：(颜色, 强度 intensity)。强度别太大，否则场景会「发灰」。
const ambient = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambient)

// DirectionalLight：平行光，类似太阳——光线方向一致。
// 很适合做主光源（key light）。位置决定「光从哪边打来」。
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1)
dirLight.position.set(4, 6, 2) // 光从右上方打下来
dirLight.castShadow = true // 这盏灯允许投射阴影（环境光做不到）
scene.add(dirLight)

// PointLight：点光源，像灯泡，向四周发光。
// 参数：(颜色, 强度, 影响距离 distance)
// distance = 20 表示超过约 20 个单位后几乎照不到 —— 可用来控制「局部补光」
const point = new THREE.PointLight(0x6ea8ff, 2, 20)
point.position.set(-2, 1.5, 2)
scene.add(point)

// ------------------------------------------------------------
// 4. 地面：负责「接住」阴影
// ------------------------------------------------------------
const ground = new THREE.Mesh(
  // PlaneGeometry 默认朝 +Z（竖着立在面前），要当地面必须旋转
  new THREE.PlaneGeometry(12, 12),
  // roughness 偏高 → 地面偏哑光，不会抢物体的高光
  new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.9 }),
)
// 绕 X 轴转 -90°（-Math.PI/2），让平面的法线朝上，变成水平地面
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true // ★ 地面接收阴影；只 cast 不 receive 也看不到影子
scene.add(ground)

// ------------------------------------------------------------
// 5. 几个不同「手感」的物体，对比 metalness / roughness
// ------------------------------------------------------------
// 同一盏灯下，改这两个参数就能从「塑料」变到「金属」——本课重点观察点

// 球体：偏塑料光滑（metalness 低、roughness 也不高）
const sphere = new THREE.Mesh(
  // SphereGeometry(半径, 水平分段, 垂直分段)
  // 分段越多越圆滑，面数也越多（48×48 对演示够用）
  new THREE.SphereGeometry(0.7, 48, 48),
  new THREE.MeshStandardMaterial({
    color: 0x3dd6c6,
    metalness: 0.2,
    roughness: 0.25,
  }),
)
// y = 半径 0.7，让球刚好「坐」在地面上（球心抬高一个半径）
sphere.position.set(-1.6, 0.7, 0)
sphere.castShadow = true // ★ 物体投射阴影
scene.add(sphere)

// 方块：偏金属（metalness 更高）
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1.1, 1.1, 1.1),
  new THREE.MeshStandardMaterial({
    color: 0x6ea8ff,
    metalness: 0.6,
    roughness: 0.35,
  }),
)
box.position.set(0.4, 0.55, 0.4)
box.castShadow = true
scene.add(box)

// 扭结环：更「亮闪闪」的金属（metalness 高 + roughness 低）
const torus = new THREE.Mesh(
  // TorusKnotGeometry(半径, 管道半径, 管段数, 径向段数)
  // 段数多一点，曲面高光才好看
  new THREE.TorusKnotGeometry(0.45, 0.15, 128, 24),
  new THREE.MeshStandardMaterial({
    color: 0xff8f6b,
    metalness: 0.8,
    roughness: 0.2,
  }),
)
torus.position.set(1.8, 0.9, -0.4)
torus.castShadow = true
scene.add(torus)

// ------------------------------------------------------------
// 6. 动画循环 —— 让光影随物体运动变化，方便观察
// ------------------------------------------------------------
function animate(time) {
  // time 是毫秒，乘 0.001 变成秒，三角函数更好用
  const t = time * 0.001

  // 球体上下轻微浮动（在半径高度附近抖一点）
  sphere.position.y = 0.7 + Math.sin(t) * 0.15
  // 方块、扭结环自转 —— 转起来时高光/阴影会跟着走，更容易看出材质差异
  box.rotation.y = t * 0.6
  torus.rotation.x = t * 0.5
  torus.rotation.y = t * 0.8

  // 和 01 一样：每帧把场景画出来
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ------------------------------------------------------------
// 7. 窗口尺寸变化时，相机和渲染器都要同步更新
// ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  // 改了 aspect 之后必须调用，否则不生效
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. 注释掉 AmbientLight，只留平行光，观察明暗对比（暗部会更死黑）
 * 2. 把某个物体的 metalness、roughness 改成 0 和 1，感受材质两极
 * 3. 把 DirectionalLight 换成 SpotLight，看聚光灯的锥形光斑
 * 4. 故意关掉 renderer.shadowMap.enabled，确认「影子三件套」缺一不可
 * 5. 下一课会加上 OrbitControls，你可以绕着这些材质转一圈细看高光
 */
