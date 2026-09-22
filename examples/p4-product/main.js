/**
 * ============================================================
 * P4 · 产品展示页 —— 换材质 + 热点标注
 * ============================================================
 *
 * 电商/品牌站常见玩法：
 *   1. 中间放产品，OrbitControls 可旋转
 *   2. UI 切换颜色（改 material.color）
 *   3. 点击产品部件，旁边显示卖点文案（Raycaster + userData）
 *
 * 本例用几何体拼了一副耳机。
 * 真实项目只需把 createHeadphones() 换成 GLTFLoader 加载的模型，
 * 热点逻辑可以原样复用。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
scene.fog = new THREE.Fog(0x0b1220, 8, 18)

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100)
camera.position.set(2.8, 1.6, 3.4)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.8
controls.target.set(0, 0.6, 0)
controls.minDistance = 2
controls.maxDistance = 7
controls.maxPolarAngle = Math.PI * 0.49

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const key = new THREE.DirectionalLight(0xffffff, 1.3)
key.position.set(3, 6, 4)
key.castShadow = true
scene.add(key)

// PointLight 的 translateX/Y 会返回对象本身，所以可以链式写
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

// 三种材质：外壳（可换色）、深色耳垫、金属件
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

/** 程序化拼装耳机；每个可点击部件带 userData.hotspot 文案 */
function createHeadphones() {
  const root = new THREE.Group()

  // 头梁：半个圆环
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.07, 16, 48, Math.PI),
    shellMat,
  )
  band.rotation.z = Math.PI / 2
  band.rotation.y = Math.PI / 2
  band.position.y = 1.15
  band.castShadow = true
  root.add(band)

  // 左右耳罩
  for (const side of [-1, 1]) {
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.42, 0.28, 32),
      shellMat,
    )
    cup.rotation.z = Math.PI / 2
    cup.position.set(side * 0.85, 0.55, 0)
    cup.castShadow = true
    // ★ 热点文案挂在 userData 上，点击时读出来即可
    cup.userData.hotspot =
      side < 0 ? '左侧耳罩 · 40mm 动圈单元' : '右侧耳罩 · 触控板手势'
    root.add(cup)

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

  root.traverse((c) => {
    if (c.isMesh) c.castShadow = true
  })
  return root
}

const product = createHeadphones()
scene.add(product)

// 收集所有带热点的 Mesh，供 Raycaster 使用
const hotspots = []
product.traverse((c) => {
  if (c.userData.hotspot) hotspots.push(c)
})

const infoEl = document.getElementById('hotspotInfo')
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

function onPointer(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(hotspots, false)
  if (hits.length) {
    infoEl.textContent = hits[0].object.userData.hotspot
    // 点到热点时暂停自动转，方便阅读
    controls.autoRotate = false
  }
}

addEventListener('pointerdown', onPointer)

// 色板：只改 shellMat.color，所有用到它的耳罩/头梁一起变色
document.getElementById('swatches').addEventListener('click', (e) => {
  const btn = e.target.closest('.swatch')
  if (!btn) return
  shellMat.color.set(btn.dataset.color)
  document.querySelectorAll('.swatch').forEach((el) => {
    el.classList.toggle('is-active', el === btn)
  })
})

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 把耳机换成 Sketchfab 的 GLB
 * 2. 热点改成屏幕上跟随的 HTML 标签（进阶）
 * 3. 增加「磨砂 / 亮面」切换 roughness
 */
