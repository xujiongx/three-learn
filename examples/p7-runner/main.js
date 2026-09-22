/**
 * ============================================================
 * P7 · 跑酷小游戏 —— 状态机 + 碰撞 + InstancedMesh
 * ============================================================
 *
 * 目标：理解「游戏循环」比「单纯转方块」多了什么。
 *
 * 游戏最小骨架：
 *   state = 'ready' | 'playing' | 'over'
 *   不同状态下，键盘/更新逻辑不一样。
 *   （状态机：避免「结束了还能换道」「没开始就刷怪」这类 bug）
 *
 * 玩法：
 *   - 角色自动沿 -Z 前进
 *   - ←→ / A D 在三车道间切换
 *   - 撞到红色障碍 = 结束
 *   - 接到金色硬币 = 加分
 *
 * InstancedMesh（本课性能重点）：
 *   很多长相一样的障碍/硬币，不要每个都 new Mesh。
 *   用一份几何体 + 一份材质，画出 N 个「实例」，GPU 一次提交更省。
 *   每个实例用 4×4 矩阵描述位置/旋转/缩放。
 *
 * ★ frustumCulled 陷阱见下方障碍创建处——跑酷场景几乎必踩。
 */

// ------------------------------------------------------------
// 1. 引入与场景基础
// ------------------------------------------------------------
import * as THREE from 'three'

const LANES = [-2, 0, 2] // 左 / 中 / 右 三条跑道的 x 坐标

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
// 注意：障碍生成在玩家前方约 28 单位；雾的 far 要比「相机到障碍的距离」更大，
// 否则物体还在视野里就被雾完全融进背景，看起来像「没渲染」。
scene.fog = new THREE.Fog(0x0b1220, 20, 70)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 120)
// 初始在玩家斜后方；真正游玩时会在 animate 里跟随
camera.position.set(0, 5, 8)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

scene.add(new THREE.AmbientLight(0xffffff, 0.5))
const light = new THREE.DirectionalLight(0xffffff, 1.1)
light.position.set(2, 10, 5)
scene.add(light)

// ------------------------------------------------------------
// 2. 无限跑道错觉：地面 Group 每帧跟随玩家 z
// ------------------------------------------------------------
// 地面很长，但不是真无限；每帧把 track.position.z 对齐玩家，
// 相对相机看起来「路一直在脚下」。
const track = new THREE.Group()
scene.add(track)

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 120),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
track.add(ground)

// 左右护栏：emissive 让边缘在雾里也稍微「发光」好认
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

// ------------------------------------------------------------
// 3. 玩家（可换成角色模型）
// ------------------------------------------------------------
const player = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x6ea8ff, metalness: 0.3, roughness: 0.4 }),
)
player.position.set(0, 0.4, 0)
scene.add(player)

// ------------------------------------------------------------
// 4. InstancedMesh：障碍与硬币
// ------------------------------------------------------------
// 第三参数 = 最多同时存在的实例数（容量）；真正「活着」的由逻辑数组控制
const MAX_OBS = 20
const obsMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ color: 0xff6b6b }),
  MAX_OBS,
)
// ★ 关键：InstancedMesh 默认按「几何体在原点的包围球」做视锥剔除。
// 实例其实被摆到很远的 -Z，但包围球还在原点 → 跑一段后相机离开原点，
// 整份 InstancedMesh 会被误判为「不在视野」而全部不画。
// 解决：关掉 frustumCulled，或每帧手动更新 boundingSphere（进阶）。
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

// dummy：临时 Object3D，用来算矩阵再写进 InstancedMesh
// （不要为每个实例 new Object3D，复用一个即可）
const dummy = new THREE.Object3D()
const obstacles = [] // 逻辑数据：{ x, z } —— 真正的「游戏状态」
const coins = [] // { x, z }

// ------------------------------------------------------------
// 5. 游戏状态机与 HUD 元素
// ------------------------------------------------------------
let state = 'ready' // 'ready' | 'playing' | 'over'
let lane = 1 // 0/1/2 → 对应 LANES
let targetX = 0 // 平滑移动的目标 x（换道插值用）
let speed = 12
let distance = 0
let score = 0
let coinCount = 0
let spawnTimer = 0
let prev = performance.now() // 上一帧时间戳，用来算 dt

const scoreEl = document.getElementById('score')
const coinsEl = document.getElementById('coins')
const overlay = document.getElementById('overlay')
const overlayTitle = document.getElementById('overlayTitle')
const overlayMsg = document.getElementById('overlayMsg')
const startBtn = document.getElementById('startBtn')

/** 重置数值与数组；不改 state（由 startGame / gameOver 管） */
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
 * 多余的实例缩放到 0 并藏到地下，等于「隐藏」（矩阵槽位仍占用）。
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
      // 隐藏未使用槽位：缩到 0 + 挪到地下
      dummy.position.set(0, -20, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(0, 0, 0)
    }
    dummy.updateMatrix()
    obsMesh.setMatrixAt(i, dummy.matrix)
  }
  // 改了 instanceMatrix 必须标脏，否则 GPU 还用旧数据
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
  state = 'playing' // 进入可操作、可更新的状态
  overlay.classList.remove('show')
}

// 启动时先把所有实例藏起来，避免默认矩阵堆在原点闪一下
syncInstances()

function gameOver() {
  state = 'over' // 停止更新；键盘也被 keydown 里的状态判断拦住
  overlayTitle.textContent = '游戏结束'
  overlayMsg.textContent = `分数 ${score} · 金币 ${coinCount}`
  startBtn.textContent = '再来一局'
  overlay.classList.add('show')
}

startBtn.addEventListener('click', startGame)

// ------------------------------------------------------------
// 6. 输入：仅在 playing 时换道
// ------------------------------------------------------------
addEventListener('keydown', (e) => {
  if (state !== 'playing') return
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') lane = Math.max(0, lane - 1)
  if (e.code === 'ArrowRight' || e.code === 'KeyD') lane = Math.min(2, lane + 1)
  targetX = LANES[lane] // 不瞬移，animate 里插值过去
})

// ------------------------------------------------------------
// 7. 主循环：dt、移动、刷怪、碰撞、同步实例
// ------------------------------------------------------------
function animate(now) {
  // dt = 帧间隔（秒）；clamp 防止切后台回来一帧跳太大
  const dt = Math.min(0.05, (now - prev) / 1000)
  prev = now

  if (state === 'playing') {
    // 横向平滑插值换道（不是瞬移）：系数越大贴目标越快
    player.position.x += (targetX - player.position.x) * Math.min(1, 14 * dt)
    // 自动前进（朝 -Z）
    player.position.z -= speed * dt
    distance += speed * dt
    score = Math.floor(distance)
    scoreEl.textContent = String(score)
    // 越跑越快：距离越远，速度线性抬升
    speed = 12 + distance * 0.02

    // 跑道跟着玩家走，看起来地面无限长
    track.position.z = player.position.z - 40

    // 相机跟随玩家（x 平滑，z 固定在身后）
    camera.position.x += (player.position.x - camera.position.x) * 0.1
    camera.position.y = 5
    camera.position.z = player.position.z + 8
    camera.lookAt(player.position.x, 1, player.position.z - 4)

    // 定时刷怪：间隔随距离缩短，但不少于 0.4 秒
    spawnTimer -= dt
    if (spawnTimer <= 0) {
      spawn()
      spawnTimer = Math.max(0.4, 0.85 - distance * 0.002)
    }

    // 障碍：出视野删除；靠近则判定碰撞（轴对齐粗检测 AABB）
    // 倒序遍历：splice 时不会跳过元素
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

    // 逻辑数组变了 → 必须写回 GPU 矩阵（含硬币自旋）
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
 * 1. 加「跳跃」躲障碍（空格抬 y + 简单重力；跳跃中关闭碰撞或只判 x）
 * 2. 障碍换成不同形状（再 new 一个 InstancedMesh，或按类型分两套）
 * 3. 本地存储最高分：localStorage.setItem('best', score)
 * 4. 故意删掉 frustumCulled = false，跑远后观察障碍「突然消失」
 * 5. 把粗 AABB 换成 Box3.setFromObject，感受精度与成本差异
 */
