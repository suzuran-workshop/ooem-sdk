# AGENTS.md

纯前端数独 SPA。帮助 Agent 快速定位边界、约定与验证方式。

## 概述

- 本项目是一个 React 19 + TypeScript 的单页数独游戏，使用 `@m3e/react` 构建 Material 3 Expressive 界面。
- 无服务端、无数据库；对局、设置和统计都保存在浏览器 `localStorage`。
- 构建、检查与测试统一通过 `vp`（Vite+）执行。

## 边界与范围

- **范围内**：棋盘与数独规则、题目生成、笔记/撤销/提示、计时与暂停、难度、统计、设置、响应式布局、键盘操作。
- **非目标**：账号、云同步、在线对战、排行榜、每日挑战、广告、介绍页、支付、推送。
- 不引入服务端能力；如果未来需要跨设备同步，再单独评估后端路线。
- 保持单页结构，不为了「可能的多页」预装路由。

## Agent 操作指南

- 改动游戏规则或状态机时，先读 `docs/specs/module-game.md` 与 `src/lib/game.ts`。
- 题目生成、求解、校验集中在 `src/lib/sudoku.ts`；不要在其他组件里复制求解逻辑。
- UI 以 `@m3e/react` 组件 + 原生 CSS 设计令牌为主；组件颜色优先使用 `--md-sys-color-*`，避免写死浅色/深色值。
- 新交互应同时考虑桌面与移动端；至少在 360px 宽度下检查无横向滚动。
- 所有会改变对局的操作应通过 reducer action 表达，并考虑撤销、暂停、结束状态与持久化。
- 完成改动后运行 `vp check`、`vp test`，涉及交互或布局时再运行 `npx playwright test`。

## 常用命令

```bash
vp dev
vp build
vp preview
vp check
vp check --fix
vp test
npx playwright test
```

## 目录速查

- `src/App.tsx` — 页面结构、快捷键、结果统计与弹窗编排。
- `src/components/` — 棋盘、数字键盘与弹窗。
- `src/hooks/useSudokuGame.ts` — reducer、计时器、自动暂停与持久化接线。
- `src/lib/sudoku.ts` — 题目生成、解数量统计、冲突检测与时间格式化。
- `src/lib/game.ts` — 对局状态、reducer 与规则。
- `src/lib/storage.ts` — `localStorage` 读写与数据校验。
- `src/lib/updates.ts` — Service Worker 注销与离线缓存清理（「关于 → 检查更新」）。
- `src/lib/project.ts` — 仓库地址与构建时注入的提交号。
- `src/styles/globals.css` — M3E 令牌、布局、棋盘、响应式与动效。
- `e2e/` — Playwright 端到端测试。
- `docs/` — 产品、架构、决策与模块规格。
