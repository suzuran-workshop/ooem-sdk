import { execSync } from 'node:child_process'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type ViteUserConfig } from 'vite-plus'
import { VitePWA } from 'vite-plugin-pwa'

// 本地开发与预览恒为根路径；CI 注入 PAGES_BASE_PATH 决定线上前缀。
const base = process.env.PAGES_BASE_PATH || '/'

// 关于弹窗展示的提交号：CI 优先用 GITHUB_SHA，本地取 git HEAD，无仓库时回退 dev。
function resolveCommitHash() {
  const ciHash = process.env.GITHUB_SHA?.slice(0, 7)
  if (ciHash) return ciHash
  try {
    return execSync('git rev-parse --short=7 HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'dev'
  }
}

const plugins = [
  react(),
  VitePWA({
    // 新版本就绪即接管，配合「检查更新」的全量失效，保证离线用户拿到最新构建。
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    includeAssets: ['favicon.svg'],
    manifest: {
      name: 'Sudoku · 数独',
      short_name: '数独',
      description: '一个干净、专注的数独游戏：多难度、笔记、提示、撤销与暂停，桌面与移动端皆宜。',
      lang: 'zh-CN',
      start_url: '.',
      scope: '.',
      display: 'standalone',
      background_color: '#f9f9ff',
      theme_color: '#3157d5',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // 静态资源与图标全部预缓存；哈希文件名由插件自动处理更新。
      globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
    },
  }),
] as unknown as NonNullable<ViteUserConfig['plugins']>

export default defineConfig({
  base,
  plugins,
  define: {
    __COMMIT_HASH__: JSON.stringify(resolveCommitHash()),
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
  fmt: { semi: false, singleQuote: true },
  lint: {
    ignorePatterns: ['node_modules/**', 'dist/**', 'playwright-report/**', 'test-results/**'],
    options: { typeAware: true, typeCheck: true },
  },
})
