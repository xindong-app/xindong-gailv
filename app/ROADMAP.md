# 心动概率局 · 优化方案总览（30 条灵感 + 实现路径）

> 配套文档：`DESIGN.md`（设计纲领与铁律）。本文档是全量优化项的台账与实施路线图。
> 状态标记：✅ 已上线｜🚧 一期（骨架）｜📦 二期（装备）｜🥚 三期（彩蛋）｜🔮 远期

---

## 一、已完成并验证（前三轮迭代产物）

| # | 项目 | 实现路径 |
|---|------|---------|
| ✅ | 游乐园质感层：展示字体（后于 v3 封版轮切系统栈，移除第三方字体外联）、纸张噪点、按钮弹簧触感、chip 回弹、步骤条闯关地图、欢迎页贴纸 | `src/index.css` 覆盖层；纯 CSS |
| ✅ | 揭榜仪式感：聚光灯扫过 + 钢印重新砸落 + tada 音效 | `ResultsStep.tsx` revealKey + `index.css` .reveal-spotlight + `fun/sound.ts` playTada |
| ✅ | 战报卡二维码（uqr 矩阵直绘 canvas，静默降级）+ 双向命中分上卡 | `share/canvas.ts` / `dto.ts` / `types.ts` / `text.ts` |
| ✅ | 音效默认开启（opt-out 存 localStorage） | `fun/sound.ts` |
| ✅ | 25 城职业皮肤小人 + 遗言弹幕 + 刀光震屏 + 关卡横幅 | `fun/skins.tsx` / `fun/FunFunnel.tsx` |
| ✅ | 稀有度六档钢印 + 毒舌总评 + 清华/双色球类比 | `fun/rarity.ts` |
| ✅ | 剧场骨架：单栏叙事 + 去框化 + 底部常驻舞台 + 幕布开场 + 老虎机数字 | `Home.tsx` / `fun/Stage.tsx` / `fun/IntroCurtain.tsx` / `fun/SlotNumber.tsx` |
| ✅ | 19 张 AI 剪纸贴纸接入三关道具卡 + 图例 | `public/assets/stickers/` + `fun/stickers.ts` + `fun/DimensionSticker.tsx` |
| ✅ | 战报卡 2.0 收藏卡：条件贴纸墙 + 淘汰分镜胶片带 + 画布 1080×1560 | `share/canvas.ts` |
| ✅ | 毒舌总评脱敏：未公开敏感维度以「某个神秘条件」代称 | `fun/rarity.ts` + `share/dto.ts` + 回归测试 |
| ✅ | 反向挑战书（PK 入口）：固定文案一键复制，不带任何用户数据 | `share/challenge.ts` + ShareStep 挑战卡 |
| ✅ | 已装备章（宝库角章 + 硬核卡题内章，砸落式动画） | `DimensionLibraryStep.tsx` / `CoreCriteriaStep.tsx` + `index.css` |
| ✅ | 音效 2.0 精简版：chip 啵声全局接入 + 数字提交盖章砰 | `fun/sound.ts` + `components/ui.tsx` |
| ✅ | 条件卡呼吸光（focus-within 同色系微光） + 文字版片尾彩蛋 | `index.css` / `share/text.ts` |

---

## 二、🚧 一期：剧场骨架（当前待开工）

| # | 想法 | 具体内容 | 实现路径 |
|---|------|---------|---------|
| 1 | **剧场式单栏骨架** | 砍两栏仪表盘 → 单栏居中叙事流（~760px）；顶部极简无框；关卡进度变虚线路径 ●──●──◍──○ | `Home.tsx` 布局重构（去掉 workspace 双栏 grid）；`index.css` 重写 .workspace/.step-nav；算法不动 |
| 2 | **去框化** | 色块代替描边（玫瑰带=外貌、薄荷带=生活习惯…）；组内 1px 细分隔线；贴纸风每屏 ≤3 处 | `index.css` 重写 .criteria-card/.dimension-card/.step-panel；按维度分组加 data-band 属性 |
| 3 | **底部常驻舞台带** | 全场唯一深色区：天鹅绒底+暖黄脚灯+聚光灯；80 小人实时淘汰赛常驻；超大数字字幕屏；手机端为底部抽屉可上滑全屏 | FunFunnel 从 ResultSummary 拆出 → 新组件 `fun/Stage.tsx` 全局粘性挂载于 Home；selection 变化即重渲染（frames 已有 WeakMap 缓存） |
| 4 | **幕布开场** | 暗场→小人 stagger 跑入（0.02s 间隔）→标题逐字砸落→logo 钢印+tada→幕布向两侧拉开直接露出主界面；每会话首次播放、可跳过、reduced-motion 直跳 | 新组件 `fun/IntroCurtain.tsx`（CSS clip-path 幕布 + 逐字 animation-delay）；sessionStorage `xindong.intro.seen` 标记 |
| 5 | **剪纸皮肤** | ⑰ 撕边分隔（SVG 锯齿+1px 深色纸厚度）⑱ 浮动软阴影 ⑲ 笔刷笔触按钮（clip-path 笔触遮罩 + seed 随机） | `index.css` 新增 .torn-edge 工具类 + SVG mask；按钮底色改笔触 |
| 6 | **老虎机大数字** | 最终人数滚动到位（老虎机式），滚动时小人仰头 | 升级 `fun/useCountUp.ts` 为逐位滚动；ResultSummary/Stage 接入 |

## 三、📦 二期：装备与氛围

| # | 想法 | 实现路径 |
|---|------|---------|
| 7 | **道具卡插画**（AI 剪纸贴纸） | image_generation 插件统一 prompt 逐张生成 → `public/assets/stickers/*.webp` → 维度注册表加 sticker 字段（仅呈现层映射，不动数据数学）；Open Doodles（CC0）兜底；加载失败回落现状 |
| 8 | **卡片翻面盖"已装备"章** | ✅ 已上线（角章+题内章形式，未做 3D 翻面） |
| 9 | **宝库卡片飞向舞台** | FLIP 动效：getBoundingClientRect 起止点 + transform 过渡 |
| 10 | **开屏剧本卡四选一** | WelcomeStep 改四张横排剧本卡（含"我自己写"）；预设逻辑复用现有 PRESETS |
| 11 | **音效 2.0**（chip 啵/按钮 click/翻页 whoosh/纸片声㉖/印章声㉗/幕布声㉘） | ✅ 精简版已上线（chip 啵 + 盖章砰）；翻页/纸片/幕布声待补 |
| 12 | **条件色带呼吸发光** | ✅ 已上线 |
| 13 | **节日限定舞台㉓** | `fun/seasonal.ts` 按日期返回主题（七夕/520/圣诞），Stage 条件渲染皮肤层 |
| 14 | **战报卡=演出票根⑫** | `share/canvas.ts` 重绘：撕线（虚线+半圆缺口）、座位号=稀有度、检票=现有二维码 |

## 四、🥚 三期：彩蛋与爆发

| # | 想法 | 实现路径 |
|---|------|---------|
| 15 | **0 人空舞台+追光+旁白+一键撤销** | Stage 检测 estimate≤0：追光 CSS + 旁白条 + 复用现有 onRelax/undo |
| 16 | **COMBO 连击⑧** | FunFunnel 记录时间戳序列，10s 内 3 次 → 飘字层 + playLevelUp 升调 |
| 17 | **小人回头看⑦** | Stage 给幸存者加 .stare 态（tilt 向条件卡方位）1s |
| 18 | **SSR 二次揭幕⑩** | Stage 幕布合拢→拉开 + 金色 Confetti（复用 Confetti.tsx 换色）+ 灰尘粒子（CSS 粒子） |
| 19 | **"就差一点"字幕⑪** | 复用 result.relaxations 数据，Stage 字幕条滚动播报 |
| 20 | **修罗场模式⑭** | logo 连击计数（5 次/2s）→ body[data-mode=roast]，文案映射表切换 + 小人墨镜 SVG 层 |
| 21 | **深夜档⑮** | `new Date().getHours() >= 23` → Stage 蓝调主题 + 旁白替换 |
| 22 | **"全网最狠"烫金章⑯** | rarity.ts 已有神话级判定 → 追加隐藏章组件 + 战报卡烫金（canvas 渐变填充） |
| 23 | **文字版彩蛋结尾⑬** | ✅ 已上线（片尾字幕行） |

## 五、🔮 远期（需要新能力/后端，先记录不排期）

| # | 想法 | 依赖 |
|---|------|------|
| 24 | **双人合卡⑳** | 需链接携带条件摘要（URL 编码 selection 白名单字段），两张卡本地拼合；无后端可做 v1 |
| 25 | **条件投票㉑** | 需后端存储票数（Supabase/Neon 已有插件可接） |
| 26 | **盲盒开局㉒** | 纯前端：内置 3 套"热门组合"预设即可 v1 |
| 27 | **视角反转㉔** | 算法已有双向命中，只是入口重构 |
| 28 | **调音台推子㉕** | input[type=range] 皮肤 + WebAudio 纸带声 |
| 29 | **池子记忆㉙** | sessionStorage 存上次 estimate，WelcomeStep 读 |
| 30 | **每日一签㉚** | 纯前端文案池 + 日期 seed；可单独分享图（复用战报卡管线） |

---

## 六、🧱 技术债（2026-08-14 实测记录，待 Codex 审核轮处理）

**JS 总预算 146.1 / 150 KiB（v3 证据投影裁剪后余量 3.9 KiB）。** 实测结论（sourcemap 归因 + manualChunks 对照实验）：

- 预算扫描口径是 dist **全部** JS 的 gzip 总量；纯静态分包不减肥，实测反而 +4.6 KiB（已还原配置，未提交）
- 包体实测构成（v3 前）：react 59.6 / 应用自身 72.9 / zod 18.1 / uqr 3.8 KiB gzip
- **最大赘肉 = zod 的 JSON-Schema 生成器**（json-schema-processors + to-json-schema 等约 229 KiB 源码中相当一部分）：运行时零调用，被 `import { z } from 'zod'` 命名空间导入整体物化拖进包里
- 涉及文件：`src/model/schema.ts`、`src/engine/modelEngine.ts`、`src/data/evidence.ts`（Codex 领地，未动）
- 建议方案：三处改为具名 core 导入（避开 `z` 命名空间物化），链式 API 全保留、语义零变化；预期 −5~7 KiB。109 个测试可兜底验证
- 备选：预算口径改"首屏入口 ≤150 + 总量 ≤180"，之后分享栈（canvas+uqr ≈ 8 KiB）做 React.lazy 才有意义

## 七、📊 数据债（v3 降级维度的恢复路线，权威台账以 docs/DATA_UPDATE.md 优先队列 + docs/DATA_SOURCES.md 为准）

| 维度 | 当前状态 | 恢复级别 | 依赖 | 前端预案 |
|------|---------|---------|------|---------|
| 学历 | v3 降级为未量化（不砍人，主数字转上限） | **下一模型版本 Data-P0**（非当前发布 P0） | 七普表 4-1 整理成 18–50 逐岁×性别机器表（DATA_SOURCES 已定口径） | 漏斗规则用 `isDimensionAppliedToMainEstimate` 门控，数据恢复即自动归队；第二关文案需改回"计入" |
| 收入 | research_only（仅研究情景，无运行时数值） | **Data-P1** | 就业状态 + 年龄×性别×地区收入分布 | 恢复后作为第二层宽估算呈现，届时加"收入情景"副展区 |
| 资产/房/车 | research_only | 暂难 | 个人名下、本地、类型面积的同口径微观表 | 保持"硬边界已保留未量化"清单呈现 |

---

## 执行铁律（全程有效）

- 不改 `src/engine` / `src/data` / `src/model` 的数学与校验（Codex 领地）
- 不改测试锚定的功能文案与组件名（181 个 vitest + 28 个 E2E 必须保持绿）
- 所有动效 prefers-reduced-motion 降级；手机 375px 优先验收
- JS gzip ≤ 150 KiB、CSS ≤ 25 KiB 预算不破
- 外部素材只进本地 `public/assets/`，许可优先 CC0 / 免费可商用 / AI 自生成
- 每期完成：typecheck + test + lint + validate:model + build + scan:dist + 截图验收 + git commit，不主动部署
