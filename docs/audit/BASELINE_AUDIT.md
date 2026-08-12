# 心动概率局：升级前基线审计

> 审计对象：Git 基线 `f5676dfc6075e46139870dcb31e5239a64af210b`（`chore: preserve pre-upgrade baseline`）
> 审计日期：2026-08-13（Asia/Shanghai）
> 方法：逐文件源码/配置核查、生产构建与产物扫描、六视口浏览器实测、依赖与漏洞审计。本文刻意以 Git `HEAD` 为基准，避免并行升级代码污染“升级前”结论。

## 1. 结论摘要

当前版本的品牌记忆点很强：马卡龙手账、贴纸、动态小人和实时结果形成了鲜明识别。但它仍是“好看的长页面演示”，尚不是可发布产品。最大风险不是某个像素，而是产品语义、视觉层级、无障碍、隐私承诺和工程边界同时不闭环。

| 严重度 | 发现 | 可核查证据 | 处理原则 |
|---|---|---|---|
| P0 | 娱乐条件、软偏好、敏感条件仍直接砍人口，界面把估算称作“心动概率” | `app/src/engine/calc.ts:630-644`；`app/src/pages/Home.tsx:820` | 人口、匹配、娱乐三轨拆分，重写结果语义 |
| P0 | 生产包泄露源码路径 | `app/vite.config.ts:9` 无条件 `inspectAttr()`；构建产物出现 `code-path="src\\pages\\Home.tsx:..."` | 插件仅开发模式启用；发布前扫描失败即阻断 |
| P0 | 选择控件、动态结果、移动抽屉缺少关键 ARIA | 浏览器实测 `aria-pressed=0`、`aria-live=0`、`aria-hidden=0`；所有 range 无可访问名称 | 建立语义组件与自动化 axe 门禁 |
| P0 | 分享失败被吞掉且默认直接下载，缺少预览/敏感字段控制 | `app/src/pages/Home.tsx:290-297`；`app/src/utils/shareCard.ts:41-46,180-183` | 预览→字段控制→生成→成功/失败/重试→文本降级 |
| P0 | 生产依赖存在 high 漏洞 | `npm audit --omit=dev --registry=https://registry.npmjs.org`：1 high，`lodash` 由未使用 `recharts` 引入 | 删除未使用链并重新审计 |
| P1 | 信息架构是 8,837px 超长页面，151 个可聚焦项 | 390px 浏览器实测：2,088 DOM、151 focusable、146 buttons、160 people | 改为移动优先分步 SPA |
| P1 | 视觉噪声反客为主 | 18 张同权 Card、55 个 Chip 调用、184 个初始动画节点、14 组 keyframes | 结果第一、操作第二、解释第三、装饰最后 |
| P1 | 第三方字体破坏“本地/隐私/离线”可信表达 | `app/index.html:6-11`；生产 `dist/index.html` 保留 Google Fonts | 自托管或系统字体，默认零第三方请求 |
| P1 | 默认筛选存在，但移动结果却写“待开筛”；点击无反馈 | `app/src/pages/Home.tsx:117-145,275,881-886`；浏览器实测点击无状态变化 | 基础池即结果，底栏始终可达且语义一致 |
| P1 | 城市搜索、自定义数字、极小值、加载/错误/恢复状态缺失 | `app/src/pages/Home.tsx:246,255-256,372-383,474-481` | 实现状态矩阵，不留死操作 |
| P1 | 无 Error Boundary，错误会击穿整页 | `app/src/main.tsx:7-12`、`app/src/App.tsx:4-9` | 根级边界 + 可恢复界面，日志不含输入 |
| P2 | 依赖、脚手架、文档、质量门禁未成熟 | 包名 `my-app@0.0.0`；仅 dev/build/lint/preview；README 为 Vite 模板 | 收敛栈、锁 Node LTS、加入 check/测试/CI 文档 |

## 2. 基线量化

### 源码与结构

- `Home.tsx` 915 行；`calc.ts` 723 行；`PeopleFunnel.tsx` 222 行；`shareCard.ts` 184 行。
- `Home.tsx` 内有 185 次十六进制色值、18 个 `text-[11px]`、18 张业务 `Card`、55 个 `Chip` 调用、7 个输入控件。
- `index.css` 308 行，14 组 `@keyframes`、16 处动画声明。
- 生产构建：46 modules，JS 317.37 kB / gzip 101.30 kB；CSS 22.33 kB / gzip 5.42 kB。
- 当前 `lint` 与 `build` 在本机通过；这只证明编译级健康，不代表功能、无障碍或发布安全通过。

### 浏览器实测

对 320、360、390、768、1024、1440 目标宽度执行了 DOM/几何核查。浏览器控件会保留约 10px 内部边缘，因此页面 `clientWidth` 分别约为 310、350、380、758、1014、1430；正文没有非预期横向滚动。溢出元素仅是两个固定装饰圆，父层 `overflow-hidden`，不是内容滚动风险。

在 390px：

- 页面高度 8,837px，正文约 4,041 字。
- 2,088 个元素、162 个 SVG、160 个小人节点、184 个带动画节点。
- 151 个可聚焦项，其中 146 个按钮。
- 145/146 个可见按钮至少一边小于 44px；常见 Chip 高 40px，预设/关闭按钮为 36px。
- 所有 range 轨道盒高 10px，虽然伪元素拇指为 28px，但无 label，且可见/命中状态不够明确。
- 移动底部结果胶囊位于首张卡内容上方，覆盖城市/婚史区域；无 `safe-area-inset-bottom`。

## 3. 产品与信息架构

### 现状流程

`Hero → 基础范围 → 预设 → 14+ 条件卡 → 漏斗 → 反向自评 → 数据来源`。只有一个 `/` 路由，没有步骤状态、进度、已选汇总、撤销/重做、分类搜索、放宽建议或分享预览。

### 核心问题

1. **主要结果直到用户理解 18 张卡之后才完整出现。** 桌面结果常驻是优点，但手机只有覆盖内容的胶囊。
2. **所有卡片几乎同权。** 人口范围、敏感健康、收入、MBTI、星座都使用同一种卡片结构，用户无法快速理解哪些改变人口、哪些只影响匹配或娱乐。
3. **操作成本过高。** 151 个焦点站点，键盘/读屏用户要穿过大批按钮；普通用户也需在 8,837px 页面中记忆已选项。
4. **基础状态自相矛盾。** 默认已经限定性别、26–34 岁、全国、未婚；`result.steps.length === 0` 却被叫“待开筛”。婚史全取消时 UI 看似无选择，引擎又退回未婚（`calc.ts:186`）。
5. **层级语义不连续。** 页面由 `h1` 直接跳至大量 `h3`，步骤标题用普通 `div/span`，数据来源才出现 `h2`。

### 数据可信度表达

- `SOURCES` 只有名称、简述、年份和 1–3 级图标，没有 URL、文献标识、表号/页码、访问日期、数据版本或适用人群；用户无法从界面复核任何具体系数。
- 同一来源卡同时混合官方统计、论文/行业报告、综合推算与“趣味估算”，但 `📊 / 📑 / 🤔` 没有文字图例，也没有解释“直接数据、模型推断、娱乐假设”的边界。
- 年份字段存在“近年”“流调”“2000–2025”这类不可复现口径；模型注释中的中间推导、插值、相关性折扣和默认假设没有对应到来源条目。
- 来源区位于 8,000px 以上长页底部，结果卡没有逐项溯源入口；用户先看到确定性的百分比与人数，后看到不可点击的来源摘要，信任顺序倒置。
- 发布验收应要求每个影响人数的参数具备稳定来源 ID、URL/DOI、版本、适用范围、直接/推断标签及“查看计算依据”；无法复核的条件只能进入娱乐层，不能改变人口结论。

完整目标流程见 [APP_FLOW.md](./APP_FLOW.md)。

## 4. 视觉审计

### 保留资产

- 奶油纸底、深紫墨线、有限马卡龙色与硬边贴纸，是可持续品牌骨架。
- 实时反馈、稀有度印章、小人漏斗具有传播记忆。
- 系统字体正文 fallback 已存在；不依赖图片素材也能保持完整界面。

### 视觉层级

- 首屏品牌标题占据最大权重，而用户最关心的估算结果在手机端只是一条底栏；权重倒置。
- 18 张卡均使用饱和底色、粗框、倾斜、阴影、emoji、证据 badge，缺少主/次表面。
- `fade-up + tilt + hover translate` 叠加，静态阅读仍持续被环境动效、扫光、旋转和小人干扰。
- 手机 390px 截图显示底部胶囊横跨并遮住卡片下沿；桌面右侧 80 小人占据首屏最大面积，模型结果反而在下一卡片以下。

### 字体与可读性

- Google Fonts（`ZCOOL KuaiLe`、`Long Cang`）既有隐私/国内可用性风险，也导致字体失败时品牌层级突变。
- 多处 11px、12px 长说明承载 AND/OR/嵌套等关键语义，不是“辅助信息”；用户若不读就会误解计算。
- 对比度计算：深紫 `#3b3050` 以 50%/55%/60% 混合在白色或马卡龙表面时仅约 2.58–3.65:1；常规文本 WCAG AA 需 4.5:1。马卡龙背景上的 `/70` 也常只有约 4.2–4.4:1，仍不稳定。

设计令牌与替代层级见 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)。

## 5. 无障碍风险清单

| 风险 | 实测/源码证据 | 修复验收 |
|---|---|---|
| Chip 无状态语义 | `Chip` 仅通过 class/阴影表示 active；浏览器 `aria-pressed=0` | 所有 toggle button 有 `aria-pressed`；单选组用 radio 语义 |
| 滑杆无名称 | 4 个可见 range 均 `labels=0` 且无 `aria-label` | 每个滑杆有持久 label、当前值、上下限；双范围需分别命名 |
| 结果变化不可感知 | `aria-live=0`；数字每帧 `setState` | 视觉数字可动画，读屏摘要去抖后一次 `aria-live=polite` |
| 移动抽屉无关联 | 无 `aria-expanded`、`aria-controls`、面板 id | 触发器状态/面板关联完整；打开后焦点管理，Esc/关闭返回触发器 |
| 装饰污染树 | `aria-hidden=0`；160 个小人带 title，被读作大量职业 | 整体漏斗视觉 `aria-hidden=true`，旁设一次性文字摘要/表格 |
| 标题跳级 | `h1 → h3 × 18 → h2` | 每一步 `h2`，卡片 `h3`，抽屉标题结构独立可读 |
| 焦点样式不足 | CSS 对 range/输入 `outline:none`；实测输入 outline 透明，仅边框变淡紫 | 全局 `:focus-visible` 3px 高对比焦点环，不能仅换边框色 |
| 触控目标过小 | 145/146 按钮有维度 <44；关闭按钮 74×36 | 核心/频繁控件至少 44×44，密集 Chip 最小高 44 |
| 动画负担高 | 初始 184 动画节点；小人/扫光/漂浮/旋转并行 | 默认无持续动画；仅事件反馈；reduced-motion 下无位移/自动滚动 |
| emoji/SVG 语义混乱 | 多数装饰 SVG/emoji 无隐藏，环形文案也可进树 | 装饰隐藏；信息图提供明确 label/文本等价物 |
| SplitChars 重复朗读风险 | 父 span `aria-label`，子字符仍在树 | 子字符容器 `aria-hidden=true` 或仅渲染一次可访问文本 |
| 颜色/透明度对比不足 | 多处 `text-[#3b3050]/50-60` 和 11px | 正文/说明使用不透明语义色并通过 axe + 对比度实测 |
| 表单错误无关联 | number 只有 min/max，输入 0 被修成 1；无 message | `aria-invalid`、`aria-describedby`、就地错误；不得悄悄改值 |
| 抽屉背景未管理 | 手写 fixed panel，无 dialog 语义 | 使用可访问 dialog/drawer primitive 或完整实现 inert/focus trap |
| 页面语言虽正确但状态措辞不清 | `lang=zh-CN` 已有；“待开筛”与默认范围冲突 | 初始读屏摘要明确“当前基础池已计算” |

## 6. 响应式与性能风险

- 320–390px 主内容不横向溢出，但双滑杆换行、固定宽 `w-32/w-40`、`pl-[4.5rem]` 造成局部节奏松散；200% 缩放未形成专门布局。
- 1024px 仍落在 `lg:hidden` 一侧（Tailwind `lg` 起点 1024 CSS px，但实测 clientWidth 1014），会显示移动底栏；设备缩放、滚动条、浏览器边缘可能让临界宽度行为抖动。
- 桌面和移动两套 `PeopleFunnel` 都在 DOM，仅通过 CSS 隐藏；因此初始有 160 人、162 SVG，而非视口实际所需的 80。
- 每个小人有多段 transition/animation，`will-change: transform` 长期占用；低端手机风险明显。
- `useCountUp` 每帧触发 React state，读屏若直接 live 会造成轰炸；需要隔离视觉与可访问摘要。
- `PeopleFunnel` effect 依赖 `steps` 数组，条件变化时创建随机 ghost/timer；`Math.random` 不在 render，但输出不可复现，且 StrictMode 下需确保清理稳定。

## 7. 隐私、网络与分享

### 现状正向证据

- 业务源码没有 `fetch/axios/XHR/WebSocket/sendBeacon`，也没有 local/session storage、cookie、analytics 或错误上报。
- `.env.local` 未跟踪且被 `app/.gitignore:27` 忽略；只核查了变量名，未输出秘密值。
- 当前筛选仅在 React 内存，未写 URL 或日志。

### 风险

1. `index.html` 主动连接 `fonts.googleapis.com` 与 `fonts.gstatic.com`，页面打开即产生第三方请求；这与“完全本地、不会调用第三方”的直觉冲突。
2. 没有页面级隐私说明：是否保存、是否上传、如何清空、第三方字体、分享包含什么都未明确。
3. 分享卡会写入城市、年龄、性别、全部计算步骤，并在有自评时写“你是…/互相心动概率”；无预览、无字段清单、无敏感默认排除。
4. `canvas.getContext('2d')!`、`toDataURL`、`a.click()` 均无失败处理。`onShare` 的 `finally` 会恢复 loading，却没有 `catch` 或消息；失败对用户是沉默的。
5. Canvas 字体等待依赖 `document.fonts.ready`；外网失败虽然 catch，但分享图字体/排版可能变化且没有说明。

### 分享链路异常矩阵

| 异常点 | 当前行为 | 目标行为 |
|---|---|---|
| `document.fonts.ready` 失败/卡顿 | catch 后静默继续，排版可能漂移 | 使用本地/系统字体并设置生成超时；预览与成图一致 |
| `getContext('2d')` 返回 `null` | 非空断言，随后抛异常 | 返回可识别错误，展示重试与文字版 |
| Canvas 编码失败/内存不足 | `toDataURL` 同步抛错或占用高峰 | 优先 `toBlob`，捕获失败，释放 URL |
| 浏览器阻止程序化下载 | `a.click()` 后无成功证据 | 监听下载/提供显式链接与系统分享备选 |
| 用户取消系统分享 | 当前无系统分享分支 | 区分取消与失败，不显示红色错误 |
| 敏感字段被带入 | 完整 Selection/steps 直接用于渲染 | allow-list DTO；预览中逐项可见且敏感默认关闭 |
| 多次点击 | 按钮 disabled，但失败没有恢复指引 | 状态机保证幂等，可重试且不重复下载 |
| 分享错误日志 | 当前无日志策略 | 仅记录错误类型/版本，不记录筛选值 |

## 8. 工程与生产风险

- `vite.config.ts` 无条件加载开发检查插件，已实证泄露 `code-path`。
- 无根级 Error Boundary、无可恢复错误页面。
- `vercel.json` 只有 SPA rewrite，没有 CSP、HSTS、X-Content-Type-Options、Referrer-Policy、Permissions-Policy。
- `BrowserRouter` 与 `base:'./'`/SPA rewrite 的部署组合需统一；当前只有根路由，尚未暴露刷新问题。
- Node 实际为 v24.18.0，npm 11.16.0；项目没有 `engines`、`packageManager`、`.nvmrc/.node-version`，未锁受支持 LTS。
- PowerShell 环境禁用了 `npm.ps1`，本机命令必须使用 `npm.cmd`；README 应说明 Windows 路径。
- README 仍是 Vite 模板；没有 LICENSE、PRIVACY、SECURITY、CHANGELOG、CI、发布/回滚或密钥轮换说明。
- `npm audit` 默认镜像 `npmmirror` 不实现审计接口，必须显式 `--registry=https://registry.npmjs.org` 才有可靠结果。
- `.env.local` 包含一个被忽略的本地平台令牌变量；没有发现跟踪中的 `.env`/密钥文件，但应增加 secret scan。

## 9. 分阶段执行清单

### Phase 1 — Critical

1. 重建信息架构和结果语义：人口/匹配/娱乐分轨，基础池始终可见。
2. 拆分 `Home.tsx`、`calc.ts`、分享、数据来源、维度注册和状态层。
3. 落地无障碍基础组件：Button/Chip/Field/Range/Drawer/LiveRegion/ErrorBoundary。
4. 开发插件只在 dev；删除远程字体；增加安全头与生产泄露扫描。
5. 分享改为预览和隐私控制，补全成功/失败/重试/文本降级。
6. 删除未使用依赖、修复 high/critical，建立统一 `npm run check`。

### Phase 2 — Refinement

1. 应用语义设计令牌，清除业务硬编码色与魔法尺寸。
2. 把 11px 长解释提升为可展开“为什么”，正文至少 15–16px。
3. 结果、步骤、已选项、维度、证据分层；桌面 360px sticky，手机 safe-area drawer。
4. 只挂载当前步骤和当前视口需要的漏斗；减少 DOM 与动画。
5. 状态矩阵覆盖 empty/invalid/no-data/very-small/share/offline/reduced-motion。

### Phase 3 — Polish

1. 条件影响过渡、步骤进出与结果印章使用 160–240ms 短动效；无持续扫光/旋转。
2. 对关键宽度、200% zoom、系统大字、键盘、读屏、reduced-motion 做视觉/交互回归。
3. Lighthouse/axe、核心计算 p95、bundle/DOM 指标建立预算并记录设备条件。

## 10. 已执行命令与限制

```text
npm.cmd run lint                                      PASS (0 errors)
npm.cmd run build                                     PASS
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org --json
                                                       FAIL: 1 high, 0 critical
npm.cmd audit --registry=https://registry.npmjs.org --json
                                                       FAIL: 10 high, 1 moderate, 1 low
rg production artifact for code-path/local paths      FOUND code-path leak
browser checks at 320/360/390/768/1024/1440           completed
```

未执行 axe/Lighthouse 的原因：基线没有安装对应工具，且并行主任务正在重装依赖；本报告不虚假宣称 AA 或性能通过。无障碍静态/DOM证据已经足以确定 P0，最终产品仍必须用 axe + 人工键盘/读屏复验。
