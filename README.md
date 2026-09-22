# Three.js 学习实验室

一套可运行的 Three.js 入门示例 + **P1～P10 练手项目** + 完整学习文档。

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址。

## 文档

- **完整学习指南**：[docs/threejs-learning-guide.md](./docs/threejs-learning-guide.md)

## 基础示例

| # | 名称 | 知识点 |
|---|------|--------|
| 01 | [Hello Cube](./examples/01-hello-cube/) | Scene / Camera / Renderer |
| 02 | [灯光与材质](./examples/02-lights-materials/) | 灯光、PBR、阴影 |
| 03 | [OrbitControls](./examples/03-orbit-controls/) | 轨道控制器 |
| 04 | [模型加载流程](./examples/04-model-loader/) | 居中、缩放、加载后处理 |
| 05 | [粒子系统](./examples/05-particles/) | BufferGeometry / Points |

## 练手项目（全部已实现）

| # | 名称 | 知识点 |
|---|------|--------|
| P1 | [可交互旋转展台](./examples/p1-showcase/) | 展台、阴影、换色 UI |
| P2 | [太阳系](./examples/p2-solar-system/) | Group 公转/自转、Raycaster |
| P3 | [3D 骰子](./examples/p3-dice/) | 旋转缓动、朝上点数 |
| P4 | [产品展示页](./examples/p4-product/) | 热点、材质切换 |
| P5 | [第一人称画廊](./examples/p5-gallery/) | PointerLock、AABB 碰撞 |
| P6 | [音频粒子](./examples/p6-audio-particles/) | Web Audio Analyser |
| P7 | [跑酷小游戏](./examples/p7-runner/) | 状态机、InstancedMesh |
| P8 | [3D 数据可视化](./examples/p8-dataviz/) | 数据映射、Tooltip |
| P9 | [Shader 水面](./examples/p9-water-shader/) | ShaderMaterial |
| P10 | [作品集房间](./examples/p10-portfolio-room/) | 场景叙事、可点击热点 |

## 推荐顺序

1. 基础示例 01→05  
2. 练手 P1→P10（先玩再读源码，再自己重写）  
3. 挑一个做成可部署作品集
