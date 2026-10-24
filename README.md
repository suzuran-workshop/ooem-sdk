# Sudoku

一个干净、专注、打开即玩的数独 SPA。桌面端与移动端自适应，没有广告、介绍页与每日挑战。

## 这是什么？

- **定位**：纯前端数独游戏，单页、离线可用、数据只留在本机。
- **解决的核心问题**：把数独最核心的部分——棋盘、数字、笔记、错误、时间与暂停——做得清楚顺手，不让人先穿过一层运营页面才能开始。

## 功能

- 简单 / 中等 / 困难 / 专家四档难度，所有题目由客户端生成并保证唯一解。
- 9×9 棋盘，支持同行、同列、同宫与相同数字高亮，自动检查错误。
- 笔记模式、撤销、擦除、提示、暂停与计时；每局最多 3 次提示，提示填入的数字会以绿色标记。
- 数字剩余数量、完成进度、三档错误上限。
- 完成局数、当前连胜、最佳连胜、提示使用与各难度最佳时间。
- 外观（跟随系统 / 浅色 / 深色）、自动检查、重复高亮、自动清理笔记等设置。
- 对局与设置保存到 `localStorage`，刷新或关闭页面后可继续。
- 首次打开后由 Service Worker 离线缓存，断网也能继续；点击标题打开「关于」，查看提交号与仓库地址，并可强制检查更新。
- 键盘操作：方向键移动，`1–9` 填数，`Backspace` 擦除，`N` 笔记，`H` 提示，`U` 撤销，空格暂停。
- 桌面、平板与手机布局。

## 如何安装和运行？

前置要求：Node.js 24（版本见 `.nvmrc`）与 `vp`。

```bash
nvm use
vp install
vp dev
```

打开 `http://localhost:5173/`。

```bash
# 类型检查 + lint + 格式检查
vp check

# 生产构建
vp build

# 本地预览构建产物
vp preview

# 单元测试
vp test

# E2E（Playwright，自动构建并启动预览服务）
npx playwright test
```

## 部署

项目按 GitHub Pages 项目页设计。推送到 `main` 后，`.github/workflows/deploy.yml` 会执行：

1. `vp check`
2. `vp test`
3. `vp build`，并通过仓库变量 `PAGES_BASE_PATH` 注入子路径
4. 上传 `dist/` 并发布 Pages

默认访问地址为 `https://<user>.github.io/<repo>/`。若使用用户页或自定义域，在仓库 Actions 变量中将 `PAGES_BASE_PATH` 设为 `/`。

## 当前状态

- 阶段：可玩的完整单页版本。
- 已知限制：无账号、云同步、排行榜、每日挑战、音效与多语言；统计仅保存在当前浏览器。

## 核心技术

- React 19 + TypeScript
- Vite+（`vp`）构建、检查与测试
- `@m3e/react`（Material 3 Expressive Web Components 的 React 绑定）
- 原生 CSS + M3E 设计令牌
- `localStorage` 持久化
- `vite-plugin-pwa`（Workbox）离线缓存与 manifest
- Vitest 单元测试，Playwright E2E

## 文档

- [产品需求](docs/PRD.md)
- [架构说明](docs/ARCHITECTURE.md)
- [决策记录](docs/DECISIONS.md)
- [对局模块规格](docs/specs/module-game.md)
- [Agent 指南](AGENTS.md)
