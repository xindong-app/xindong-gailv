# 心动概率局

「心动概率局」是一款匿名、本地计算、以透明统计模型支撑的轻娱乐择偶条件分析工具。它回答的是“在给定统计口径下，满足一组条件的人群大约有多少”，不是实名名册、婚恋建议、个人价值评分或爱情成功率。

当前版本：应用 `1.0.0`；模型 `3.1.0`；数据 `2026.08.14.2`。

## 产品能力

- 7 步移动优先流程：边界 → 基础范围 → 核心条件 → 维度库 → 敏感/娱乐 → 结果解释 → 分享。
- 69 个原子维度，明确区分硬筛选、相关硬条件、软偏好与娱乐项。
- 主人数只计算有可靠同口径参数的硬条件，并返回未量化硬条件、人数上限与不可用状态；结果页已按三态完整呈现，未量化硬条件逐项列明。
- 学历按七普表 4-1 的 18—50 岁逐岁×性别直接人数进入主人口；专科、本科、硕士、博士为互斥精确类别。收入、资产、住房、车辆、体型、疾病等仍不会用不相容的宏观率硬扣人数；软偏好和娱乐项不减少人口池。
- 当前56个可选城市均有本市政府/统计部门常住人口锚点，并由算法 API 输出 C 级宽情景；其中49城来自2025第一财经商业榜单，另保留7城兼容。名单外或未来缺少已登记数据的外部城市仍返回 `unavailable`，不用历史约数冒充精确值。
- 关系情境支持男找女、女找男、男找男、女找女，并把取向相容、当前单身、关系意愿与主人口分层；揭榜页关系情境卡已接入（本人统计性别自愿填写）。
- 分享图在本地 Canvas 生成。算法/隐私审核发现现有分享 DTO 与文案仍有待前端修复的敏感派生信息和地域侧漏风险，不能把它当作 v3 已完成能力。
- 纯前端单页应用，无账号、无分析脚本、无后端筛选 API。当前生产页仍加载 Google Fonts，与隐私文档不一致，列为前端发布阻断。

## 环境

- Node.js `>=24 <25`
- npm `>=11 <12`

项目使用锁定版本，首次安装请在 `app` 目录运行：

```powershell
cd F:\AI\择偶概率软件\app
npm.cmd ci --registry=https://registry.npmjs.org
```

PowerShell 执行策略可能阻止 `npm.ps1`/`npx.ps1`，此时使用 Windows 自带的 `npm.cmd`/`npx.cmd`，不需要修改系统执行策略。

## 本地运行

```powershell
npm.cmd run dev
```

Vite 默认地址为 `http://localhost:3000`。开发模式只用于本机；生产验收使用构建后的预览服务器。

## 测试与质量门禁

首次运行浏览器测试前安装 Chromium：

```powershell
npx.cmd playwright install chromium
```

常用命令：

```powershell
npm.cmd run typecheck       # TypeScript
npm.cmd run lint            # ESLint，0 warning
npm.cmd run test            # 单元/组件/模型/性质/分享/性能
npm.cmd run validate:model  # 代表性场景与证据登记校验
npm.cmd run build           # 生产构建
npm.cmd run scan:dist       # 源码路径、调试标记、source map、体积预算
npm.cmd run scan:secrets    # 扫描已跟踪/未忽略候选文件，不读取真实 .env* 内容
npm.cmd run test:e2e        # 18 条必测旅程、28 项 E2E；六宽度、720px 的 200% 缩放等效、axe
npm.cmd run audit:prod      # 官方 npm registry 生产依赖审计
npm.cmd run check           # 完整发布门禁
```

`check:fast` 不启动浏览器；`check` 包含生产构建、E2E 和依赖审计。Playwright 失败证据位于应用目录 `app/output/playwright/`（已被 Git 忽略）。

## 构建与部署

```powershell
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1
```

静态产物位于 `app/dist/`。`vercel.json` 已配置 SPA 回退、长期缓存和 CSP/HSTS/nosniff/Referrer-Policy/Permissions-Policy 等响应头。发布到其他静态平台时，必须等价配置这些响应头与 `index.html` 回退；不要把 `.env*`、源码映射或本地部署元数据上传为站点文件。

正式公网发布、域名、账号和平台设置不在仓库内自动执行。发布与回滚步骤见 [RELEASE_ROLLBACK.md](../docs/RELEASE_ROLLBACK.md)。

## 架构

```text
src/
├─ pages/Home.tsx           # 7 步应用壳与全局状态编排
├─ features/steps/          # 各步骤 UI
├─ model/                   # 运行时 schema、维度注册表、版本
├─ data/                    # 单岁人口、证据登记和数据锚点
├─ engine/                  # 确定性计算、影响与解释
├─ share/                   # 分享白名单 DTO、Canvas 与文字降级
├─ components/              # 可访问组件、结果与漏斗
└─ hooks/                   # 历史与安全会话草稿
```

业务选择先通过 Zod schema，再进入纯函数计算引擎。分享渲染器不接收原始选择，只接收经过 allow-list 策略生成的 DTO。

## 数据、模型和边界

- [模型方法](../docs/MODEL_METHOD.md)
- [v3 现行模型语义](../docs/MODEL_V3_METHOD.md)
- [同性/异性关系情境层](../docs/RELATIONSHIP_SCENARIO_METHOD.md)
- [数据来源](../docs/DATA_SOURCES.md)
- [数据更新流程](../docs/DATA_UPDATE.md)
- [升级前后场景对比](../docs/MODEL_SCENARIO_COMPARISON.md)
- [隐私说明](../docs/PRIVACY.md)
- [安全说明](../docs/SECURITY.md)
- [依赖与许可证](../docs/DEPENDENCIES.md)
- [变更记录](../docs/CHANGELOG.md)

乐观/基准/保守是联合概率界与已登记宽情景传播形成的敏感度范围，不是抽样校准的置信区间。模型可信度与单项证据等级分开展示，且不会高于最弱启用人口组的证据等级。低于模型分辨率表示“现有数据无法可靠区分”，不表示现实中绝对不存在。

## 贡献约束

1. 模型、数据或维度语义变化时同步更新版本、证据登记、测试和场景对比。
2. 新的硬筛选必须有口径、来源、公式、证据等级与边界；没有可靠人口比例时保留为未量化硬条件，主结果必须标为上限，不得发明发生率。
3. 不把完整选择写入 URL、日志、分析平台或持久存储。
4. 提交前运行 `npm.cmd run check`，并保留可复核的命令结果和必要视觉证据。

项目当前为私有工作区交付，未声明开源再授权条款；第三方依赖按各自许可证使用。
