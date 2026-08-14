# 前端 v3 接入完成 · 终态复核转交说明

交接日期：2026-08-14
交接方向：Kimi（前端）→ Codex（终态复核 / 封版）
目标提交：`cf1b947`（前端接入），叠于 `bd4e2cd`（v3 算法与数据终态）之上
对应审计：`./ALGORITHM_DATA_RELEASE_REVIEW_2026-08-14.md` 第 5 节（Kimi 前端待办）

## 0. 验收证据（可复跑）

`F:\AI\择偶概率软件\app` 下：

- `npm run check:fast`：通过（secret scan / typecheck / ESLint 0 warning / 181 项 Vitest / validate:model / build / scan:dist）
- `npm run test:e2e`：**28/28 通过**（接入前基线为 23/28，5 个失败项全部销号）
- 生产 JS gzip 146.1 KiB（预算 150）；CSS gzip 13.9 KiB（预算 25）
- 工作树干净；3000/4173/5199 端口均已释放；未部署

## 1. 第 5 节待办逐条销项

### P0：分享默认泄露反向自评派生分 —— 已修复

- `src/share/types.ts`：`ShareDto.scores` 删除 `bidirectional` 字段
- `src/share/dto.ts`：移除派生分支；`src/share/text.ts`、`src/share/canvas.ts`、`src/components/SharePreviewDialog.tsx` 同步删除全部输出面
- 回归测试（断言真实键与真实文案）：`tests/share/share-policy.test.ts` → `never leaks the reciprocal-derived bidirectional score into any share output`（断言 `dto.scores` 无 `bidirectional` 属性、序列化无该键、文字版无"双向命中"）

### P1：v3 结果契约接入 —— 已完成

- 三态独立状态组件：`ResultSummary.tsx` 内 `PopulationStateNotice`（`unavailable` / `upper_bound` / `model_underflow` 三态分卡）
- `upper_bound`：逐项列出 `coverage.unquantifiedHardConditions`（label + reason），主文案明确"这是上限，不是精确点数"
- `unavailable`：禁用人数派生、稀有度、漏斗与分享趣味推导；`Stage.tsx` 改空舞台说明（"不可用 ≠ 0 人"）；`buildShareDto` 在该状态下不产出 `population` / `fun` 块，占位 0 不再可能被渲染为"神话级 / 亿里挑一"
- `zeroMeaning`：`model_underflow` 与 `positive_below_resolution` 在结果页有不同文案；`unavailable` 与 0 人严格区分
- 关系情境入口：`src/components/RelationshipScenarioCard.tsx`（揭榜页挂载）。本人统计性别自愿填写（不写入会话草稿），支持男找女/女找男/男找男/女找女；三因素分别呈现范围与证据级（D/NA），组合态覆盖 `scenario / not_estimated / unavailable`；文字级标注"低可信宽情境 · 非官方人数 · 不属于主人口结果"，UI 使用 lilac 娱乐色系与主结果区隔
- 漏斗诚实化：`src/fun/funnelFrames.ts` 关卡经 `isDimensionAppliedToMainEstimate` 门控，只保留可量化关卡（身高/吸烟/饮酒）；收入、资产、学历、体型等不再被画成"淘汰 0%"
- 硬条件声明：`Home.tsx` 以 UI 态持有 `hardRequirementIds`（仅传入仍处选中态的 id，防止预设/清空后 `ModelRequirementError`），揭榜页"硬边界声明（高级）"区可逐项声明已选软偏好；声明后 `population.status` 转 `upper_bound` 并当场可见

### P1：一键放宽接线错误 —— 已修复

- 新增 `src/features/applyRelaxation.ts`：与引擎 `removeDimension` 同语义；年龄放宽恢复 18–50 全量程（`MIN/MAX_MODEL_AGE`），不再回表单默认 26–34；其余维度委托 `removeSelectionDimension`
- 回归测试 `tests/features/apply-relaxation.test.ts`：断言年龄变 18–50、放宽后人数与引擎建议值相等、原选择不可变；E2E `11 影响排行和一键放宽` 通过（放宽 → 撤销恢复）

### P1：分享两条旁路 —— 已封堵

- 城市皮肤侧漏：`buildShareDto` 在 `showRegion=false` 时以 `['全国']` 调用 `pickProf`，"胡同大爷"等城市角色不再上卡；回归测试 `uses only nationwide generic people on the card when region is hidden`
- 毒舌总评旁路：**"神秘条件"写法已整体删除**。总评只用"已公开且已量化"的条件帧重算；无可言条件时整段省略——隐藏条件的存在性与强度均不泄露。测试改写为 `computes the verdict only from public quantified conditions, omitting it otherwise`（默认省略断言 + 隐藏吸烟对公开总评零影响的等价断言 + 公开收入仍不得称其为"淘汰最多一刀"）

### P1：第三方字体 —— 已移除

- `index.html` 删除 `fonts.googleapis.com` / `fonts.gstatic.com` 全部 3 条 link
- `--font-display` 切系统栈（PingFang SC / Hiragino / Microsoft YaHei / Source Han Sans SC）
- E2E `17 离线` 与 `console 与生产网络` 通过，未放行任何第三方域名

### P1：概率化与羞辱性文案 —— 已清扫

- 稀有度六档评语改为人群比例口径，删除"遇见概率≈彩票头奖/建议买彩票对冲"；`buildComparisons` 删除双色球类比，仅保留"同龄人考上清华占比"这一人群频率参照
- 毒舌玩笑表只保留可量化维度（身高/烟/酒）；"投胎确实是门技术活"等收入/资产类玩笑随未量化维度一并移除
- 漏斗遗言删除"穷是我的错吗/身材管理大失败/植发分期/我恨我的基因"等收入与身体类台词（相关维度 v3 已不产生漏斗帧，属死文案清理）
- 第二关/第四关 v3 语义文案修正："硬边界 · 暂不砍人"徽章与 FieldHelp 明确"选中即转上限、不编造比例"

### P1：1024px 横向溢出 —— 已修复

- 根因：`.preset-list` 网格 `repeat(3, 1fr)` 的 min-content 最小值在长文案下吹爆列宽
- 修复：`repeat(3, minmax(0, 1fr))` + 按钮 `min-width: 0`；六档宽度（320/360/390/768/1024/1440）与 200% 缩放等效用例全部无横向滚动（E2E 响应式套件通过）

### 陈旧断言（上限 + 低分辨率组合态）

- 前端已按结构化状态呈现；E2E 通过 `aria-label`（引擎 `display` 文案）断言组合态，不再依赖旧精确短文案。`test:e2e` 全绿即证据

## 2. 上限态稀有度的最终表述（共识第 2 条落点）

- 应用内：`RarityStamp` 稀有度文本变为"最多 十里挑一 · 仅按已计入条件"，章下正常字号注："加入尚未量化的硬条件后，真实稀有度只会更高——这是最低稀有程度，不是最终评级。"
- 分享卡：`ShareFunDto.upperBound` 标记驱动——`tierLabel` 追加"（最低稀有程度）"，`rarityText` 前缀"最多"，`tierComment` 替换为"加入尚未量化的硬条件后，真实稀有度只会更高"

## 3. 分歧点处理确认（Kimi 三条反对的最终态）

1. 神秘条件旁路：按 Codex 终版执行（公开重算 / 无则省略 / 测试改写），Kimi 的脱敏占位方案已废弃
2. 上限态稀有度：按 Codex 强化版执行（主文案 + "最低稀有程度"进等级标签，非小字后缀）
3. 数据台账：接受纠正——学历/收入已在 `docs/DATA_UPDATE.md` 优先队列与 `docs/DATA_SOURCES.md` 口径中登记；产品侧 `app/ROADMAP.md` 仅按共识补前端排期视角引用（学历 = 下一模型版本 Data-P0，非当前发布 P0；收入第二层 = Data-P1）；"第二高频条件"一说未经验证，未写入任何文档

## 4. 前端边界声明（未动算法/数据）

- 未修改 `src/engine`、`src/data`、`src/model` 任何文件；`computeModel` 仅新增第二个入参的消费（`hardRequirementIds`），数学路径零触碰
- 关系层仅通过 `computeRelationshipScenarioFromModel` 公开接口接入
- 关系情境结果**不进入分享 DTO**（沿用白名单机制，候选清单不含关系层字段）

## 5. 移交后建议的复核点

- `cf1b947` 中 `src/share/dto.ts` 的 fun 块产出条件（`status !== 'unavailable'` 才产出）与 verdict 的公开帧过滤
- `ResultSummary.tsx` 三态分卡与 `Stage.tsx` 空舞台的状态门控
- `RelationshipScenarioCard.tsx` 的文字级低可信标注是否满足"不靠颜色区分"要求
- 学历机器表恢复后，前端漏斗关卡与第二关文案需回切"计入"表述（ROADMAP 第七区已登记触发条件）

—— Kimi（前端）
