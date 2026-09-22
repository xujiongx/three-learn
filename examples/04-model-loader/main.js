/**
 * ============================================================
 * 04 · 模型加载流程 —— 加载后「居中 + 缩放」是刚需
 * ============================================================
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
 * 重点演示加载完成后的标准三步：
 *   1) 算包围盒 Box3
 *   2) 移到原点（居中）
 *   3) 统一缩放到目标大小，并放回地面上
 *
 * 为什么需要这些步骤？
 *   不同建模软件单位不同：有的模型宽 1，有的宽 1000。
 *   不处理的话，模型要么巨到看不见，要么小到像灰尘。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
)
camera.position.set(3.5, 2.5, 5)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.target.set(0, 1, 0) // 看向机器人身体高度附近

scene.add(new THREE.AmbientLight(0xffffff, 0.45))
const dir = new THREE.DirectionalLight(0xffffff, 1.2)
dir.position.set(4, 8, 4)
dir.castShadow = true
scene.add(dir)

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x152033, roughness: 0.95 }),
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

/**
 * 模拟「异步加载完成」后的回调。
 * 无论模型来自 GLTFLoader 还是自己拼的，后处理逻辑都一样。
 */
function onModelLoaded(model) {
  // ---------- 步骤 1：计算包围盒 ----------
  // Box3.setFromObject 会遍历模型所有子网格，算出最小/最大角落
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())     // 长宽高
  const center = box.getCenter(new THREE.Vector3()) // 几何中心

  // ---------- 步骤 2：居中 ----------
  // 把模型往反方向挪，让中心落到 (0,0,0)
  model.position.sub(center)

  // ---------- 步骤 3：统一缩放到目标高度（这里目标是 2 个单位）----------
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 2 / maxDim
  model.scale.setScalar(scale) // x/y/z 乘同一个比例，不变形

  // ---------- 步骤 4：放到地面上 ----------
  // 缩放之后包围盒变了，要重新算一次，再把最低点抬到 y=0
  const box2 = new THREE.Box3().setFromObject(model)
  model.position.y -= box2.min.y

  // traverse：递归访问模型里每一个子对象
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })

  scene.add(model)
}

/**
 * 用基础几何体拼一个「方块机器人」。
 * 真实项目里这部分会被 GLTFLoader 的结果替代。
 */
function createRobot() {
  // Group 像文件夹：里面可以放很多 Mesh，整体移动/旋转很方便
  const robot = new THREE.Group()

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
  // name 方便之后用 getObjectByName 找到它做动画
  head.name = 'head'
  robot.add(head)

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), dark)
  eyeL.position.set(-0.18, 2.1, 0.32)
  const eyeR = eyeL.clone() // clone 复制一份网格
  eyeR.position.x = 0.18
  robot.add(eyeL, eyeR)

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

// 用 setTimeout 假装「网络加载需要一点时间」
// 真实 GLTFLoader.load 的成功回调里同样调用 onModelLoaded 即可
setTimeout(() => {
  const robot = createRobot()
  onModelLoaded(robot)
  // 挂到 window 上只是为了让 animate 能读到（演示用；正式项目用模块变量）
  window.__robot = robot
}, 400)

function animate(time) {
  const t = time * 0.001
  const robot = window.__robot

  if (robot) {
    // getObjectByName：按名字在子树里查找物体
    const armL = robot.getObjectByName('armL')
    const armR = robot.getObjectByName('armR')
    const head = robot.getObjectByName('head')

    // 手臂摆动：左右相位差 π，看起来像交替挥动
    if (armL) armL.rotation.x = Math.sin(t * 2) * 0.4
    if (armR) armR.rotation.x = Math.sin(t * 2 + Math.PI) * 0.4
    // 头左右轻轻晃
    if (head) head.rotation.y = Math.sin(t * 0.8) * 0.25
  }

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
 * 1. 去 Sketchfab 下载免费 GLB，用 GLTFLoader 替换 createRobot
 * 2. 打印 size，看看原始模型有多大
 * 3. 如果模型自带动画，研究 AnimationMixer（进阶）
 */
