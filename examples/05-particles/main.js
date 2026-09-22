/**
 * ============================================================
 * 05 · 粒子系统 —— 一次画出成千上万个点
 * ============================================================
 *
 * 如果为每个星星各建一个 Mesh，性能会很差。
 * 正确做法：
 *   1. 用一个很大的 Float32Array 存所有点的 x,y,z
 *   2. 塞进 BufferGeometry 的 position 属性
 *   3. 用 Points + PointsMaterial 一次画完
 *
 * 这就叫「批处理」。游戏里的雪花、火焰、星空都常用这招。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 粒子数量：越大越密，也越吃性能。先从几千开始试。
const COUNT = 4000

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050910)

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.z = 6

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true // 自动慢慢转，方便欣赏
controls.autoRotateSpeed = 0.6

// ------------------------------------------------------------
// 准备 CPU 端的数组：每个粒子占 3 个数（x, y, z）
// ------------------------------------------------------------
const positions = new Float32Array(COUNT * 3)
const colors = new Float32Array(COUNT * 3)
const color = new THREE.Color() // 复用一个 Color 对象，避免循环里 new

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3 // 第 i 个粒子在数组里的起始下标

  // —— 球壳分布：让粒子落在「空心球壳」附近，而不是挤在中心 ——
  // 球坐标：r / theta（经度）/ phi（纬度）
  const r = 1.2 + Math.random() * 2.8
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1) // 均匀球面采样的常用写法

  positions[i3] = r * Math.sin(phi) * Math.cos(theta)     // x
  positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) // y
  positions[i3 + 2] = r * Math.cos(phi)                   // z

  // 每个粒子自己的颜色（后面 PointsMaterial 要开 vertexColors）
  color.setHSL(0.45 + Math.random() * 0.2, 0.7, 0.55 + Math.random() * 0.3)
  colors[i3] = color.r
  colors[i3 + 1] = color.g
  colors[i3 + 2] = color.b
}

// ------------------------------------------------------------
// 把数组交给 GPU：BufferGeometry + BufferAttribute
// ------------------------------------------------------------
const geometry = new THREE.BufferGeometry()
// 第二个参数 3 表示「每 3 个数组成一个顶点」
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const material = new THREE.PointsMaterial({
  size: 0.035,              // 点的大小（世界单位，受透视影响）
  vertexColors: true,       // 使用上面每个顶点自己的颜色
  transparent: true,
  opacity: 0.9,
  depthWrite: false,        // 透明物体常关深度写入，减少排序瑕疵
  blending: THREE.AdditiveBlending, // 叠加混合：重叠处更亮，适合星云/火焰
  sizeAttenuation: true,    // 近大远小
})

// Points 类似 Mesh，但是画的是「点」而不是三角面
const points = new THREE.Points(geometry, material)
scene.add(points)

function animate(time) {
  const t = time * 0.00015
  points.rotation.y = t
  points.rotation.x = Math.sin(t * 0.5) * 0.15

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
 * 1. 把 COUNT 改成 20000，观察帧率变化
 * 2. 每帧修改 positions[i3+1] 并设置
 *    geometry.attributes.position.needsUpdate = true
 *    就能让粒子动起来（P6 音频可视化就是这招）
 * 3. 试着改成「只在地面附近」的萤火虫分布
 */
