/**
 * ============================================================
 * P6 · 音频粒子可视化 —— Web Audio + 改 BufferAttribute
 * ============================================================
 *
 * 思路分两半：
 *
 * A. 音频分析
 *    AudioContext → AnalyserNode → getByteFrequencyData()
 *    得到一组 0～255 的频谱数值（低音在前，高音在后）
 *
 * B. 驱动粒子
 *    每个粒子读取一个频谱值，改变它的 Y 高度
 *    然后告诉 Three.js：geometry.attributes.position.needsUpdate = true
 *
 * 浏览器规定：音频必须在「用户点击」之后才能播放，
 * 所以页面上有「开始演示音频 / 使用麦克风」按钮。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const COUNT = 180 // 外圈粒子数量（也约等于频谱采样数）

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x050910)

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100)
camera.position.set(0, 4, 9)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 0.4

// ——— 外圈：基础位置存在 base，每帧写回 positions ———
const positions = new Float32Array(COUNT * 3)
const base = new Float32Array(COUNT * 3) // 未受音频影响的「原位置」
const colors = new Float32Array(COUNT * 3)
const color = new THREE.Color()

for (let i = 0; i < COUNT; i++) {
  const a = (i / COUNT) * Math.PI * 2 // 均匀分布在圆周
  const r = 3
  base[i * 3] = positions[i * 3] = Math.cos(a) * r
  base[i * 3 + 1] = positions[i * 3 + 1] = 0
  base[i * 3 + 2] = positions[i * 3 + 2] = Math.sin(a) * r

  color.setHSL(i / COUNT, 0.7, 0.55)
  colors[i * 3] = color.r
  colors[i * 3 + 1] = color.g
  colors[i * 3 + 2] = color.b
}

const geometry = new THREE.BufferGeometry()
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

const points = new THREE.Points(
  geometry,
  new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending, // 叠加发光感
  }),
)
scene.add(points)

// 内圈：另一组粒子，频谱幅度小一点
const innerPos = new Float32Array(COUNT * 3)
for (let i = 0; i < COUNT; i++) {
  const a = (i / COUNT) * Math.PI * 2
  innerPos[i * 3] = Math.cos(a) * 1.6
  innerPos[i * 3 + 2] = Math.sin(a) * 1.6
}
const innerGeo = new THREE.BufferGeometry()
innerGeo.setAttribute('position', new THREE.BufferAttribute(innerPos, 3))
const inner = new THREE.Points(
  innerGeo,
  new THREE.PointsMaterial({
    color: 0x6ea8ff,
    size: 0.08,
    transparent: true,
    opacity: 0.8,
  }),
)
scene.add(inner)

// ——— Web Audio 相关变量（点击后才创建）———
let audioCtx
let analyser
let dataArray
let demoNodes = [] // 保存 oscillator 等，方便停止

const status = document.getElementById('status')

/** 懒创建 AudioContext，并尝试 resume（有些浏览器默认 suspended） */
function ensureCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioCtx.createAnalyser()
    // fftSize 越大频谱越细，数组也越长。256 对可视化够用
    analyser.fftSize = 256
    dataArray = new Uint8Array(analyser.frequencyBinCount)
  }
  return audioCtx.resume()
}

function stopDemo() {
  for (const n of demoNodes) {
    try {
      n.stop?.()
    } catch {}
    try {
      n.disconnect?.()
    } catch {}
  }
  demoNodes = []
}

/**
 * 没有 mp3 文件时：用 Oscillator 手动排一点「假节拍」。
 * 教学目的是让 Analyser 有数据可吃，不是做真正的音乐应用。
 */
async function startDemo() {
  await ensureCtx()
  stopDemo()

  const master = audioCtx.createGain()
  master.gain.value = 0.08 // 总音量小一点，别吓到人
  master.connect(analyser)
  analyser.connect(audioCtx.destination) // 接到扬声器，你才能听见

  const schedule = () => {
    const t = audioCtx.currentTime
    for (let i = 0; i < 8; i++) {
      const osc = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      osc.type = i % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.value = i % 2 === 0 ? 55 : 220 + i * 40

      // ADSR 简化版：快速起音，再衰减到接近 0
      g.gain.setValueAtTime(0, t + i * 0.35)
      g.gain.linearRampToValueAtTime(1, t + i * 0.35 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.35 + 0.28)

      osc.connect(g)
      g.connect(master)
      osc.start(t + i * 0.35)
      osc.stop(t + i * 0.35 + 0.3)
      demoNodes.push(osc, g)
    }
  }

  schedule()
  // 每 2.8 秒再排一小节，循环演示
  const id = setInterval(schedule, 2800)
  demoNodes.push({ stop: () => clearInterval(id), disconnect: () => {} })
  status.textContent = '演示节拍播放中…'
}

/** 麦克风：MediaStream → Analyser（注意：不要接到 destination，否则会啸叫） */
async function startMic() {
  await ensureCtx()
  stopDemo()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const src = audioCtx.createMediaStreamSource(stream)
    src.connect(analyser)
    demoNodes.push(src)
    status.textContent = '麦克风已接入'
  } catch {
    status.textContent = '无法访问麦克风'
  }
}

document.getElementById('startBtn').addEventListener('click', startDemo)
document.getElementById('micBtn').addEventListener('click', startMic)

function animate(time) {
  const t = time * 0.001

  if (analyser && dataArray) {
    // 把当前频谱填进 dataArray（0～255）
    analyser.getByteFrequencyData(dataArray)
    const step = Math.floor(dataArray.length / COUNT) || 1

    for (let i = 0; i < COUNT; i++) {
      const v = dataArray[i * step] / 255 // 归一化到 0～1
      positions[i * 3] = base[i * 3]
      positions[i * 3 + 1] = v * 3.5 // 音量越大跳得越高
      positions[i * 3 + 2] = base[i * 3 + 2]
      innerPos[i * 3 + 1] = v * 1.8
    }
  } else {
    // 还没开音频时，给一点轻微波动，避免画面完全静止
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 1] = Math.sin(t * 2 + i * 0.2) * 0.3
      innerPos[i * 3 + 1] = Math.sin(t * 3 + i * 0.15) * 0.15
    }
  }

  // ★ 改了 TypedArray 之后必须设 needsUpdate，GPU 才会重新上传
  geometry.attributes.position.needsUpdate = true
  innerGeo.attributes.position.needsUpdate = true

  points.rotation.y = t * 0.15
  inner.rotation.y = -t * 0.25

  controls.update()
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
 * 1. 用 <audio src="xxx.mp3"> + createMediaElementSource 播真歌
 * 2. 把环形改成条形柱状频谱
 * 3. 用低频平均值控制整圈缩放
 */
