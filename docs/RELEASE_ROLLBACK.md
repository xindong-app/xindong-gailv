# 发布与回滚手册

更新日期：2026-08-13

## 发布原则

发布是外部状态变更，需要部署账号、候选域名和负责人授权。本仓库只准备可发布静态产物和平台配置，不自动执行公网发布。

## 1. 冻结候选版本

1. 确认工作树仅包含计划中的文件：`git status --short`。
2. 核对 `app/package.json` 应用版本、`src/model/versions.ts` 模型/数据版本、证据登记、CHANGELOG 和场景对比一致。
3. 模型或数据语义变化必须有新版本和影响报告；只改 UI 不应伪造数据版本。
4. 为候选提交记录 commit SHA；建议打本地 annotated tag，例如 `v1.0.0`（正式推送由仓库负责人执行）。

## 2. 干净构建与完整验收

在新的工作副本或确认无本地依赖污染后：

```powershell
cd F:\AI\择偶概率软件\app
npm.cmd ci --registry=https://registry.npmjs.org
npx.cmd playwright install chromium
npm.cmd run check
```

门禁必须依次覆盖：Git 已跟踪及未忽略候选文件的密钥扫描、typecheck、lint、全部 Vitest、模型验证、生产构建、产物扫描、E2E 和官方 registry 生产依赖审计。不能用跳过用例、放宽 axe impact 或删除失败断言来“通过”。

## 3. 候选环境核验

将 `app/dist/` 发布到受控预览环境，核对：

- `/任意路径` 返回 SPA `index.html`，静态资源 200 且带 immutable 缓存。
- HTTPS 响应包含 `app/vercel.json` 中的安全头；CSP 没有阻止脚本、样式、图片下载。
- 320、360、390、768、1024、1440px 关键流程无溢出；另以 720px 布局视口验证 1440px 桌面在 200% 页面缩放下的等效重排与可达性；键盘和读屏语义可用。
- 控制台 error 为 0；除用户点击公开来源外，没有第三方请求。
- 分享默认不含敏感项；成功下载、失败重试和文字降级都可复现。
- 首页展示模型与数据版本；极小结果文案不声称绝对不存在。

保存候选 URL、commit SHA、`npm run check` 摘要与桌面/手机截图。受本地环境影响无法可靠测量的 Lighthouse/真实 INP/LCP 应明确标注，不得用实验室推测冒充线上数据。

## 4. 正式发布

1. 从已验收的 commit 构建，不从开发目录手工挑文件。
2. 使用平台的不可变部署或保留上一版本部署 ID。
3. 切换流量后执行最小 smoke：加载、一个硬条件、软偏好不改人口、结果解释、分享预览、来源链接。
4. 观察平台 4xx/5xx 与 CSP 报错；本应用不应新增包含选择内容的应用日志。

## 5. 回滚触发条件

出现以下任一情况立即回滚，不等待“继续观察”：

- 白屏、核心计算异常、默认人口为 0 或明显数量级偏差。
- 敏感字段未经确认进入分享、URL、日志或远程请求。
- CSP/静态路由造成主要浏览器不可用。
- 生产包泄漏 source map、本地路径、凭证或开发检查插件。
- high/critical 供应链事件影响实际生产依赖且无可信缓解。

## 6. 回滚步骤

优先使用托管平台的“恢复上一不可变部署/流量别名”能力；不要在生产服务器上手工编辑文件。

若必须从 Git 重建：

```powershell
git log --oneline --decorate -n 20
git worktree add ..\heart-probability-rollback <last-known-good-sha>
cd ..\heart-probability-rollback\app
npm.cmd ci --registry=https://registry.npmjs.org
npm.cmd run check
npm.cmd run build
```

从该隔离 worktree 发布 `dist/`。不要在主工作区执行 `git reset --hard` 或覆盖用户未提交内容。回滚后记录事故窗口、受影响版本、触发条件和恢复部署 ID；修复应走新的候选流程，而不是在旧生产包上打补丁。

## 7. 数据/模型回退

数据与代码是同一发布单元。不要只替换 `evidence-registry.json` 或人口表而保留新版本号。回退模型时必须同时回退 schema、数据、证据登记、版本常量、黄金场景和文档，确保分享战报仍可按版本审计。
