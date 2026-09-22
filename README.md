# 三维课 · Three.js 循序教学

面向初学者的 Three.js 教学站：5 堂基础课 + 10 个练手项目，源码带详细中文注释。

## 快速开始

```bash
npm install
npm run dev
```

打开本地地址，从首页「打开第一课」开始。

## 站点结构

| 区域 | 内容 |
|------|------|
| 学习路径 | A→E 阶段说明 |
| 基础课 | 示例 01–05 |
| 练手坊 | P1–P10 非对称课程墙 |
| 指南 | [在线阅读](./guide/) · 源文件 `docs/threejs-learning-guide.md` |

首页支持：课程筛选、滚动渐入、记住上次学到哪一课。

## 设计说明

UI 按 [taste-skill](https://github.com/Leonxlnx/taste-skill) 做了教学站向重设计：

- 单一强调色（琥珀橙），避免 AI 紫青渐变
- 课程列表 + 练手 bento，替代等宽三列卡片
- Outfit / Source Sans 3 / IBM Plex Mono 字体组合

本仓库已接入官方 [GSAP AI Skills](https://github.com/greensock/gsap-skills)（位于 `.cursor/skills/`）。首页 / 指南 / 课时壳使用 GSAP（timeline、ScrollTrigger、ScrollTo）做入场与滚动交互，并尊重 `prefers-reduced-motion`。

## 文档

完整学习指南（网页版）：[guide/](./guide/)  
源 Markdown：[docs/threejs-learning-guide.md](./docs/threejs-learning-guide.md)
