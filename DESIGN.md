# DESIGN.md

> 一张安静但有梗的马卡龙研究手账：先看懂结果，再享受贴纸和彩蛋。

## 1. Visual Theme & Atmosphere

**Style**: 成熟马卡龙手账 / 数据小剧场
**Keywords**: 温暖、可信、克制、手绘、清晰、轻娱乐、可解释、无羞辱
**Tone**: 轻松坦诚、有梗但不轻佻 — NOT 企业仪表盘、糖果轰炸、伪科学占卜
**Feel**: 像朋友在奶油色便签本上，用四支荧光笔认真拆解一个脑洞。

**Interaction Tier**: L1 精致静态
**Dependencies**: CSS only；不加载远程字体、滚动劫持、WebGL 或动画库。

## 2. Color Palette & Roles

```css
:root {
  --bg: #fffaf2;
  --surface: #ffffff;
  --surface-alt: #f7f1e8;
  --surface-hover: #fffdf9;
  --border: #d9cfc2;
  --border-strong: #3e334f;
  --border-hover: #756783;
  --text: #2f273c;
  --text-secondary: #5f566b;
  --text-tertiary: #766d80;
  --accent: #a43f78;
  --accent-hover: #873060;
  --accent-soft: #f9dbe7;
  --sky: #dceff7;
  --mint: #dfeeda;
  --sun: #ffedb5;
  --lilac: #e9e0f6;
  --peach: #f8d9c1;
  --success: #28705b;
  --error: #a5323f;
  --warning: #8a5a00;
  --focus: #6d4aff;
  --bg-rgb: 255, 250, 242;
  --accent-rgb: 164, 63, 120;
}
```

**Color Rules:**
- 所有业务颜色只引用语义变量；组件中不写十六进制色值。
- 每屏最多一个主要强调色，分类色只用于解释分类，不争夺 CTA。
- 正文与辅助文字均达到 WCAG 2.2 AA；不以颜色作为唯一状态信号。
- A/B/C/D 证据等级使用文字徽章与色彩双编码。

## 3. Typography Rules

**Font Stack:** 不发起第三方字体请求；使用系统中文字体，避免隐私、断网和国内网络问题。

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Hero H1 | `STKaiti`, `KaiTi`, system | clamp(2.4rem, 7vw, 4.8rem) | 800 | 1.08 | .02em |
| Section H2 | system Chinese sans | clamp(1.45rem, 3vw, 2rem) | 800 | 1.3 | .02em |
| H3 | system Chinese sans | 1.05rem | 750 | 1.45 | .02em |
| Body | system Chinese sans | 1rem | 400 | 1.75 | .02em |
| Label | system Chinese sans | .875rem | 700 | 1.5 | .02em |
| Mono/Code | `SFMono-Regular`, Consolas | .8125rem | 500 | 1.6 | 0 |

**Typography Rules:**
- 正文不得小于 15px；长解释默认 16px / 1.75。
- 仅品牌标题可使用楷体 fallback，功能界面全部使用易读无衬线系统字体。
- **NEVER use**: 依赖 Google Fonts 的字体、低于 12px 的说明、低对比透明文字。

**Text Decoration:** Hero H1 无渐变、无多层投影；用短下划线贴纸标记建立品牌感。正文不装饰。

## 4. Component Stylings

### Buttons

```css
.button { min-height: 44px; border: 2px solid var(--border-strong); background: var(--surface); color: var(--text); }
.button:hover { background: var(--surface-hover); transform: translateY(-1px); }
.button:active { transform: translateY(1px); box-shadow: none; }
.button:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
.button:disabled { cursor: not-allowed; opacity: .52; transform: none; }
```

### Cards

```css
.card { border: 1px solid var(--border); border-radius: 20px; background: var(--surface); }
.card:hover { border-color: var(--border-hover); }
.card:focus-within { box-shadow: 0 0 0 3px rgba(var(--accent-rgb), .16); }
```

### Navigation

```css
.step-nav { background: rgba(var(--bg-rgb), .96); border-bottom: 1px solid var(--border); }
.step-nav [aria-current='step'] { background: var(--text); color: var(--surface); }
```

### Links

```css
.link { color: var(--accent-hover); text-decoration-thickness: 2px; text-underline-offset: 3px; }
.link:hover { color: var(--accent); }
.link:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
```

### Tags / Badges

```css
.badge { min-height: 28px; border: 1px solid var(--border); border-radius: 999px; background: var(--surface-alt); color: var(--text-secondary); }
.chip[aria-pressed='true'] { border-color: var(--border-strong); background: var(--accent-soft); box-shadow: 2px 2px 0 var(--border-strong); }
.chip:focus-visible { outline: 3px solid var(--focus); outline-offset: 3px; }
```

### Dialogs and Toasts

```css
.dialog-backdrop { background: rgba(47, 39, 60, .56); }
.dialog { border: 2px solid var(--border-strong); background: var(--surface); box-shadow: 8px 8px 0 var(--border-strong); }
.toast[data-state='success'] { border-left: 5px solid var(--success); }
.toast[data-state='error'] { border-left: 5px solid var(--error); }
```

## 5. Layout Principles

**Container:**
- Max width: 1240px
- Padding: clamp(16px, 3vw, 32px)
- Narrow variant: 720px

**Spacing Scale:** 4, 8, 12, 16, 24, 32, 48, 64px。
**Section padding:** 24–40px；**Component gap:** 12–20px；**Card padding:** 18–24px。

```css
.workspace { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 24px; }
.option-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
```

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | 1px 边框，无阴影 | 次要解释、维度行 |
| Subtle | `0 8px 24px rgba(47,39,60,.08)` | 主内容卡 |
| Sticker | 3px 实线 + 4px 硬阴影 | 唯一主 CTA、结果印章 |
| Modal | 2px 实线 + 8px 硬阴影 | 分享预览、确认框 |

## 7. Animation & Interaction

**Motion Philosophy**: 反馈优先，只动 opacity 与 transform；持续动画为零。
**Tier**: L1。

```css
@keyframes page-enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.step-panel { animation: page-enter 240ms cubic-bezier(.16,1,.3,1) both; }
.button, .chip, .card { transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
}
```

步骤切换后焦点落在新步骤标题；结果用 `aria-live="polite"`；保存、分享和错误状态用 toast 文案同步反馈。

## 8. Do's and Don'ts

### Do
- 先呈现估算范围与“模型不是事实”，再呈现梗。
- 四类条件在名称、徽章、结果作用上保持一致。
- 每个步骤只有一个明确主要动作。
- 敏感项默认折叠，分享默认排除。
- 触控目标至少 44×44px，并提供完整键盘顺序。
- 用系统字体与本地计算支持离线降级。

### Don't
- ❌ 不把软偏好或娱乐条件乘进人口。
- ❌ 不把模型推算统称“官方数据”。
- ❌ 不使用“互相心动概率”或预测具体感情结果。
- ❌ 不把疾病、收入、婚史、性取向或身体状况当笑点。
- ❌ 不使用连续旋转、漂浮、彩带雨或 80 个可访问性节点。
- ❌ 不用大量倾斜卡片与同权色块制造噪声。
- ❌ 不使用小于 15px 的正文或仅靠透明度弱化内容。
- ❌ 不将敏感筛选写入 URL、日志或默认分享图。
- ❌ 不加载第三方字体或分析脚本。
- ❌ 不用假精确小数和未经校准的固定“误差倍数”。

## 9. Responsive Behavior

| Name | Width | Key Changes |
|------|-------|-------------|
| Desktop | ≥ 1024px | 两列工作区，结果 360px sticky |
| Tablet | 768–1023px | 单列，顶部简化结果摘要 |
| Mobile | < 768px | 单列步骤、底部结果胶囊、全屏结果抽屉 |

**Touch Targets:** minimum 44×44px。
**Collapsing Strategy:** 步骤导航横向可滚动；选项由两列降为一列；结果面板变为带 safe-area 的底部抽屉；任何宽度不使用固定像素内容宽度。

```css
@media (max-width: 1023px) { .workspace { grid-template-columns: 1fr; } .result-desktop { display: none; } }
@media (max-width: 767px) { .option-grid { grid-template-columns: 1fr; } .mobile-result { padding-bottom: max(12px, env(safe-area-inset-bottom)); } }
```
