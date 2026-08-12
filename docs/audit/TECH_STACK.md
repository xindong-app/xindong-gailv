# 技术栈与依赖审计

## 1. 基线栈

| 层 | 当前 | 判断 |
|---|---|---|
| UI runtime | React 19.2.x + React DOM | 合理保留 |
| Routing | react-router 7.x，只有 `/` | 可选；分步单页未必需要路由 |
| Language | TypeScript 5.9 strict | 合理保留，需加 runtime schema |
| Build | Vite 7.x | 合理保留，但当前版本有安全公告，需升级 |
| Styling | Tailwind 3.4 + PostCSS + 自定义 CSS | 可保留；需语义 token/组件化 |
| Runtime schema | zod 已声明但未导入 | 应真正使用，或删后换等价轻量方案 |
| UI primitives | 25+ Radix 包声明，源码无导入 | 大规模未使用，清理 |
| Charts/forms/etc. | recharts、react-hook-form、date-fns 等声明，源码无导入 | 清理，按真实需求重新引入 |
| Testing | 无单测/E2E/axe 工具 | 必须补齐 |
| Deploy | Vercel rewrite | 缺安全头/发布回滚说明 |

锁文件为 npm lockfile v3，基线 root 仍是 `my-app@0.0.0`，共 533 个 package entries。`package.json` 有 46 个 production 直接依赖、18 个 dev 直接依赖；没有 `engines` 或 `packageManager`。

## 2. 直接依赖实际使用

静态 import/require 审计结果（CSS 构建链另计）：

### 确认业务使用

- `react`, `react-dom`
- `react-router`（只有 App/main）

### 仅被未使用内部工具引用

- `clsx`, `tailwind-merge` → `src/lib/utils.ts` 的 `cn()`；`cn()` 无调用。

### 声明但业务源码无包级导入

- `@hookform/resolvers`
- 全部 25+ `@radix-ui/react-*`
- `class-variance-authority`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`
- `lucide-react`, `next-themes`, `react-day-picker`, `react-hook-form`
- `react-resizable-panels`, `recharts`, `sonner`, `vaul`, `zod`

其中 `zod` 是目标架构所需能力，但“已安装未使用”仍是事实；应在统一 schema 落地后才视为有效依赖。

### 构建/质量链实际使用

- `@vitejs/plugin-react`, `vite`, `typescript`
- `tailwindcss`, `postcss`, `autoprefixer`, `tailwindcss-animate`
- `eslint`, `@eslint/js`, `typescript-eslint`, react hooks/refresh plugins, `globals`
- `kimi-plugin-inspect-react` 当前使用，但只能开发模式启用

`@types/*` 由 TypeScript 自动消费，静态源码扫描无法直接体现，不能据此删除。

`tw-animate-css` 未引用；`App.css` 未导入；`useIsMobile`、`cn()` 无调用，均为清理候选。

## 3. 漏洞审计

默认 npm registry 指向 `npmmirror`，其 audit endpoint 返回 404；可靠审计必须指定官方 registry。

### Production only

命令：

```text
npm.cmd audit --omit=dev --registry=https://registry.npmjs.org --json
```

结果：1 high / 0 critical。命中 `lodash <=4.17.23`，当前安装 `4.17.21`；`npm explain lodash` 显示由未使用的 `recharts@2.15.4` 引入。最小修复不是加 override 掩盖，而是删除未使用 `recharts` 及其链，再重审。

### Full tree

命令：

```text
npm.cmd audit --registry=https://registry.npmjs.org --json
```

结果：10 high / 1 moderate / 1 low / 0 critical。涉及：

- 直接：`vite`（多项路径遍历/任意文件读）、`postcss`（路径/源码映射相关）。
- 间接：`rollup`, `lodash`, `brace-expansion`, `flatted`, `js-yaml`, `minimatch`, `nanoid`, `picomatch`, `ajv`, `@babel/core`。

注意：完整审计发生在 2026-08-13，公告与版本会继续变化；修复后必须重跑，不能只依据本文版本号。

## 4. 生产产物与网络

### 产物

- build 通过：JS 317.37 kB / gzip 101.30 kB；CSS 22.33 kB / gzip 5.42 kB。
- 产物明确包含 `code-path="src\\pages\\Home.tsx:..."`，属于开发检查插件注入。
- 未发现业务 fetch/analytics，但 Vite modulepreload polyfill 自带 same-origin `fetch`，不是用户数据上传。

### 页面网络

- 基线 `index.html` 预连接并加载 `fonts.googleapis.com` / `fonts.gstatic.com`。
- 这会暴露访问元数据、受国内网络影响，并破坏离线字体一致性。
- 目标为自托管/系统字体，业务运行除站点静态资源外零第三方请求。

## 5. 运行时与包管理

本机实际：Node `v24.18.0`、npm `11.16.0`。项目未声明受支持版本。应选择团队/部署平台均支持的 Node LTS，并在以下位置统一：

- `package.json.engines`
- `packageManager: npm@...`
- `.nvmrc` 或 `.node-version`
- CI 与部署说明

PowerShell ExecutionPolicy 禁止直接执行 `npm.ps1`；Windows 文档应使用 `npm.cmd` 或 `cmd /c npm ...`。

## 6. 配置与发布风险

- `vite.config.ts` 的 `inspectAttr()` 无环境门控；开发插件进入生产。
- `vercel.json` 无安全头。
- 无 CI、Dependabot/Renovate、license review、release、rollback、secret scan。
- `.env.local` 正确忽略且未跟踪；存在一个本地平台令牌变量，但本文未读取/输出值。
- 无 Error Boundary；关键流程异常会导致空白/崩溃。
- 无统一 `npm run check`，无正式 unit/model/E2E/a11y/visual 测试。

## 7. 建议最小依赖面

### Runtime

- 必需：`react`, `react-dom`。
- 按落地后保留：`zod`（统一运行时 schema）、一个 dialog primitive、一个 toast 实现。
- 条件式：`react-router` 仅当步骤/方法页需要稳定路由；否则删除。
- 删除所有没有真实 import/测试覆盖的组件与图表/form 依赖。

### Dev

- `vite`, `@vitejs/plugin-react`, `typescript`, ESLint 栈。
- Tailwind/PostCSS 栈若继续采用则保留并升级安全版本。
- 新增 Vitest、Testing Library、Playwright、axe 集成、artifact/secret/license scan。
- `kimi-plugin-inspect-react` 仅 dev command 动态启用；也可完全移除。

## 8. 清理与验证顺序

1. 用源码 import + 配置引用 + `npm explain` 建立删除列表。
2. 删除未使用直接依赖并更新唯一 lockfile，不手工改 lock。
3. 升级 Vite/PostCSS/ESLint 相关链到修复版本。
4. `npm ci` 验证干净安装。
5. 依次运行 typecheck、lint、unit、model、build、artifact scan、E2E。
6. 官方 registry 下 production/full audit；production high/critical 必须为 0。
7. 生成依赖许可清单与例外说明。
