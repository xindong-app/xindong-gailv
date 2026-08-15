# 前端实现与拆分指南

## 1. 架构目标

维持 React + TypeScript + Vite 的纯前端、本地计算架构。拆分遵循真实职责与测试边界，不为行数机械切文件：

```text
src/
├─ app/
│  ├─ App.tsx
│  ├─ ErrorBoundary.tsx
│  └─ providers.tsx
├─ components/
│  ├─ ui/                 # Button, Chip, Field, Range, Dialog, Toast
│  ├─ layout/             # AppShell, StepNav, SelectedSummary
│  ├─ results/            # ResultSummary, ImpactList, ConfidenceBadge
│  └─ visuals/            # PopulationImpactVisual
├─ features/
│  ├─ onboarding/
│  ├─ criteria/
│  ├─ dimension-library/
│  ├─ results/
│  └─ share/
├─ model/
│  ├─ schema.ts           # 运行时 schema；UI/engine 共用
│  ├─ engine.ts           # 纯函数、确定、无 DOM
│  ├─ explain.ts
│  └─ versions.ts
├─ data/
│  ├─ dimensions.ts       # 原子维度注册表
│  ├─ evidence.ts         # 机器可读证据登记
│  └─ population.ts
├─ state/
│  ├─ reducer.ts
│  ├─ history.ts          # undo/redo
│  └─ session.ts          # 会话恢复/敏感最小化
├─ share/
│  ├─ policy.ts           # 默认排除/字段可见性
│  ├─ renderCanvas.ts
│  └─ download.ts
└─ tests/
```

## 2. 现有文件拆分方案

### `pages/Home.tsx`（915 行）

拆成：

- `HomePage/AppShell`：只组装步骤、结果壳、toast 和 error boundary。
- `useCriteriaState`：reducer、undo/redo、preset 覆盖确认、session clear。
- `PopulationStep`：性别/年龄/地域/婚史。
- `CoreCriteriaStep`：少量核心硬条件。
- `DimensionLibraryStep`：搜索、分类、空态、选项渲染。
- `SensitiveFunStep`：成年提示、默认折叠、隐私说明。
- `ResultsStep/ResultSummary`：人口、范围、匹配、娱乐、可信度。
- `SharePreviewDialog`：字段控制、生成状态与降级。
- `useAnimatedNumber`：仅视觉层，不影响 live region。

`DEFAULT_SEL`、枚举和值域移出页面，来自共享 schema/registry。不得再用散落中文字符串作协议。

### `engine/calc.ts`（723 行）

拆成：

- `schema/selection.ts`：zod/等价运行时校验与枚举。
- `population/pool.ts`：基础池。
- `factors/hard.ts`：可直接硬筛。
- `factors/correlated.ts`：联合/分层条件。
- `scores/soft.ts`：软偏好匹配，不改人口。
- `scores/fun.ts`：娱乐指数。
- `engine/compute.ts`：编排、版本、结果不变量。
- `engine/explain.ts`：影响排序、放宽建议、分辨率说明。
- `format/result.ts`：基于分辨率的显示格式。

引擎不得依赖 React、DOM、颜色或分享文案。`Tier` 的视觉颜色属于 UI token，不属于计算结果。

### `components/PeopleFunnel.tsx`

- 逻辑变成确定性 `deriveFunnelViewModel(result)`。
- 视觉只挂一份；小人数量按设备预算 24–40，而非 80×2。
- 整体 SVG/容器 `aria-hidden=true`，旁边渲染结构化文字影响列表。
- 随机遗言使用 seeded RNG 或移除，不用 `Date.now/Math.random` 产生不可复现行为。
- reduced-motion 时不 spawn ghost，不创建延时动画。

### `utils/shareCard.ts`

- `share/policy.ts`：每个字段 `sensitive/shareDefault/shareAllowed`。
- `share/buildViewModel.ts`：只接收已批准字段，不直接吃完整 `Selection`。
- `share/renderCanvas.ts`：返回 Blob/Result；检查 `getContext`、字体、编码。
- `share/download.ts`：等待 `download`、处理浏览器限制。
- UI 捕获并展示 `idle → preview → rendering → success/error`；提供文字版 fallback。

## 3. 状态管理

- 当前规模优先 `useReducer + Context`，不要为“成熟感”引入大状态库。
- State 分为：`criteria`、`currentStep`、`history`、`shareDraft`、`ephemeralUI`。
- 派生结果使用 pure selector/memo；输入快速变化可 `useDeferredValue`，不要把计算散在多个 effect。
- Undo/redo 存 action/snapshot；敏感展开、toast 等临时 UI 不进入历史。
- preset 是显式 transaction，预览差异并确认覆盖；定时“再点一次”不适合作为唯一确认方式。
- 会话恢复若启用：只使用 session scope；敏感字段默认排除；提供清除并说明。

## 4. 组件与无障碍约束

- 原生元素优先；确需复合组件时使用经验证的最小 Radix primitive，不要一次保留整套依赖。
- 所有 `<button>` 显式 `type="button"`，提交表单另行标注。
- `Chip` 必须选择明确模式：toggle/radio/action，禁止一个组件混合三种语义。
- 所有字段用 `<label>` 或可靠 accessible name；placeholder 不是 label。
- Dialog/Drawer 不手写半套焦点管理；复用一个可审计 primitive。
- 结果 live region 只播报稳定摘要；动画字符 `aria-hidden`。
- 装饰 emoji/SVG `aria-hidden=true`；信息图有等价文本。
- 全局 `:focus-visible`，禁止无替代的 `outline:none`。

## 5. 隐私与安全工程约束

- 默认业务运行网络请求为 0；字体、图标、数据全部随包或系统提供。
- 不在 URL、console、错误日志、analytics 中写 Selection/SelfProfile。
- 错误边界只记录错误类型、版本、步骤 id；不记录原始输入。
- 分享 renderer 只能接收 allow-list 后的 DTO。
- `vite.config.ts` 中检查插件必须 `command === 'serve'`/开发环境才启用。
- 构建后扫描 `code-path|本地绝对路径|inspect-react|debug marker`，命中即失败。
- `.env*` 持续忽略；提供 `.env.example` 只列无秘密配置；CI 加 secret scan。
- 部署配置加入并验证 CSP、HSTS、nosniff、Referrer-Policy、Permissions-Policy。

## 6. 性能预算

- 产物硬门禁：`dist` 全部 JS gzip 合计 ≤166 KiB（当前 164.5 KiB），CSS gzip 合计 ≤25 KiB（当前 20.8 KiB）；按 1 KiB = 1024 bytes 计算，超过 1 byte 即失败。
- 166 KiB 是小人 3.0 精绘落地后的一次性封顶值（2026-08-15 由 160 精确上调，不是 167/168 或"约 166"），不是目标值；新增功能仍须先做模块归因，并在每个批次重新执行构建与 `scan:dist`。浏览器包禁入 `react-dom/server`（eslint 硬禁），分享卡渲染走客户端离屏方案。
- 初始 DOM 建议 <1,000；小人可视节点 ≤40；持续动画节点 = 0。
- 核心计算 p95 <50ms（固定场景/设备记录）；输入过程中避免重复全量计算。
- 高级维度/方法说明可懒加载，但首个基础池同步可用。
- 桌面/移动结果共用数据与组件，不用 CSS 隐藏重复重 DOM。

## 7. 测试与质量门禁

建议脚本：

```json
{
  "typecheck": "tsc -b --pretty false",
  "lint": "eslint . --max-warnings=0",
  "test": "vitest run",
  "test:model": "vitest run src/model",
  "test:e2e": "playwright test",
  "build": "tsc -b && vite build",
  "check:artifact": "node scripts/check-artifact.mjs",
  "check": "npm run typecheck && npm run lint && npm run test && npm run test:model && npm run build && npm run check:artifact",
  "check:full": "npm run check && npm run test:e2e"
}
```

测试边界：

- schema：非法枚举、NaN/Infinity、age order、空婚史语义、不适用条件。
- engine：纯函数、确定性、概率范围、单调性、相关组、软/娱乐不改人口、18–50 单岁池。
- UI：选择语义、错误关联、搜索空态、undo/redo、结果 live 去抖。
- share：敏感默认排除、Canvas null/toBlob 失败、下载失败、文本降级。
- E2E：18 条必测旅程，320/390/768/1024/1440、reduced motion、离线、键盘、axe。
- production：console error=0；Google/analytics 请求=0；产物无本地路径。

## 8. 依赖治理

- 保留真正使用的 React、React DOM、Vite、TypeScript、Tailwind/PostCSS（若继续采用）、测试/无障碍工具。
- `react-router` 只有根路由时可评估移除；若步骤不映射 URL，普通状态机足够。
- `clsx/tailwind-merge` 仅在 `cn()` 真正被组件广泛使用后保留。
- Dialog/Toast 若需要，可从 Radix/Sonner 中精确保留所用包；其余 20+ Radix、recharts、date-fns、form、carousel 等删除。
- 清理后 `npm audit --omit=dev --registry=https://registry.npmjs.org` high/critical 必须为 0。
- 使用依赖分析工具复核动态 import/配置引用，人工确认后再删。

## 9. 文档同步

每次模型/数据/隐私/分享行为变化，同步：README、MODEL、DATA_SOURCES、PRIVACY、SECURITY、CHANGELOG、版本常量和场景对比。UI 中展示的承诺必须能在文档与源码中一一验证。
