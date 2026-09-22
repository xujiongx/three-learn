# Three.js 学习指南

> 配套本仓库可运行示例（`examples/`）。建议边读边改代码，而不是只看文档。

---

## 目录

1. [Three.js 是什么](#1-threejs-是什么)
2. [学习路线图](#2-学习路线图)
3. [环境搭建](#3-环境搭建)
4. [核心概念](#4-核心概念)
5. [代码示例精讲](#5-代码示例精讲)
6. [常用 API 速查](#6-常用-api-速查)
7. [进阶主题](#7-进阶主题)
8. [练手项目（按难度）](#8-练手项目按难度)
9. [学习资源](#9-学习资源)
10. [常见坑](#10-常见坑)

---

## 1. Three.js 是什么

Three.js 是基于 WebGL 的 JavaScript 3D 库。它把底层的着色器、缓冲、矩阵运算封装成易用的对象：

| 你想做的事 | Three.js 给你的东西 |
|-----------|-------------------|
| 放一个 3D 物体 | `Mesh` = `Geometry` + `Material` |
| 从某个角度观察 | `Camera` |
| 把画面画到屏幕 | `WebGLRenderer` |
| 组织所有东西 | `Scene` |

**一句话记住：**  
`Scene`（舞台）+ `Camera`（观众眼睛）+ `Renderer`（摄影机）= 一帧画面。

官方站点：[https://threejs.org](https://threejs.org)

---

## 2. 学习路线图

按阶段推进，每阶段都有本仓库对应示例。

```
阶段 A  基础闭环          →  示例 01
        Scene / Camera / Renderer / Mesh / 动画循环

阶段 B  光照与材质        →  示例 02
        Ambient / Directional / Point
        MeshStandardMaterial / 阴影

阶段 C  交互与相机控制    →  示例 03
        OrbitControls / Raycaster / 窗口自适应

阶段 D  资源加载          →  示例 04
        GLTFLoader / TextureLoader / 包围盒居中缩放

阶段 E  性能与特效        →  示例 05
        BufferGeometry / Points / 后处理 / Instancing

阶段 F  做完整项目
        产品展示 / 小游戏 / 数据可视化 / 互动落地页
```

**建议节奏：** 每天 1～2 小时，每个阶段至少亲手改 3 个参数（颜色、位置、数量），再进入下一阶段。

**前置知识（够用即可）：**

- JavaScript ES Module（`import` / `export`）
- 简单的向量直觉：`(x, y, z)`，右手坐标系
- HTML / CSS 基础（canvas 全屏、resize）

---

## 3. 环境搭建

### 推荐方式：Vite + npm

```bash
npm install
npm run dev
```

浏览器打开终端提示的地址（一般是 `http://localhost:5173`）。

### 最小代码结构

```
three/
├── index.html                 # 示例导航页
├── examples/
│   ├── 01-hello-cube/
│   ├── 02-lights-materials/
│   ├── 03-orbit-controls/
│   ├── 04-model-loader/
│   └── 05-particles/
├── docs/threejs-learning-guide.md
└── package.json
```

### CDN 快速体验（不推荐正式项目）

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }
}
</script>
```

正式项目请用 npm，避免版本和路径问题。

---

## 4. 核心概念

### 4.1 Scene（场景）

装所有可见物体、灯光、辅助对象的容器。

```js
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x0b1220)
scene.fog = new THREE.Fog(0x0b1220, 8, 22) // 可选：距离雾
```

### 4.2 Camera（相机）

最常用的是透视相机 `PerspectiveCamera`：

```js
new THREE.PerspectiveCamera(
  75,                                    // fov 视野角（度）
  window.innerWidth / window.innerHeight, // aspect 宽高比
  0.1,                                   // near 近裁剪面
  1000,                                  // far 远裁剪面
)
```

- `fov` 越大，画面越「广角」
- 物体距离必须在 `near`～`far` 之间才会被画出来

也有正交相机 `OrthographicCamera`，适合 2.5D、CAD、等轴测。

### 4.3 Renderer（渲染器）

```js
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
document.body.appendChild(renderer.domElement) // 就是一块 <canvas>
```

### 4.4 Geometry / Material / Mesh

```js
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshStandardMaterial({ color: 0x3dd6c6 })
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)
```

| 材质 | 是否受光 | 用途 |
|------|---------|------|
| `MeshBasicMaterial` | 否 | 线框、调试、UI 装饰 |
| `MeshLambertMaterial` | 是（漫反射） | 哑光表面 |
| `MeshPhongMaterial` | 是（高光） | 塑料、釉面 |
| `MeshStandardMaterial` | 是（PBR） | **首选**，真实感好 |
| `MeshPhysicalMaterial` | 是（高级 PBR） | 玻璃、清漆、透射 |

### 4.5 灯光

`MeshStandardMaterial` **必须有灯光**，否则几乎全黑。

```js
scene.add(new THREE.AmbientLight(0xffffff, 0.4))          // 均匀底光
const sun = new THREE.DirectionalLight(0xffffff, 1)       // 平行光（太阳）
sun.position.set(5, 8, 3)
scene.add(sun)
```

常用灯光：`AmbientLight`、`DirectionalLight`、`PointLight`、`SpotLight`、`HemisphereLight`。

### 4.6 变换：position / rotation / scale

```js
mesh.position.set(1, 2, 0)
mesh.rotation.y = Math.PI / 4   // 弧度，不是角度
mesh.scale.set(2, 2, 2)
```

父子关系用 `Group`：

```js
const group = new THREE.Group()
group.add(meshA, meshB)
scene.add(group)
// 旋转 group = 整体旋转
```

### 4.7 动画循环

```js
function animate(time) {
  mesh.rotation.y = time / 1000
  renderer.render(scene, camera)
}
renderer.setAnimationLoop(animate)
```

优先用 `setAnimationLoop`，比手写 `requestAnimationFrame` 更省心（也兼容 XR）。

### 4.8 坐标系直觉

Three.js 默认 **右手坐标系**：

- `+X` 右
- `+Y` 上
- `+Z` 朝向你（屏幕外）

调试时加辅助：

```js
scene.add(new THREE.AxesHelper(2))
scene.add(new THREE.GridHelper(10, 10))
```

---

## 5. 代码示例精讲

### 示例 01 · Hello Cube（最小闭环）

路径：`examples/01-hello-cube/main.js`

核心流程：

1. 创建 `Scene` / `Camera` / `Renderer`
2. `BoxGeometry` + `MeshBasicMaterial` → `Mesh`
3. `setAnimationLoop` 里改 `rotation` 并 `render`

**练习题：**

- 把方块改成球体 `SphereGeometry`
- 改颜色、改转速
- 再加一个立方体，旋转方向相反

---

### 示例 02 · 灯光与材质

路径：`examples/02-lights-materials/main.js`

关键点：

- 启用 `renderer.shadowMap.enabled = true`
- 光源 `castShadow = true`
- 物体 `castShadow` / 地面 `receiveShadow`

**练习题：**

- 把 `metalness` / `roughness` 滑到 0 和 1，观察差异
- 换成 `SpotLight`，让光斑更集中
- 关掉环境光，只留平行光，看明暗对比

---

### 示例 03 · OrbitControls

路径：`examples/03-orbit-controls/main.js`

```js
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
// 每帧都要：
controls.update()
```

**练习题：**

- `controls.autoRotate = true`
- 限制俯仰角：`controls.minPolarAngle` / `maxPolarAngle`
- 限制缩放距离：`minDistance` / `maxDistance`

---

### 示例 04 ·「模型加载」完整流程

路径：`examples/04-model-loader/main.js`

真实项目加载 GLB 的标准写法：

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()
loader.load('/models/robot.glb', (gltf) => {
  const model = gltf.scene

  // 居中
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)

  // 缩放到统一大小
  const size = box.getSize(new THREE.Vector3())
  const scale = 2 / Math.max(size.x, size.y, size.z)
  model.scale.setScalar(scale)

  scene.add(model)
})
```

本示例用程序化机器人代替外部文件，重点演示 **加载后处理**（居中、缩放、动画）。

**练习题：**

- 去 [Sketchfab](https://sketchfab.com) 下免费 GLB，接上 `GLTFLoader`
- 用 `AnimationMixer` 播放模型自带动画

---

### 示例 05 · 粒子系统

路径：`examples/05-particles/main.js`

思路：

1. 准备 `Float32Array` 存 `x,y,z`
2. `BufferGeometry.setAttribute('position', ...)`
3. `new THREE.Points(geometry, PointsMaterial)`

适合做：星空、雪花、火焰、数据点云。

**练习题：**

- 把粒子数量改成 20000，观察帧率
- 每帧轻微扰动 `position` 数组并 `needsUpdate = true`
- 换成平面分布，做成「地面萤火虫」

---

## 6. 常用 API 速查

### 几何体

```js
BoxGeometry(w, h, d)
SphereGeometry(radius, widthSegments, heightSegments)
PlaneGeometry(w, h)
CylinderGeometry(rTop, rBottom, height, segments)
TorusGeometry(radius, tube)
TorusKnotGeometry(...)
```

### 辅助工具

```js
AxesHelper(size)
GridHelper(size, divisions)
DirectionalLightHelper(light)
CameraHelper(camera)
```

### 纹理

```js
const loader = new THREE.TextureLoader()
const map = loader.load('/textures/wood.jpg')
map.colorSpace = THREE.SRGBColorSpace
material.map = map
```

### 点击拾取（Raycaster）

```js
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

window.addEventListener('pointerdown', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(scene.children, true)
  if (hits.length) console.log('点中了', hits[0].object)
})
```

---

## 7. 进阶主题

学完示例 01～05 后，按兴趣选：

| 主题 | 学什么 | 典型用途 |
|------|--------|---------|
| GLTF / DRACO | 压缩模型加载 | 产品展示 |
| AnimationMixer | 骨骼动画 | 角色、过场 |
| InstancedMesh | 一次画几千个相同物体 | 森林、人群、粒子替代 |
| EffectComposer | 辉光、SSAO、描边 | 电影感画面 |
| ShaderMaterial | 自定义 GLSL | 水面、溶解、扭曲 |
| Cannon / Rapier | 物理引擎 | 小游戏 |
| R3F (`@react-three/fiber`) | React 声明式 Three | 工程化网页 3D |
| WebGPURenderer | 新一代渲染后端 | 未来性能 |

**工程化建议：**

- 场景逻辑拆成模块：`createScene.js` / `createLights.js` / `loadModel.js`
- 大模型用 Draco / Meshopt 压缩
- `pixelRatio` 上限设为 2，移动端控性能
- 不用的几何体 / 材质调用 `.dispose()`

---

## 8. 练手项目（按难度）

每个项目都给出目标、核心知识点、验收标准。做完一个再升级。

### ★ 入门（1～3 天）

#### P1 · 可交互旋转展台

- **目标：** 一个物体在展台上旋转，支持鼠标拖拽
- **知识点：** Mesh、灯光、OrbitControls、阴影
- **验收：** 拖拽流畅；窗口缩放不变形；有地面阴影
- **扩展：** 加 3 个颜色按钮切换材质颜色
- **参考实现：** [`examples/p1-showcase/`](../examples/p1-showcase/)（含换色 UI + 自动旋转开关）

#### P2 · 太阳系（简化版）

- **目标：** 太阳 + 3 颗行星公转/自转
- **知识点：** `Group` 父子变换、动画循环、缩放层级
- **验收：** 行星绕太阳转，同时自转；轨道可用 `EllipseCurve` 或简单三角函数
- **扩展：** 点击行星显示名字（Raycaster）
- **参考实现：** [`examples/p2-solar-system/`](../examples/p2-solar-system/)（含水星～火星 + 月球 + 点击显示名称）

#### P3 · 3D 骰子

- **目标：** 点击按钮，骰子滚动到随机点数
- **知识点：** 旋转插值、`Math.random`、简单缓动
- **验收：** 每次停下的朝上点数正确
- **扩展：** 用 GSAP / tween 做缓动
- **参考实现：** [`examples/p3-dice/`](../examples/p3-dice/)

---

### ★★ 进阶（3～7 天）

#### P4 · 产品落地页（鞋 / 耳机 / 杯子）

- **目标：** 加载 GLB，支持旋转、材质切换、简单热点标注
- **知识点：** GLTFLoader、Texture、Raycaster、UI 叠加
- **验收：** 首屏 3 秒内可交互；移动端可单指旋转
- **素材：** [Poly Pizza](https://poly.pizza)、[Sketchfab](https://sketchfab.com)
- **参考实现：** [`examples/p4-product/`](../examples/p4-product/)（程序化耳机，可替换为 GLB）

#### P5 · 第一人称迷宫 / 画廊

- **目标：** WASD 移动 + 鼠标视角，走完一个小房间
- **知识点：** PointerLockControls、碰撞（AABB 即可）
- **验收：** 不会穿墙；有至少 3 幅「画」（贴图平面）
- **扩展：** 靠近画作显示说明文字
- **参考实现：** [`examples/p5-gallery/`](../examples/p5-gallery/)

#### P6 · 粒子音频可视化

- **目标：** 麦克风或 MP3 驱动粒子起伏
- **知识点：** Web Audio API、`BufferAttribute` 更新、Points
- **验收：** 低音鼓点时粒子明显跳动
- **扩展：** 换成条形频谱环绕圆形
- **参考实现：** [`examples/p6-audio-particles/`](../examples/p6-audio-particles/)（演示节拍 + 麦克风）

---

### ★★★ 挑战（1～2 周）

#### P7 · 休闲小游戏：接金币 / 跑酷

- **目标：** 角色自动前进，左右躲障碍，接金币计分
- **知识点：** 游戏循环、碰撞、状态机（ready/playing/over）、InstancedMesh
- **验收：** 有开始/结束 UI；刷新可重开；60fps（桌面）
- **参考实现：** [`examples/p7-runner/`](../examples/p7-runner/)

#### P8 · 数据 3D 可视化

- **目标：** 把一份 JSON（城市人口 / 股票）画成 3D 柱状或地球标注
- **知识点：** 数据 → 高度映射、相机动画、Tooltip
- **验收：** 鼠标悬停显示数值；可切换数据集
- **参考实现：** [`examples/p8-dataviz/`](../examples/p8-dataviz/)

#### P9 · 简易 Shader 水面

- **目标：** 一块平面用水波 shader 动起来，可反射环境
- **知识点：** ShaderMaterial / `onBeforeCompile`、法线扰动、环境贴图
- **验收：** 有时间连续的波纹；相机移动时反射合理
- **参考实现：** [`examples/p9-water-shader/`](../examples/p9-water-shader/)

#### P10 · 作品集「3D 房间」

- **目标：** 做一个可点击的个人作品集房间（书架=项目、电脑=博客）
- **知识点：** 场景构图、加载优化、交互叙事
- **验收：** 可部署到 GitHub Pages / Vercel；Lighthouse 性能不明显翻车
- **参考实现：** [`examples/p10-portfolio-room/`](../examples/p10-portfolio-room/)

---

### 练手项目推荐顺序

```
P1 展台 → P2 太阳系 → P3 骰子
        ↓
P4 产品页 → P5 画廊 → P6 音频粒子
        ↓
P7 小游戏 或 P8 可视化 或 P9 Shader
        ↓
P10 作品集房间（作为作品集主页）
```

---

## 9. 学习资源

### 必看

| 资源 | 说明 |
|------|------|
| [threejs.org/manual](https://threejs.org/manual/#en/fundamentals) | 官方手册，从 fundamentals 开始 |
| [threejs.org/docs](https://threejs.org/docs/) | API 文档，写代码时常开 |
| [threejs.org/examples](https://threejs.org/examples/) | 官方示例，复制改造最快 |

### 优质教程

| 资源 | 适合 |
|------|------|
| [Three.js Journey](https://threejs-journey.com/)（Bruno Simon） | 体系最完整，付费但值得 |
| [discoverthreejs.com](https://discoverthreejs.com/) | 免费系统教程 |
| [WebGL Fundamentals](https://webglfundamentals.org/) | 想搞懂底层时看 |
| [R3F 文档](https://docs.pmnd.rs/react-three-fiber) | 用 React 做 Three 时 |

### 素材

- 模型：[Sketchfab](https://sketchfab.com)、[Poly Pizza](https://poly.pizza)
- 贴图：[Poly Haven](https://polyhaven.com)、[ambientCG](https://ambientcg.com)
- HDR：[Poly Haven HDRIs](https://polyhaven.com/hdris)

---

## 10. 常见坑

1. **场景全黑**  
   用了 `MeshStandardMaterial` 但没加灯；或相机在物体内部；或物体在 `near/far` 之外。

2. **模型巨大 / 看不见**  
   建模软件单位不同。用 `Box3` 量尺寸再 `scale.setScalar(...)`。

3. **OrbitControls「没反应」**  
   忘了每帧 `controls.update()`，或 `enableDamping` 开了却没 update。

4. **贴图发灰 / 发黑**  
   设置 `texture.colorSpace = THREE.SRGBColorSpace`（r152+）。

5. **resize 后画面拉伸**  
   改 `camera.aspect` 后必须 `camera.updateProjectionMatrix()`，并 `renderer.setSize`。

6. **内存泄漏**  
   频繁创建几何体/材质却不 `dispose()`，尤其在 SPA 路由切换时。

7. **移动端卡顿**  
   降 `pixelRatio`、减面数、关阴影、少用后处理。

8. **本地直接打开 HTML 失败**  
   ES Module / 加载模型需要 HTTP 服务，用 Vite，不要双击 HTML。

---

## 附：30 天自学计划（可裁剪）

| 天数 | 内容 |
|------|------|
| D1–2 | 跑通示例 01，改几何体与动画 |
| D3–4 | 示例 02，搞懂灯光与 PBR 参数 |
| D5–6 | 示例 03 + Raycaster 点击变色 |
| D7–9 | 示例 04，加载一个真实 GLB |
| D10–11 | 示例 05，做星空/雪花 |
| D12–16 | 完成 P1 + P2 |
| D17–22 | 完成 P4 产品展示页 |
| D23–30 | 选 P7 / P8 / P10 做一个可上线作品 |

---

## 下一步

```bash
npm install
npm run dev
```

打开首页，从 **01 · Hello Cube** 开始。每看完一个示例，先改参数，再独立重写一遍（不看原文），这个闭环比「收藏十篇教程」有效得多。

有问题就对着 [官方 docs](https://threejs.org/docs/) 搜类名；卡住超过 30 分钟，去官方 examples 里找最相近的示例拆开看。
