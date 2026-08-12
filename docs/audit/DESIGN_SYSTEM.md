# 心动概率局语义设计系统

> 目标：保留“马卡龙手绘贴纸”的识别度，把视觉权重还给结果、当前步骤和核心操作。业务组件只能引用语义令牌；颜色、尺寸、动效不再散落硬编码。

## 1. 品牌原则

1. **温暖但可信**：奶油纸底与手账线条保留；模型边界、证据等级和隐私必须清晰。
2. **有梗但不羞辱**：梗指向条件组合/模型，不指向疾病、婚史、收入、性取向或人的价值。
3. **装饰服从信息**：每屏最多一个贴纸级强调和一个短反馈动效。
4. **四类条件可辨**：硬条件、相关硬条件、软偏好、娱乐条件通过文字 badge + 轻量分类色双编码。

## 2. 色彩令牌

建议沿用根目录 `DESIGN.md` 已提出的可访问色板，并增加明确别名：

```css
:root {
  --color-canvas: #fffaf2;
  --color-surface: #ffffff;
  --color-surface-subtle: #f7f1e8;
  --color-surface-hover: #fffdf9;
  --color-text: #2f273c;
  --color-text-muted: #5f566b;
  --color-text-subtle: #766d80;
  --color-border: #d9cfc2;
  --color-border-strong: #3e334f;
  --color-brand: #a43f78;
  --color-brand-hover: #873060;
  --color-brand-soft: #f9dbe7;
  --color-focus: #6d4aff;
  --color-success: #28705b;
  --color-warning: #8a5a00;
  --color-danger: #a5323f;
  --color-hard: #dceff7;
  --color-correlated: #ffedb5;
  --color-soft: #dfeeda;
  --color-fun: #e9e0f6;
  --color-sensitive: #f8d9c1;
}
```

规则：

- `--color-text-muted/subtle` 是不透明实体色，禁止用主文字 `/50`、`/60` 承载正文。
- 彩色表面只作为分类提示或单个结果印章；大面积表面使用白/米色。
- error/warning/success 不只靠颜色：必须有图标/标题/文字。
- 所有正文、交互文字、焦点环在真实背景上达到 WCAG 2.2 AA。

## 3. 字体与字号

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
  "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
--font-brand: "STKaiti", "KaiTi", var(--font-sans);

--text-xs: 0.8125rem; /* 13px，只用于短元数据 */
--text-sm: 0.9375rem;  /* 15px */
--text-md: 1rem;       /* 16px，正文默认 */
--text-lg: 1.125rem;
--text-xl: 1.375rem;
--text-2xl: clamp(1.75rem, 4vw, 2.5rem);
--text-hero: clamp(2.4rem, 7vw, 4.8rem);
```

- 长解释不得小于 15px / 1.65 行高。
- 手写/楷体仅用于 Hero、结果一句话和短贴纸，功能标签与数据一律 sans。
- 数字使用 tabular numerals；估算值按模型分辨率舍入，不用假精确小数。
- 默认不请求第三方字体；需要品牌字时自托管并提供 `font-display: swap`。

## 4. 间距、尺寸、圆角与层级

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
--space-7: 3rem;
--space-8: 4rem;

--radius-control: 0.875rem;
--radius-card: 1.25rem;
--radius-pill: 999px;
--target-min: 2.75rem; /* 44px */

--shadow-card: 0 8px 24px rgb(47 39 60 / 8%);
--shadow-sticker: 4px 4px 0 var(--color-border-strong);
--z-sticky: 20;
--z-drawer: 40;
--z-toast: 60;
```

- 最大容器 1240px；内容 padding `clamp(16px,3vw,32px)`。
- 桌面工作区 `minmax(0,1fr) 360px`；结果面板 sticky。
- 卡片默认 1px 边框/无倾斜；只有结果印章或主 CTA 可用粗边硬影。
- 手机固定栏 padding-bottom：`max(12px, env(safe-area-inset-bottom))`；正文预留等高空间。

## 5. 组件契约

### Chip / Toggle

- 多选：`button type="button" aria-pressed={selected}`。
- 单选：原生 radio 或 `role="radiogroup"`/`role="radio" aria-checked`。
- 44px 最小高度；选中状态同时包含 icon/check、边框和背景。
- 文案必须说明语义，例如 `偏好 · 会做饭`，不能把视觉颜色当分类唯一线索。

### RangeField

- 每个 thumb 有唯一 label（“最低年龄”“最高年龄”“最低身高”）。
- 同步显示值、单位、允许范围；错误用 `aria-invalid` + `aria-describedby`。
- 双范围滑杆必须保序且键盘可用，不能靠视觉位置猜测。

### ResultSummary

顺序固定：

1. 满足硬条件的估算人数及范围。
2. 模型可信度与低于分辨率状态。
3. 软偏好契合与娱乐指数。
4. 最大影响条件/放宽建议。
5. 数据/模型版本和免责声明。

视觉数字可平滑过渡；读屏使用去抖后的单句 `aria-live="polite"`，不逐帧播报。

### EvidenceBadge

- A：直接统计；B：透明转换；C：交叉推算；D：娱乐假设。
- badge 可聚焦/可打开来源详情；来源名称必须是链接而非纯文本。
- 主界面展示等级和一句口径，方法详情进入 drawer/dialog。

### Drawer / Dialog

- `aria-labelledby`、`aria-describedby`、焦点进入/返回、Esc、背景 inert、滚动锁完整。
- 分享预览、清空确认和移动结果面板复用同一可访问 primitive。

### Toast / InlineStatus

- 分享、恢复、保存、错误都必须有视觉反馈；成功/错误由 `role=status`/`role=alert` 按紧急度表达。
- 错误不得包含原始筛选值或敏感资料。

## 6. 动效令牌

```css
--motion-fast: 160ms;
--motion-normal: 240ms;
--ease-standard: cubic-bezier(.2,.8,.2,1);
```

- 允许：选择反馈、步骤淡入、结果数值过渡、抽屉进入。
- 禁止：持续旋转徽章、无限扫光、永久漂浮、每次渲染随机装饰、42 片彩带常驻。
- 只动 `opacity/transform`，高度展开需有低成本替代。
- `prefers-reduced-motion: reduce` 下移除所有非必要位移和自动滚动；内容立即稳定出现。

## 7. 响应式规则

| 范围 | 布局 | 结果入口 |
|---|---|---|
| `<768px` | 单列步骤；维度选项按内容一/二列 | safe-area 底部摘要 + 全屏/近全屏 drawer |
| `768–1023px` | 单列，选项两列，顶部/底部结果摘要 | drawer；不得因 1024 临界宽度抖动 |
| `≥1024px` | 主内容 + 360px sticky 结果 | 常驻，不再重复挂载移动漏斗 |

- 在 320/360/390/768/1024/1440 及 200% zoom 下，无内容遮挡、非预期横向滚动和不可达操作。
- DOM 只挂载当前视口需要的结果组件；不要桌面/移动各放 80 个小人再 CSS 隐藏。

## 8. 可访问性验收

- axe serious/critical = 0；Lighthouse Accessibility 目标 ≥95（记录环境）。
- 全键盘可完成添加、删除、返回、清空、查看结果、分享预览与失败重试。
- 可见焦点为 3px 高对比环，offset ≥2px。
- 标题为 `h1 → h2(step) → h3(section)`。
- 触控目标 ≥44×44；说明文本 ≥15px；正文对比 ≥4.5:1。
- 装饰从树中隐藏；漏斗提供简洁文字/表格等价摘要。
