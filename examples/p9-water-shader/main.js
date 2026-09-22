/**
 * ============================================================
 * P9 · Shader 水面 —— 初识自定义 ShaderMaterial
 * ============================================================
 *
 * 普通 Material（Standard/Basic）是 Three.js 写好的着色器。
 * ShaderMaterial 让你自己写两段 GPU 程序：
 *
 *   vertexShader   —— 决定每个顶点最终在哪（可做波浪起伏）
 *   fragmentShader —— 决定每个像素什么颜色（可做菲涅尔、高光）
 *
 * GLSL 语法和 JS 不同，但本例只演示最小可用水面：
 *   1. 用 sin 叠加几层波，改顶点 y
 *   2. 用邻域差分估算法线
 *   3. 片元里做漫反射 + 菲涅尔混合天空色 + 高光
 *
 * 看不懂每一行没关系：先改 uTime 速度、颜色，建立直觉。
 */

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87b8d8)

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200)
camera.position.set(0, 4, 10)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(innerWidth, innerHeight)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.maxPolarAngle = Math.PI * 0.49
controls.target.set(0, 0.5, 0)

// ——— 天空球：同样用自定义 shader 做上下渐变 ———
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, // 从球「里面」看
  uniforms: {
    topColor: { value: new THREE.Color(0x4a90c8) },
    bottomColor: { value: new THREE.Color(0xdfefff) },
  },
  vertexShader: `
    varying vec3 vWorld; // 传给片元：世界坐标
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorld;
    void main() {
      float h = normalize(vWorld).y; // 越高越接近 1
      gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
    }
  `,
})
scene.add(new THREE.Mesh(new THREE.SphereGeometry(80, 32, 16), skyMat))

/**
 * uniforms：CPU（JS）→ GPU（shader）传参的桥梁。
 * 每帧改 uTime.value，波浪就会动。
 */
const waterUniforms = {
  uTime: { value: 0 },
  uDeepColor: { value: new THREE.Color(0x0a4a6e) },
  uShallowColor: { value: new THREE.Color(0x3dd6c6) },
  uSkyColor: { value: new THREE.Color(0xcfe8ff) },
  uLightDir: { value: new THREE.Vector3(0.4, 0.8, 0.3).normalize() },
}

const waterMat = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  transparent: true,
  vertexShader: `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    // 多层正弦波叠加，比单层更自然
    float wave(vec2 p, float t) {
      return sin(p.x * 1.5 + t * 1.2) * 0.12
           + sin(p.y * 1.8 + t * 0.9) * 0.1
           + sin((p.x + p.y) * 2.2 + t * 1.5) * 0.06;
    }

    void main() {
      vec3 pos = position;
      float h = wave(pos.xz, uTime);
      pos.y += h; // 顶点上下动 = 波浪

      // 邻域差分：近似 ∂h/∂x、∂h/∂z，构造法线
      float eps = 0.2;
      float hx = wave(pos.xz + vec2(eps, 0.0), uTime) - h;
      float hz = wave(pos.xz + vec2(0.0, eps), uTime) - h;
      vec3 n = normalize(vec3(-hx / eps, 1.0, -hz / eps));

      vec4 world = modelMatrix * vec4(pos, 1.0);
      vWorldPos = world.xyz;
      vNormal = normalize(mat3(modelMatrix) * n);
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uSkyColor;
    uniform vec3 uLightDir;

    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
      vec3 N = normalize(vNormal);
      // cameraPosition 是 Three.js 自动注入的相机世界坐标
      vec3 V = normalize(cameraPosition - vWorldPos);

      // 菲涅尔：越侧视越像反射天空
      float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
      float diff = max(dot(N, uLightDir), 0.0);

      vec3 base = mix(uDeepColor, uShallowColor, diff * 0.5 + 0.35);
      vec3 col = mix(base, uSkyColor, fresnel * 0.75);

      // Blinn-Phong 高光：波峰亮斑
      vec3 H = normalize(uLightDir + V);
      float spec = pow(max(dot(N, H), 0.0), 64.0);
      col += vec3(spec) * 0.55;

      gl_FragColor = vec4(col, 0.92);
    }
  `,
})

// 分段要够多，顶点波浪才平滑（128x128 对学习够用）
const water = new THREE.Mesh(new THREE.PlaneGeometry(24, 24, 128, 128), waterMat)
water.rotation.x = -Math.PI / 2
scene.add(water)

// 小岛：有个参照物，水面才不像「无限绿幕」
const island = new THREE.Mesh(
  new THREE.ConeGeometry(1.8, 1.2, 6),
  new THREE.MeshStandardMaterial({ color: 0x6b8f71, flatShading: true }),
)
island.position.set(-3, 0.3, -2)
scene.add(island)

const sand = new THREE.Mesh(
  new THREE.CylinderGeometry(2.4, 2.8, 0.4, 16),
  new THREE.MeshStandardMaterial({ color: 0xe8d5a3 }),
)
sand.position.set(-3, 0.05, -2)
scene.add(sand)

scene.add(new THREE.AmbientLight(0xffffff, 0.6))
const sun = new THREE.DirectionalLight(0xfff5e0, 1.0)
sun.position.set(5, 10, 0)
scene.add(sun)

renderer.setAnimationLoop((t) => {
  waterUniforms.uTime.value = t * 0.001 // 推进时间 → 波在动
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
 * 1. 改 wave 里的频率/振幅，做出「狂风大浪」
 * 2. 把 uDeepColor 做成可调的 HTML 颜色选择器
 * 3. 进阶：用 Reflector 或环境贴图做更真的反射
 */
