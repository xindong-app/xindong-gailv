# 安全说明

更新日期：2026-08-13

## 安全边界

心动概率局是无账号、无后端数据库的静态单页应用。主要风险不是服务端越权，而是供应链、静态托管配置、DOM/Canvas 输入处理、分享泄漏以及开发/本地配置误提交。

## 已实施控制

### 输入与计算

- 全部模型输入通过 Zod 严格 schema；未知字段、非法枚举、年龄反序和越界数值被拒绝。
- 计算引擎是确定性纯函数，不执行用户输入中的代码，不拼接 HTML。
- React 默认转义界面文本；代码中不使用 `dangerouslySetInnerHTML`。
- Error Boundary 不记录错误对象，避免把完整选择泄漏到控制台或遥测。

### 隐私和分享

- 不把选择放入 URL、远程请求、持久化日志或分析平台。
- 会话恢复只保存非敏感白名单。
- 分享采用 allow-list DTO；未知字段被丢弃，敏感项需要双重显式同意。
- Canvas、编码和下载均检查失败状态；Object URL 在动作后撤销。

### 构建与供应链

- 依赖使用精确版本和 `package-lock.json`，干净环境使用 `npm ci`。
- npm 11 的依赖脚本白名单只批准精确版本 `esbuild@0.28.2`；它为 Vite/tsx 安装当前平台二进制。其他新增安装脚本会在 `npm ci` 时继续提示，不能静默扩大。
- CI 和发布门禁通过官方 npm registry 审计生产依赖，高/严重漏洞会失败。
- `scan-secrets.ts` 扫描 Git 已跟踪和未跟踪但未忽略的候选文件；发现未忽略的真实 `.env*`（无秘密的 `.env.example` 除外）就阻断，但绝不读取其内容；同时检测私钥、常见平台令牌和高风险凭证赋值。
- `scan-dist.ts` 阻止 source map、本地绝对路径、`code-path`、检查插件、debugger 和开发 React 标记进入生产包，并检查 JS/CSS gzip 预算。
- `.env*`、部署元数据、构建产物和 Playwright 证据均被 Git 忽略。

### 响应头

`app/vercel.json` 为所有路径配置：

- `Content-Security-Policy`：默认同源；禁止对象和被嵌入；限制脚本、连接、字体、图片和表单目标。
- `Strict-Transport-Security`：两年、子域和 preload；仅应在全站 HTTPS 的正式域名启用。
- `X-Content-Type-Options: nosniff`。
- `X-Frame-Options: DENY` 以及 CSP `frame-ancestors 'none'`。
- `Referrer-Policy: strict-origin-when-cross-origin`。
- `Permissions-Policy`：禁用相机、麦克风、定位、支付、USB 等未使用能力。
- `Cross-Origin-Opener-Policy` 与 `Cross-Origin-Resource-Policy` 为同源。

其他托管平台必须配置等价响应头并用真实 HTTPS 响应验证，不能仅以配置文件存在作为已生效证明。

## 本地密钥与轮换

仓库不需要运行时密钥。若本地部署工具创建 `.env.local` 或平台凭证：

1. 不要打印、打开或提交真实值；确认 `git status` 中没有对应文件。
2. 如果凭证曾进入 Git、构建产物、聊天、日志或公开制品，应立即在来源平台吊销/轮换；删除本地文件不等于撤销。
3. 用无秘密的 `.env.example` 只记录变量名和用途。
4. 运行 `npm.cmd run scan:secrets`；它覆盖已跟踪和未忽略的候选文件，但只能发现已知模式，不能替代人工复核和平台侧 secret scanning。

## 发布前验证

```powershell
cd F:\AI\择偶概率软件\app
npm.cmd ci --registry=https://registry.npmjs.org
npm.cmd run check
```

另外必须在候选 HTTPS 地址验证响应头、SPA 回退、缓存策略、外部请求、控制台错误和分享下载。正式发布到公网需要部署账号授权，不由仓库脚本自动执行。

## 报告漏洞

当前仓库没有公开安全邮箱。若作为公开产品发布，应在发布前补充专用安全联系渠道、支持范围和响应时限，避免在公开 Issue 中粘贴敏感复现数据。报告时请使用合成筛选，不附带真实个人信息或平台凭证。

## 已知限制

- CSP 为支持当前界面样式使用 `style-src 'unsafe-inline'`；脚本仍严格同源且不允许 inline/eval。未来可消除动态内联样式后收紧。
- 静态托管访问日志由最终平台控制，本仓库无法保证平台层日志生命周期。
- 本地剪贴板和下载权限由浏览器管理，失败时只能提供人工复制降级。
- 自动密钥扫描基于模式匹配，不能证明所有秘密均不存在。
