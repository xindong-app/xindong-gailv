# 依赖与许可证

更新日期：2026-08-13。精确版本以 `app/package-lock.json` 为准；本表说明项目直接依赖的用途和许可证。间接依赖可通过 npm lockfile 或 SBOM 工具在发布时重新导出。

## 生产依赖

| 包 | 锁定版本 | 用途 | 许可证 |
|---|---:|---|---|
| `react` | 19.2.8 | 界面组件与状态 | MIT |
| `react-dom` | 19.2.8 | 浏览器渲染 | MIT |
| `zod` | 4.4.3 | 运行时输入和证据 schema | MIT |

生产运行不加载 CDN、Google Fonts、分析 SDK、广告 SDK、远程模型 SDK 或后端客户端。

## 主要开发依赖

| 包 | 锁定版本 | 用途 | 许可证 |
|---|---:|---|---|
| `vite` / `@vitejs/plugin-react` | 8.2.1 / 6.0.5 | 开发与生产构建 | MIT |
| `typescript` | 6.0.3 | 静态类型检查 | Apache-2.0 |
| `vitest` / `jsdom` | 4.1.10 / 30.0.1 | 单元、组件和模型测试 | MIT |
| `@playwright/test` | 1.62.1 | Chromium 用户旅程和响应式测试 | Apache-2.0 |
| `@axe-core/playwright` | 4.13.0 | WCAG 自动检查 | MPL-2.0 |
| `@testing-library/react` / `user-event` | 16.3.2 / 14.6.4 | 可访问语义驱动组件测试 | MIT |
| `fast-check` | 4.9.0 | 性质测试 | MIT |
| `eslint` / TypeScript/React 插件 | 9.39.2 等 | 代码规范与 hooks 规则 | MIT |
| `tsx` | 4.23.12 | 模型验证和门禁脚本 | MIT |

## 治理规则

- 生产与开发依赖均使用精确版本；`npm ci` 依据 lockfile 复现。
- `package.json#allowScripts` 仅批准构建链所需的精确 `esbuild@0.28.2` 安装脚本；升级版本必须重新审查并显式更新白名单。
- 依赖安装与漏洞审计固定使用 `https://registry.npmjs.org`，避免镜像 API 不完整导致假通过。
- 每次发布运行 `npm audit --omit=dev --audit-level=high`；生产 high/critical 为阻断项。
- 开发依赖漏洞仍需评估其是否能影响构建产物或 CI 凭证，不能因 `--omit=dev` 自动忽略风险。
- 新增依赖前先检查现有平台/标准 API 能否满足需求，并记录用途、许可证、包体和维护状态。
- 不允许为了 UI 方便恢复整套未使用组件库；动态导入和配置引用需人工复核后再删除。

## 许可证边界

本项目自身当前未声明开源再授权许可证，因此默认不授予第三方复制、修改或分发本项目源代码的权利。第三方包仍按各自许可证提供；发布方需保留这些许可证要求和必要 notices。本文不是法律意见，正式商业分发前应由有权限的负责人完成许可证审查。
