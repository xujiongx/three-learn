import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const pages = [
  'index.html',
  'guide/index.html',
  'examples/01-hello-cube/index.html',
  'examples/02-lights-materials/index.html',
  'examples/03-orbit-controls/index.html',
  'examples/04-model-loader/index.html',
  'examples/05-particles/index.html',
  'examples/p1-showcase/index.html',
  'examples/p2-solar-system/index.html',
  'examples/p3-dice/index.html',
  'examples/p4-product/index.html',
  'examples/p5-gallery/index.html',
  'examples/p6-audio-particles/index.html',
  'examples/p7-runner/index.html',
  'examples/p8-dataviz/index.html',
  'examples/p9-water-shader/index.html',
  'examples/p10-portfolio-room/index.html',
]

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        pages.map((p) => [p.replace(/\.html$/, '').replace(/\//g, '-'), resolve(__dirname, p)]),
      ),
    },
  },
})
