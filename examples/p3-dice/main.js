/**
 * ============================================================
 * P3 · 3D 骰子 —— 旋转插值 + 缓动 + 「朝上点数」映射
 * ============================================================
 *
 * 目标：理解「随机结果」如何变成「看得见的正确朝向」。
 *
 * 难点不在「让骰子转」，而在：
 *   转完之后，哪一面朝上？点数对不对？
 *
 * 记住这一套做法：
 *   1. 给立方体 6 个面分别贴 1～6 点的 Canvas 纹理
 *   2. 事先约定：最终 rotation 取某组值时，世界 +Y 朝上对应点数 N
 *   3. 动画时从当前角度插值到「目标角度 + 多圈空翻」
 *   4. 用缓动函数（easeOut）让结尾减速，更像真实骰子落下
 *
 * 核心公式（线性插值）：
 *   当前值 = start + (end - start) * easedT
 *   其中 easedT 由 0→1 的时间进度经缓动变换而来。
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与轨道控制器
// ------------------------------------------------------------
// OrbitControls：鼠标拖拽绕目标旋转相机，方便从多角度看骰子。
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 2. 场景 / 相机 / 渲染器 —— 最小显示闭环
// ------------------------------------------------------------
const scene = new THREE.Scene()
// 深蓝黑背景，与其它示例统一视觉基调
scene.background = new THREE.Color(0x0b1220)

// fov=45 比 Hello Cube 的 75 更「长焦」，物体显得更稳、更产品感
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100)
// 斜上方观察，才能同时看到顶面点数与侧面
camera.position.set(3.5, 3, 4.5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
// 像素比上限 2，避免超高清屏过度消耗 GPU
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
// 开启阴影：骰子投射、地面接收，空间感更强
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. 轨道控制 —— 看清「哪一面朝上」
// ------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)
// 阻尼：松手后相机还会轻轻滑一会儿，手感更自然
controls.enableDamping = true
// 观察目标略抬高，对准骰子中心而不是地面原点
controls.target.set(0, 0.5, 0)

// ------------------------------------------------------------
// 4. 灯光与地面 —— StandardMaterial 需要光才看得见
// ------------------------------------------------------------
// 环境光：整体提亮，避免暗部死黑
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const light = new THREE.DirectionalLight(0xffffff, 1.2)
light.position.set(4, 8, 5)
light.castShadow = true
scene.add(light)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
// 平面默认朝 +Z，转到水平才能当地板
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ------------------------------------------------------------
// 5. Canvas 画点数 → CanvasTexture
// ------------------------------------------------------------
/**
 * 用浏览器 Canvas 2D API「画」出骰子点数，再转成 Three.js 纹理。
 * 这样不需要准备 6 张图片文件，对初学者非常友好。
 *
 * 流程：createElement('canvas') → 2D 绘制 → new CanvasTexture(canvas)
 */
function faceTexture(n) {
  const size = 256
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')

  // 白底：模拟骰子实体面
  ctx.fillStyle = '#f4f6fb'
  ctx.fillRect(0, 0, size, size)
  // 浅灰边框：让相邻面交界处更易辨认
  ctx.strokeStyle = '#c5cddf'
  ctx.lineWidth = 8
  ctx.strokeRect(4, 4, size - 8, size - 8)

  // 每个点数对应的圆点相对坐标（0~1），再乘 size 变成像素坐标
  const dots = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [
      [0.28, 0.25], [0.72, 0.25],
      [0.28, 0.5], [0.72, 0.5],
      [0.28, 0.75], [0.72, 0.75],
    ],
  }

  ctx.fillStyle = '#1a2235'
  for (const [x, y] of dots[n]) {
    ctx.beginPath()
    // 半径约 8% 画布边长，点不会太大也不会挤在一起
    ctx.arc(x * size, y * size, size * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(c)
  // r152+ 彩色贴图建议声明为 sRGB，颜色才正确（否则偏灰/偏暗）
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ------------------------------------------------------------
// 6. 「点数 → 旋转角」映射表（本课最关键难点）
// ------------------------------------------------------------
/**
 * BoxGeometry 六个面的材质顺序固定为：
 *   0:+X  1:-X  2:+Y  3:-Y  4:+Z  5:-Z
 *
 * 我们约定：「结果点数」= 最终朝上（世界坐标 +Y）的那一面。
 * faceUp[n] 保存：当 n 朝上时，骰子 rotation.x / rotation.z 应取的值。
 *
 * 为什么只动 x 和 z？
 *   绕世界 Y 转一整圈点数不变；用 x/z 就能把任意一面翻到顶上。
 * 为什么要事先写死表？
 *   运行时再「算哪面朝上」更复杂；教学上先建立「目标姿态」直觉。
 */
const faceUp = {
  1: { x: 0, z: 0 },                 // 本地 +Y（点数 1）朝上
  2: { x: -Math.PI / 2, z: 0 },      // 把 +Z 翻到顶
  3: { x: 0, z: Math.PI / 2 },       // 把 +X 翻到顶
  4: { x: 0, z: -Math.PI / 2 },      // 把 -X 翻到顶
  5: { x: Math.PI / 2, z: 0 },       // 把 -Z 翻到顶
  6: { x: Math.PI, z: 0 },           // 把 -Y 翻到顶（翻个面）
}

// 材质数组下标必须与 BoxGeometry 面顺序一一对应
const materials = [
  new THREE.MeshStandardMaterial({ map: faceTexture(3), roughness: 0.45 }), // +X → 3
  new THREE.MeshStandardMaterial({ map: faceTexture(4), roughness: 0.45 }), // -X → 4
  new THREE.MeshStandardMaterial({ map: faceTexture(1), roughness: 0.45 }), // +Y → 1
  new THREE.MeshStandardMaterial({ map: faceTexture(6), roughness: 0.45 }), // -Y → 6
  new THREE.MeshStandardMaterial({ map: faceTexture(2), roughness: 0.45 }), // +Z → 2
  new THREE.MeshStandardMaterial({ map: faceTexture(5), roughness: 0.45 }), // -Z → 5
]

const dice = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), materials)
dice.position.y = 0.7 // 略抬离地面，避免 Z-fighting
dice.castShadow = true
scene.add(dice)

// ------------------------------------------------------------
// 7. UI 与掷骰状态
// ------------------------------------------------------------
const resultEl = document.getElementById('result')
const rollBtn = document.getElementById('rollBtn')

/** 正在播放的动画状态；null 表示空闲可再掷 */
let anim = null

/**
 * 缓出三次方：开始快、结束慢，适合「停下」的手感。
 * t 输入范围 [0,1]，输出仍在 [0,1]。
 * 对比线性：同样时间进度下，结尾段变化更小 → 视觉上减速。
 */
function easeOutCubic(t) {
  return 1 - (1 - t) ** 3
}

// ------------------------------------------------------------
// 8. 掷一次：随机点数 + 记录插值起终点
// ------------------------------------------------------------
function roll() {
  if (anim) return // 动画中忽略重复点击，避免状态错乱

  // 随机 1～6（floor 后加 1，不会出现 0 或 7）
  const value = 1 + Math.floor(Math.random() * 6)
  resultEl.textContent = '滚动中…'
  rollBtn.disabled = true

  // 额外空翻几圈，看起来更「掷」而不是「瞬间翻面」
  // spins * 2π 加到目标角上：视觉多转，最终朝向仍等价于 target
  const spins = 4 + Math.floor(Math.random() * 3)
  const target = faceUp[value]

  const startX = dice.rotation.x
  const startZ = dice.rotation.z
  // 终点 = 目标朝向 + 整数圈（2π 的倍数）
  const endX = target.x + spins * Math.PI * 2
  const endZ = target.z + spins * Math.PI * 2
  const startY = dice.position.y
  const duration = 1400 // 毫秒：整段掷骰时长
  const t0 = performance.now()

  // 把本帧之后 animate 需要的数据打包进 anim
  anim = { value, startX, startZ, endX, endZ, startY, duration, t0 }
}

rollBtn.addEventListener('click', roll)

// ------------------------------------------------------------
// 9. 动画循环：缓动插值旋转 + 抛物线轻跳
// ------------------------------------------------------------
function animate(now) {
  if (anim) {
    // t: 0 → 1 的线性时间进度（超过 duration 就钳在 1）
    const t = Math.min(1, (now - anim.t0) / anim.duration)
    // e: 缓动后的进度，用来驱动「看起来」的运动
    const e = easeOutCubic(t)

    // 线性插值公式：start + (end - start) * e
    dice.rotation.x = anim.startX + (anim.endX - anim.startX) * e
    dice.rotation.z = anim.startZ + (anim.endZ - anim.startZ) * e
    // 用 sin(πt) 做抛物线轻跳：t=0/1 时高度为 0，中间最高
    dice.position.y = anim.startY + Math.sin(t * Math.PI) * 1.2

    if (t >= 1) {
      // 收敛到精确目标角，避免浮点误差导致「差一点没对准」
      // （多圈 2π 在数学上等价，但显示/后续再掷时用规范角更稳）
      dice.rotation.x = faceUp[anim.value].x
      dice.rotation.z = faceUp[anim.value].z
      dice.position.y = anim.startY
      resultEl.textContent = `点数：${anim.value}`
      rollBtn.disabled = false
      anim = null
    }
  }

  // 有阻尼就必须每帧 update，否则惯性滑动不生效
  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ------------------------------------------------------------
// 10. 窗口尺寸变化
// ------------------------------------------------------------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 改 duration / spins，感受「转得久 vs 转得花」对可信度的影响
 * 2. 把 easeOutCubic 换成 easeOutBack，做出「回弹一下再停」的效果
 * 3. 同时掷两颗骰子，各自独立 anim，界面显示点数之和
 * 4. （进阶）动画结束后用 Raycaster / 面法线验证「朝上的面」是否真是 value
 */
