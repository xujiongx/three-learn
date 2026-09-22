/**
 * ============================================================
 * 02 · 灯光与材质 —— 为什么换了 Standard 材质场景会变黑？
 * ============================================================
 *
 * 核心知识点：
 * 1. MeshBasicMaterial 不受光，自己发光一样能看见
 * 2. MeshStandardMaterial（PBR）必须有灯光，否则几乎全黑
 * 3. 阴影需要「渲染器开阴影 + 灯光能投影 + 物体能投射/接收」
 *
 * metalness（金属度）和 roughness（粗糙度）是 Standard 材质的灵魂：
 *   metalness: 0 = 塑料/木头感，1 = 金属感
 *   roughness: 0 = 镜面光滑，1 = 粗糙哑光
 */

import * as THREE from 'three'

// ——— 场景 / 相机 / 渲染器（和 01 相同的三大件）———
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)

const camera = new THREE.PerspectiveCamera(
  60, // 视野稍小一点，透视没那么夸张
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
// set(x, y, z) 一次性设置位置
camera.position.set(3, 2.2, 5)
// lookAt：让相机朝向某个点（这里是世界原点）
camera.lookAt(0, 0, 0)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// ★ 想看见阴影，渲染器必须先打开影子开关
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ============================================================
// 灯光：至少准备「环境光 + 一盏主光」
// ============================================================

// AmbientLight：均匀照亮所有地方，没有方向，也不会产生阴影。
// 作用像「房间里的漫反射底光」，避免暗部死黑。
// 第二个参数是强度 intensity。
const ambient = new THREE.AmbientLight(0xffffff, 0.35)
scene.add(ambient)

// DirectionalLight：平行光，类似太阳——光线方向一致。
// 很适合做主光源（key light）。
const dirLight = new THREE.DirectionalLight(0xffffff, 1.1)
dirLight.position.set(4, 6, 2) // 光从右上方打下来
dirLight.castShadow = true // 这盏灯允许投射阴影
scene.add(dirLight)

// PointLight：点光源，像灯泡，向四周发光。
// 参数：(颜色, 强度, 影响距离 distance)
const point = new THREE.PointLight(0x6ea8ff, 2, 20)
point.position.set(-2, 1.5, 2)
scene.add(point)

// ============================================================
// 地面：负责「接住」阴影
// ============================================================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 12), // 平面默认朝 +Z，要躺平需要旋转
  new THREE.MeshStandardMaterial({ color: 0x1a2438, roughness: 0.9 }),
)
// 绕 X 轴转 -90°，让平面的法线朝上，变成地面
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true // ★ 地面接收阴影
scene.add(ground)

// ============================================================
// 几个不同「手感」的物体，对比 metalness / roughness
// ============================================================

// 球体：偏塑料光滑
const sphere = new THREE.Mesh(
  // SphereGeometry(半径, 水平分段, 垂直分段)
  // 分段越多越圆滑，面数也越多
  new THREE.SphereGeometry(0.7, 48, 48),
  new THREE.MeshStandardMaterial({
    color: 0x3dd6c6,
    metalness: 0.2,
    roughness: 0.25,
  }),
)
sphere.position.set(-1.6, 0.7, 0)
sphere.castShadow = true // ★ 物体投射阴影
scene.add(sphere)

// 方块：偏金属
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

// 扭结环：更「亮闪闪」的金属
const torus = new THREE.Mesh(
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

// ============================================================
// 动画：让场景「活」一点，方便观察光影变化
// ============================================================
function animate(time) {
  // time 是毫秒，乘 0.001 变成秒，三角函数更好用
  const t = time * 0.001

  // 球体上下轻微浮动
  sphere.position.y = 0.7 + Math.sin(t) * 0.15
  // 方块、扭结环自转
  box.rotation.y = t * 0.6
  torus.rotation.x = t * 0.5
  torus.rotation.y = t * 0.8

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
 * 1. 注释掉 AmbientLight，只留平行光，观察明暗对比
 * 2. 把 metalness、roughness 改成 0 和 1，感受材质差异
 * 3. 把 DirectionalLight 换成 SpotLight，看聚光灯效果
 */
