/**
 * ============================================================
 * 04 · 模型加载流程 —— 加载后「居中 + 缩放」是刚需
 * ============================================================
 *
 * 目标：掌握「模型进场景后必须做的标准化处理」，避免模型过大/过小/飞掉。
 *
 * 和前几课的关系：
 *   01～03 的物体尺寸我们自己定（1×1×1 的方块很好控）。
 *   真实 .glb / .gltf 来自不同建模软件，单位可能差几百倍。
 *   本课重点不是「怎么下载模型」，而是加载完成后的标准三步。
 *
 * 真实项目通常这样加载 .glb / .gltf：
 *
 *   import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
 *   const loader = new GLTFLoader()
 *   loader.load('/models/robot.glb', (gltf) => {
 *     const model = gltf.scene
 *     // ……下面 onModelLoaded 里的处理 ……
 *     scene.add(model)
 *   })
 *
 * 本示例没有外部模型文件，而是用几何体「拼」了一个小机器人，
 * 再用 setTimeout 假装异步加载 —— 重点演示加载完成后的标准流程：
 *   1) 算包围盒 Box3
 *   2) 移到原点（居中）
 *   3) 统一缩放到目标大小
 *   4) 贴回地面（最低点 y=0）
 *
 * 为什么需要这些步骤？
 *   不同建模软件单位不同：有的模型宽 1，有的宽 1000。
 *   不处理的话，模型要么巨到看不见，要么小到像灰尘。
 */

// ------------------------------------------------------------
// 1. 引入 Three.js 与 OrbitControls（延续 03）
// ------------------------------------------------------------
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// ------------------------------------------------------------
// 2. 场景 / 相机 / 渲染器
// ------------------------------------------------------------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)

const camera = new THREE.PerspectiveCamera(
  50, // 稍窄的视野，更像「人像/角色展示」
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(3.5, 2.5, 5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// 模型通常需要影子才「站得住」；沿用 02 的阴影开关
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

// ------------------------------------------------------------
// 3. 轨道控制器 —— 方便绕着机器人看
// ------------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
// 看向机器人身体高度附近（不要盯着脚底原点）
controls.target.set(0, 1, 0)

// ------------------------------------------------------------
// 4. 灯光与地面（Standard 材质 + 接影地面）
// ------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(4, 8, 4)
dir.castShadow = true
scene.add(dir)

const ground = new THREE.Mesh(
  // CircleGeometry：圆形地面，比大方块更像「展示台」
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ------------------------------------------------------------
// 5. 加载完成后的标准后处理（真实 GLTF 也走这里）
// ------------------------------------------------------------
/**
 * 模拟「异步加载完成」后的回调。
 * 无论模型来自 GLTFLoader 还是自己拼的，后处理逻辑都一样。
 */
function onModelLoaded(model) {
  // ---------- 步骤 1：计算包围盒 ----------
  // Box3.setFromObject 会遍历模型所有子网格，算出最小/最大角落
  // 常见坑：在 scale/position 改完之前就算一次就完事 —— 缩放后要重算
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())     // 长宽高
  const center = box.getCenter(new THREE.Vector3()) // 几何中心

  // ---------- 步骤 2：居中 ----------
  // 把模型往反方向挪，让中心落到 (0,0,0)
  // 很多 GLB 的原点在脚底或角落，不居中会导致 Controls 绕得很怪
  model.position.sub(center)

  // ---------- 步骤 3：统一缩放到目标高度（这里目标是 2 个单位）----------
  // 取最长边做基准，保证「怎么扁的模型」都能塞进相近的展示尺寸
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 2 / maxDim
  model.scale.setScalar(scale) // x/y/z 乘同一个比例，不变形

  // ---------- 步骤 4：放到地面上 ----------
  // 缩放之后包围盒变了，要重新算一次，再把最低点抬到 y=0
  // 否则模型可能埋进地下，或悬在半空
  const box2 = new THREE.Box3().setFromObject(model)
  model.position.y -= box2.min.y

  // traverse：递归访问模型里每一个子对象
  // GLB 往往是很深的节点树，必须 traverse 才能给每个 Mesh 开阴影
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  scene.add(model)
}

// ------------------------------------------------------------
// 6. 用基础几何体拼一个「方块机器人」（代替外部 GLB）
// ------------------------------------------------------------
/**
 * 用基础几何体拼一个「方块机器人」。
 * 真实项目里这部分会被 GLTFLoader 的结果替代。
 */
function createRobot() {
  // Group 像文件夹：里面可以放很多 Mesh，整体移动/旋转很方便
  const robot = new THREE.Group()

  // 身体用偏金属的青色；关节/眼睛用深色，层次更清晰
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3dd6c6,
    metalness: 0.4,
    roughness: 0.35,
  })
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1e2a40,
    metalness: 0.2,
    roughness: 0.6,
  })

  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, 0.7), mat)
  body.position.y = 1.1
  robot.add(body)

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.6), mat)
  head.position.y = 2.05
  // name 方便之后用 getObjectByName 找到它做动画（见 animate）
  head.name = 'head'
  robot.add(head)

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), dark)
  eyeL.position.set(-0.18, 2.1, 0.32)
  const eyeR = eyeL.clone() // clone 复制一份网格（几何+材质引用一并带上）
  eyeR.position.x = 0.18
  robot.add(eyeL, eyeR)

  // 左右臂共用同一份 Geometry，省内存；靠 position/name 区分
  const armGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25)
  const armL = new THREE.Mesh(armGeo, mat)
  armL.position.set(-0.7, 1.15, 0)
  armL.name = 'armL'
  const armR = new THREE.Mesh(armGeo, mat)
  armR.position.set(0.7, 1.15, 0)
  armR.name = 'armR'
  robot.add(armL, armR)

  const legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.35)
  const legL = new THREE.Mesh(legGeo, dark)
  legL.position.set(-0.28, 0.4, 0)
  const legR = new THREE.Mesh(legGeo, dark)
  legR.position.set(0.28, 0.4, 0)
  robot.add(legL, legR)

  return robot
}

// ------------------------------------------------------------
// 7. 假装异步加载（真实项目换成 loader.load 即可）
// ------------------------------------------------------------
// 用 setTimeout 假装「网络加载需要一点时间」
// 真实 GLTFLoader.load 的成功回调里同样调用 onModelLoaded 即可
setTimeout(() => {
  const robot = createRobot()
  onModelLoaded(robot)
  // 挂到 window 上只是为了让 animate 能读到（演示用；正式项目用模块变量）
  // 常见坑：加载是异步的，animate 前几帧 robot 还不存在 —— 所以下面有 if (robot)
  window.__robot = robot
}, 400)

// ------------------------------------------------------------
// 8. 动画循环 —— 等模型就绪后再摆手臂/转头
// ------------------------------------------------------------
function animate(time) {
  const t = time * 0.001
  const robot = window.__robot

  if (robot) {
    // getObjectByName：按名字在子树里查找物体（依赖上面设的 .name）
    const armL = robot.getObjectByName('armL')
    const armR = robot.getObjectByName('armR')
    const head = robot.getObjectByName('head')

    // 手臂摆动：左右相位差 π，看起来像交替挥动
    if (armL) armL.rotation.x = Math.sin(t * 2) * 0.4
    if (armR) armR.rotation.x = Math.sin(t * 2 + Math.PI) * 0.4
    // 头左右轻轻晃
    if (head) head.rotation.y = Math.sin(t * 0.8) * 0.25
  }

  // 03 讲过：开了 damping 必须每帧 update
  controls.update()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

// ------------------------------------------------------------
// 9. 窗口尺寸变化
// ------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

/**
 * 【练习建议】
 * 1. 去 Sketchfab 下载免费 GLB，用 GLTFLoader 替换 createRobot
 * 2. 在 onModelLoaded 里 console.log(size)，看看原始模型有多大
 * 3. 把目标高度从 2 改成 0.5 / 5，感受统一缩放的作用
 * 4. 如果模型自带动画，研究 AnimationMixer（进阶，后面项目会用到）
 * 5. 下一课粒子系统：模型是「少量复杂 Mesh」，粒子是「海量简单点」
 */
