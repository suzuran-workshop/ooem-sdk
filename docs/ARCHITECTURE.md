# ARCHITECTURE — Sudoku

## 系统概述

纯前端单页应用，所有计算在浏览器内完成。

```text
┌────────────────────────────────────────────────────────────┐
│ React SPA (src/App.tsx)                                    │
│                                                            │
│  ┌────────────────────┐    ┌────────────────────────────┐  │
│  │ useSudokuGame      │    │ UI components              │  │
│  │ useReducer + timer │◄──►│ board / pad / dialogs      │  │
│  └─────────┬──────────┘    └────────────────────────────┘  │
│            │                                               │
│  ┌─────────▼──────────┐    ┌────────────────────────────┐  │
│  │ lib/game.ts        │    │ lib/sudoku.ts              │  │
│  │ state + reducer    │    │ generator / solver / rules │  │
│  └─────────┬──────────┘    └────────────────────────────┘  │
│            │                                               │
│  ┌─────────▼──────────┐                                    │
│  │ lib/storage.ts     │──► localStorage                   │
│  └────────────────────┘                                    │
└────────────────────────────────────────────────────────────┘
```

## 核心模块

| 模块                             | 职责                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `src/App.tsx`                    | 页面布局、快捷键、弹窗编排、结果统计更新             |
| `src/components/SudokuBoard.tsx` | 81 格棋盘、选中/关联/同数/冲突/错误样式、无障碍标签  |
| `src/components/NumberPad.tsx`   | 1–9 数字键与剩余数量                                 |
| `src/components/*Dialog.tsx`     | 新游戏、设置、统计、结果、关于弹窗                   |
| `src/lib/project.ts`             | 仓库地址与构建时注入的提交号                         |
| `src/lib/updates.ts`             | 注销 Service Worker、清空 Cache Storage              |
| `src/hooks/useSudokuGame.ts`     | reducer 实例、计时器、页面隐藏自动暂停、持久化       |
| `src/lib/sudoku.ts`              | 随机完整盘面、挖空、唯一解计数、冲突检测、时间格式化 |
| `src/lib/game.ts`                | 对局状态、动作、错误上限、提示、撤销、重开           |
| `src/lib/storage.ts`             | 三类 `localStorage` 数据的序列化/校验                |
| `src/styles/globals.css`         | M3E 令牌映射、布局、棋盘、动效与响应式               |
| `e2e/sudoku.e2e.ts`              | 桌面/移动端关键路径 E2E                              |

## 模块关系

- UI 不直接修改棋盘，只派发 `GameAction`。
- `gameReducer` 是唯一的状态迁移入口；它调用 `sudoku.ts` 的冲突/胜利判断。
- `useSudokuGame` 负责把纯 reducer 接到时间、可见性与存储副作用上。
- `storage.ts` 只负责边界与容错，不包含游戏规则。
- `App` 在 `playing → won/lost` 的唯一迁移上更新统计并打开结果弹窗。

## 数据流

1. 用户点击格子 → `select`。
2. 用户点击数字/键盘 → `input`。
3. reducer 复制值数组、写入数字、清理笔记，并按设置检查错误。
4. 达到 3 次错误 → `lost`；全部格与答案一致 → `won`。
5. `useSudokuGame` 每秒派发 `tick`，对局暂停/结束时不派发。
6. React 渲染棋盘与 HUD；`saveGame` 将当前对局写入本地。
7. 刷新时 `loadGame` 校验并恢复；无效数据回退到新局。

## 外部系统

- 浏览器：`localStorage`、`crypto.getRandomValues`、`crypto.randomUUID`、`visibilitychange`、键盘事件。
- `@m3e/react`：主题、按钮、图标按钮、弹窗、开关、Snackbar。
- GitHub Pages：静态托管与 Actions 部署；`base` 由环境变量注入。
- Service Worker / Cache Storage：`vite-plugin-pwa` 生成的 Workbox 预缓存；「检查更新」注销全部注册并清空缓存后重载。
- 构建期：`vite.config.ts` 读取 `GITHUB_SHA` 或 `git HEAD`，注入 `__COMMIT_HASH__` 供「关于」展示。

## 题目生成

1. 用随机化回溯生成完整合法盘面。
2. 随机打乱 180° 对称的格子对，依次尝试挖空。
3. 每次挖空后用位掩码 + MRV 求解器统计解数量；只有仍为唯一解时才保留挖空。
4. 对称挖空未达到目标提示数时，再做单格挖空，仍坚持唯一解。
5. 难度由目标提示数近似表达；实际提示数可能因唯一解约束而在目标附近浮动。

## 离线与更新

1. 首次访问时 `registerSW.js` 注册 Workbox Service Worker，并预缓存 HTML、JS、CSS、图标与 manifest。
2. 再次访问由 Service Worker 接管静态资源，断网也能打开并继续本地对局。
3. 构建产物变化后 `autoUpdate` 安装新版本并在下次导航接管。
4. 「关于 → 检查更新」注销全部 Service Worker、删除 Cache Storage 中的条目，再调用 `reload()`；`localStorage` 不受影响。

## 重要技术边界

- 无服务端，不存在跨设备同步或服务端防作弊。
- `localStorage` 只保存本浏览器数据；清理站点数据会丢失进度。
- 题目生成在客户端同步完成，单局通常为毫秒级；不引入 Web Worker。
- 状态以数组形式保存，便于序列化；reducer 通过复制保证不可变更新。
- 走 `vp` 构建与检查，不在 `package.json` 声明包管理器。
