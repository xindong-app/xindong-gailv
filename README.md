# 心动概率局全面升级交付

可运行应用位于 [`app/`](./app/README.md)。

```powershell
cd F:\AI\择偶概率软件\app
npm.cmd ci --registry=https://registry.npmjs.org
npm.cmd run dev
```

完整发布验收使用 `npm.cmd run check`。模型、数据、隐私、安全、依赖和回滚文档位于 [`docs/`](./docs/)。升级前基线与升级后发布候选均保存在当前本地 Git 仓库；正式公网部署仍需按发布手册在有权限的候选环境验收。
