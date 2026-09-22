/**
 * ============================================================
 * P8 · 3D 数据可视化 —— 数字变成高度
 * ============================================================
 *
 * 数据可视化的本质就一句话：
 *   把「抽象数值」映射成「看得见的视觉通道」
 *   这里用的通道是：柱子高度
 *
 * 公式：
 *   height = (value / maxValue) * maxHeight
 *
 * 再配合：
 *   - Raycaster 悬停显示 Tooltip
 *   - 按钮切换另一套 JSON 数据
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/** 两套示例数据（单位：人口=万，评分=分） */
const DATASETS = {
  population: [
    { name: '上海', value: 2487 },
    { name: '北京', value: 2188 },
    { name: '深圳', value: 1768 },
    { name: '广州', value: 1881 },
    { name: '成都', value: 2126 },
    { name: '杭州', value: 1237 },
    { name: '重庆', value: 3213 },
    { name: '武汉', value: 1373 },
  ],
  score: [
    { name: '设计', value: 92 },
    { name: '性能', value: 88 },
    { name: '续航', value: 76 },
    { name: '音质', value: 95 },
    { name: '便携', value: 84 },
    { name: '价格', value: 70 },
    { name: '生态', value: 81 },
    { name: '售后', value: 78 },
  ],
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
scene.fog = new THREE.Fog(0x0b1220, 18, 40)

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
camera.position.set(10, 12, 16)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 2, 0)

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.1)
dir.position.set(5, 12, 8)
scene.add(dir)

scene.add(new THREE.GridHelper(20, 20, 0x2a3a55, 0x1a2438))

const barsGroup = new THREE.Group()
scene.add(barsGroup)
const pickables = [] // 只有柱子可悬停，标签平面不参与
const tooltip = document.getElementById('tooltip')

/** 切换数据集前，清掉旧柱子并释放 GPU 资源 */
function clearBars() {
  while (barsGroup.children.length) {
    const c = barsGroup.children.pop()
    c.geometry?.dispose()
    c.material?.dispose()
  }
  pickables.length = 0
}

function buildBars(key) {
  clearBars()
  const data = DATASETS[key]
  const max = Math.max(...data.map((d) => d.value))
  const gap = 1.6 // 柱子间距
  const offset = ((data.length - 1) * gap) / 2 // 让整组居中

  data.forEach((d, i) => {
    // 映射：最小也给 0.2，避免值为 0 时完全看不见
    const h = (d.value / max) * 8 + 0.2
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.45 + (i / data.length) * 0.2, 0.65, 0.5),
      metalness: 0.2,
      roughness: 0.4,
      emissive: new THREE.Color(0x000000), // 预留，悬停时会改
    })

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), mat)
    // Box 默认中心在几何中心，所以 y = h/2 才能让底边贴地
    mesh.position.set(i * gap - offset, h / 2, 0)
    mesh.userData = {
      label: `${d.name}：${d.value}${key === 'population' ? ' 万' : ' 分'}`,
    }
    barsGroup.add(mesh)
    pickables.push(mesh)

    // 地面标签：Canvas 文字 → 纹理 → 小平面
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = '#c9d4ee'
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(d.name, 128, 40)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.35),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
    )
    label.position.set(mesh.position.x, 0.05, 1.1)
    label.rotation.x = -Math.PI / 2
    barsGroup.add(label)
  })
}

buildBars('population')

document.querySelectorAll('[data-set]').forEach((btn) => {
  btn.addEventListener('click', () => {
    buildBars(btn.dataset.set)
    // 简单切换按钮样式：当前实心，其它 ghost
    document.querySelectorAll('[data-set]').forEach((b) => {
      b.classList.toggle('ghost', b !== btn)
    })
  })
})

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let hovered = null

addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / innerWidth) * 2 - 1
  pointer.y = -(e.clientY / innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(pickables, false)

  // 离开旧柱子时取消高亮
  if (hovered && hovered !== hits[0]?.object) {
    hovered.material.emissive.setHex(0x000000)
  }

  if (hits.length) {
    hovered = hits[0].object
    hovered.material.emissive.setHex(0x224444) // 微微发光表示悬停
    tooltip.style.display = 'block'
    tooltip.style.left = `${e.clientX + 12}px`
    tooltip.style.top = `${e.clientY + 12}px`
    tooltip.textContent = hovered.userData.label
  } else {
    if (hovered) hovered.material.emissive.setHex(0x000000)
    hovered = null
    tooltip.style.display = 'none'
  }
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
 * 1. fetch('/data.json') 读真实接口数据
 * 2. 柱子生长做成动画（从 0 插值到目标高度）
 * 3. 改成圆环排布 / 地球标注点
 */
