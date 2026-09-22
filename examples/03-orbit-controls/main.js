/**
 * ============================================================
 * 03 · OrbitControls —— 用鼠标「环绕」观察场景
 * ============================================================
 *
 * OrbitControls 不是 three 核心包自带的，它在「官方附加模块」里：
 *   three/addons/controls/OrbitControls.js
 *
 * 常见操作：
 *   左键拖拽 = 旋转视角
 *   滚轮     = 缩放
 *   右键拖拽 = 平移
 *
 * 特别注意：
 *   如果开启了 enableDamping（惯性），每一帧都要 controls.update()
 *   否则拖拽会感觉「没反应」或卡顿。
 */

import * as THREE from 'three'
// 从 addons 引入控制器（路径写对很重要）
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// Fog：距离雾。靠近相机颜色正常，远处逐渐融进雾色。
// 参数：(颜色, 开始有雾的距离, 完全被雾挡住的距离)
scene.fog = new THREE.Fog(0x0b1220, 8, 22)

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(4, 3, 6)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

// ============================================================
// 创建轨道控制器：把「相机」和「画布 DOM」交给它管理
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement)

// 阻尼 = 松手后还会滑一点点，手感更自然
controls.enableDamping = true
controls.dampingFactor = 0.05 // 越大停得越快

// target：旋转时的「绕着哪个点转」（默认是原点）
controls.target.set(0, 0.5, 0)

// 可选限制（产品展示页常用）：
// controls.minDistance = 2
// controls.maxDistance = 10
// controls.maxPolarAngle = Math.PI / 2  // 不能翻到地面以下

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 8, 3)
scene.add(light)

// GridHelper：地面网格，方便感知远近和比例（调试神器）
// 参数：(尺寸, 分段数, 中心线颜色, 网格线颜色)
const grid = new THREE.GridHelper(16, 16, 0x3dd6c6, 0x1e2a40)
scene.add(grid)

// ============================================================
// Group：把多个物体当成「一个整体」移动/旋转
// ============================================================
// 旋转 group 时，里面的所有孩子会一起转（绕 group 原点）
const group = new THREE.Group()
scene.add(group)

for (let i = 0; i < 12; i++) {
  const mesh = new THREE.Mesh(
    // IcosahedronGeometry：二十面体，detail=0 就是最粗糙的多面体
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({
      // setHSL(色相0~1, 饱和度, 亮度) —— 用循环做彩虹色很方便
      color: new THREE.Color().setHSL(i / 12, 0.65, 0.55),
      roughness: 0.35,
      metalness: 0.25,
    }),
  )

  // 把 12 个物体均匀摆在圆周上
  const angle = (i / 12) * Math.PI * 2 // 0 ~ 2π
  mesh.position.set(
    Math.cos(angle) * 2.2, // x
    0.5,                   // y 稍微抬高，别埋进网格
    Math.sin(angle) * 2.2, // z
  )
  group.add(mesh) // 注意：加到 group，不是直接加到 scene
}

function animate(time) {
  // 整圈缓慢慢慢自转
  group.rotation.y = time * 0.00025

  // ★ 开了 damping 就必须每帧 update
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
 * 1. controls.autoRotate = true，再调 autoRotateSpeed
 * 2. 设置 minDistance / maxDistance，限制缩放范围
 * 3. 把 GridHelper 换成 AxesHelper(2)，观察 XYZ 轴向
 */
