/**
 * ============================================================
 * P7 · 跑酷小游戏 —— 状态机 + 碰撞 + InstancedMesh
 * ============================================================
 *
 * 游戏最小骨架：
 *   state = 'ready' | 'playing' | 'over'
 *   不同状态下，键盘/更新逻辑不一样。
 *
 * 玩法：
 *   - 角色自动沿 -Z 前进
 *   - ←→ / A D 在三车道间切换
 *   - 撞到红色障碍 = 结束
 *   - 接到金色硬币 = 加分
 *
 * InstancedMesh：
 *   很多长相一样的障碍/硬币，不要每个都 new Mesh。
 *   用一份几何体 + 一份材质，画出 N 个「实例」，性能更好。
 */

import * as THREE from 'three'

const LANES = [-2, 0, 2] // 左 / 中 / 右 三条跑道的 x 坐标

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// 注意：障碍生成在玩家前方约 28 单位；雾的 far 要比「相机到障碍的距离」更大，
// 否则物体还在视野里就被雾完全融进背景，看起来像「没渲染」。
scene.fog = new THREE.Fog(0x0b1220, 20, 70)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120)
camera.position.set(0, 5, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const light = new THREE.DirectionalLight(0xffffff, 1.1)
light.position.set(2, 10, 5)
scene.add(light)

// 地面 / 护栏：用 Group，每帧跟随玩家 z，实现「无限跑道」错觉
const track = new THREE.Group()
scene.add(track)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 120),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
track.add(ground)

for (const x of [-3.5, 3.5]) {
  const rail = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.4, 120),
    new THREE.MeshStandardMaterial({
      color: 0x3dd6c6,
      emissive: 0x3dd6c6,
      emissiveIntensity: 0.2,
    }),
  )
  rail.position.set(x, 0.2, 0)
  track.add(rail)
}

// 玩家：一个小方块（可换成角色模型）
const player = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x6ea8ff, metalness: 0.3, roughness: 0.4 }),
)
player.position.set(0, 0.4, 0)
scene.add(player)

const MAX_OBS = 20
const obsMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ color: 0xff6b6b }),
  MAX_OBS, // 最多同时存在的障碍实例数
)
// ★ 关键：InstancedMesh 默认按「几何体在原点的包围球」做视锥剔除。
// 实例其实被摆到很远的 -Z，但包围球还在原点 → 跑一段后相机离开原点，
// 整份 InstancedMesh 会被误判为「不在视野」而全部不画。
obsMesh.frustumCulled = false
scene.add(obsMesh)

const MAX_COINS = 30
const coinMesh = new THREE.InstancedMesh(
  new THREE.CylinderGeometry(0.3, 0.3, 0.08, 16),
  new THREE.MeshStandardMaterial({ color: 0xffd166, metalness: 0.7, roughness: 0.3 }),
  MAX_COINS,
)
coinMesh.frustumCulled = false
scene.add(coinMesh)

// InstancedMesh 通过「矩阵」设置每个实例的位置/旋转/缩放
const dummy = new THREE.Object3D()
const obstacles = [] // { x, z }
const coins = [] // { x, z }

let state = 'ready'
let lane = 1 // 0/1/2 → 对应 LANES
let targetX = 0 // 平滑移动的目标 x
let speed = 12
let distance = 0
let score = 0
let coinCount = 0
let spawnTimer = 0
let prev = performance.now()

const scoreEl = document.getElementById('score')
const coinsEl = document.getElementById('coins')
const overlay = document.getElementById('overlay')
const overlayTitle = document.getElementById('overlayTitle')
const overlayMsg = document.getElementById('overlayMsg')
const startBtn = document.getElementById('startBtn')

function resetGame() {
  lane = 1
  targetX = LANES[lane]
  player.position.set(0, 0.4, 0)
  speed = 12
  distance = 0
  score = 0
  coinCount = 0
  spawnTimer = 0
  obstacles.length = 0
  coins.length = 0
  scoreEl.textContent = '0'
  coinsEl.textContent = '0'
  syncInstances()
}

/**
 * 把逻辑数组 obstacles/coins 同步到 InstancedMesh。
 * 多余的实例缩放到 0 并藏到地下，等于「隐藏」。
 *
 * 注意：dummy 会被障碍和金币轮流复用，
 * 每次写矩阵前都要重置 rotation，避免把硬币的旋转「污染」到障碍上。
 */
function syncInstances(timeMs = 0) {
  for (let i = 0; i < MAX_OBS; i++) {
    if (i < obstacles.length) {
      const o = obstacles[i]
      dummy.position.set(o.x, 0.6, o.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
    } else {
      dummy.position.set(0, -20, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(0, 0, 0)
    }
    dummy.updateMatrix()
    obsMesh.setMatrixAt(i, dummy.matrix)
  }
  obsMesh.instanceMatrix.needsUpdate = true
  // 告诉 Three.js 实际要画几个实例（可选，但更明确）
  obsMesh.count = MAX_OBS

  for (let i = 0; i < MAX_COINS; i++) {
    if (i < coins.length) {
      const c = coins[i]
      dummy.position.set(c.x, 0.6, c.z)
      // 圆柱默认「立着」；先绕 X 躺倒成硬币，再绕 Z 自旋
      dummy.rotation.set(Math.PI / 2, 0, timeMs * 0.005)
      dummy.scale.set(1, 1, 1)
    } else {
      dummy.position.set(0, -20, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(0, 0, 0)
    }
    dummy.updateMatrix()
    coinMesh.setMatrixAt(i, dummy.matrix)
  }
  coinMesh.instanceMatrix.needsUpdate = true
  coinMesh.count = MAX_COINS
}

/** 在玩家前方随机生成障碍或硬币（距离要落在雾效可见范围内） */
function spawn() {
  const laneIdx = Math.floor(Math.random() * 3)
  // 生成在玩家前方 22～30 单位：既能看见，又留得出反应时间
  const z = player.position.z - 22 - Math.random() * 8
  if (Math.random() < 0.5) {
    if (obstacles.length < MAX_OBS) {
      obstacles.push({ x: LANES[laneIdx], z })
    }
  } else if (coins.length < MAX_COINS) {
    coins.push({ x: LANES[laneIdx], z })
  }
}

/** 开局先铺几排，避免「跑了很久才看到第一个」 */
function seedAhead() {
  for (let row = 0; row < 6; row++) {
    const z = player.position.z - 16 - row * 6
    const laneIdx = Math.floor(Math.random() * 3)
    if (row % 2 === 0) {
      obstacles.push({ x: LANES[laneIdx], z })
    } else {
      coins.push({ x: LANES[laneIdx], z })
    }
  }
}

function startGame() {
  resetGame()
  seedAhead()
  syncInstances()
  state = 'playing'
  overlay.classList.remove('show')
}

// 启动时先把所有实例藏起来，避免默认矩阵堆在原点闪一下
syncInstances()

function gameOver() {
  state = 'over'
  overlayTitle.textContent = '游戏结束'
  overlayMsg.textContent = `分数 ${score} · 金币 ${coinCount}`
  startBtn.textContent = '再来一局'
  overlay.classList.add('show')
}

startBtn.addEventListener('click', startGame)

addEventListener('keydown', (e) => {
  if (state !== 'playing') return
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') lane = Math.max(0, lane - 1)
  if (e.code === 'ArrowRight' || e.code === 'KeyD') lane = Math.min(2, lane + 1)
  targetX = LANES[lane]
})

function animate(now) {
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (state === 'playing') {
    // 横向平滑插值换道（不是瞬移）
    player.position.x += (targetX - player.position.x) * Math.min(1, 14 * dt)
    // 自动前进（朝 -Z）
    player.position.z -= speed * dt
    distance += speed * dt
    score = Math.floor(distance)
    scoreEl.textContent = String(score)
    // 越跑越快
    speed = 12 + distance * 0.02

    // 跑道跟着玩家走，看起来地面无限长
    track.position.z = player.position.z - 40

    // 相机跟随玩家
    camera.position.x += (player.position.x - camera.position.x) * 0.1
    camera.position.y = 5
    camera.position.z = player.position.z + 8
    camera.lookAt(player.position.x, 1, player.position.z - 4)

    // 定时刷怪
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawn()
      spawnTimer = Math.max(0.4, 0.85 - distance * 0.002)
    }

    // 障碍：出视野删除；靠近则判定碰撞（轴对齐粗检测）
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i]
      if (o.z > player.position.z + 4) {
        obstacles.splice(i, 1)
        continue
      }
      if (
        Math.abs(o.x - player.position.x) < 0.9 &&
        Math.abs(o.z - player.position.z) < 0.9
      ) {
        gameOver()
      }
    }

    // 硬币：碰到就加分并移除
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i]
      if (c.z > player.position.z + 4) {
        coins.splice(i, 1)
        continue
      }
      if (
        Math.abs(c.x - player.position.x) < 0.8 &&
        Math.abs(c.z - player.position.z) < 0.8
      ) {
        coins.splice(i, 1)
        coinCount++
        coinsEl.textContent = String(coinCount)
      }
    }

    syncInstances(now)
  }

  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

/**
 * 【练习建议】
 * 1. 加「跳跃」躲障碍（空格改 y + 重力）
 * 2. 障碍换成不同形状（用多个 InstancedMesh）
 * 3. 本地存储最高分 localStorage
 */
