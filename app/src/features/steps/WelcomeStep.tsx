export function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <section className="step-panel welcome-step" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <span className="eyebrow">匿名 · 本地计算 · 透明模型</span>
        <h2 id="welcome-title" tabIndex={-1}>稀有的是条件组合，<em>不是人的价值</em></h2>
        <p className="lead">
          勾条件 → 小人排队挨刀 → 揭榜看还剩几个。数字全程有出处，梗全程免费。
        </p>
        <div className="trust-grid">
          <article><span aria-hidden="true">⌂</span><h3>只在本机</h3><p>筛选默认仅在浏览器内存和本次会话中计算，不上传、无账号。</p></article>
          <article><span aria-hidden="true">≋</span><h3>范围，不是假精确</h3><p>展示保守、基准、乐观估算；低于分辨率时明确说不知道。</p></article>
          <article><span aria-hidden="true">♢</span><h3>四条轨道</h3><p>硬条件影响人群；软偏好看契合；娱乐项只负责有梗。</p></article>
        </div>
        <div className="boundary-note">
          <b>成年人轻娱乐提示</b>
          <p>本工具不撮合、不评价谁高谁低，也不预测真实爱情结果。敏感条件由你主动展开，默认不进入分享。</p>
        </div>
        <button className="button button-primary button-large" type="button" onClick={onStart}>🎯 开筛！</button>
      </div>
      <div className="welcome-visual" aria-hidden="true">
        <div className="welcome-stickers">
          <span>💘</span><span>🎰</span><span>📉</span><span>🧧</span>
        </div>
        <div className="paper-heart">♡</div>
        <div className="formula-note"><b>人口范围</b><span>× 可解释条件</span><span>＋ 偏好契合</span><span>＋ 娱乐彩蛋</span></div>
        <div className="tape tape-one" />
        <div className="tape tape-two" />
      </div>
    </section>
  )
}
