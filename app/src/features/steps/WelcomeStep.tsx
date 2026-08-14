import { CoverShow } from '../../fun/CoverShow'

export function WelcomeStep({ onStart, onOpenInfo }: {
  onStart: () => void
  onOpenInfo: (which: 'method' | 'privacy' | 'house-rules') => void
}) {
  return (
    <section className="step-panel welcome-step welcome-cover" aria-labelledby="welcome-title">
      <div className="cover-poster">
        <CoverShow />
        <div className="cover-scene-copy">
          <span className="eyebrow cover-eyebrow">匿名 · 本地计算 · 透明模型</span>
          <h2 id="welcome-title" tabIndex={-1} className="cover-title">稀有的是条件组合，<em>不是人的价值</em></h2>
          <p className="lead cover-lead">勾条件 → 小人排队挨刀 → 揭榜看还剩几个。</p>
        </div>
      </div>
      <button className="button button-primary button-large welcome-cta cover-cta" type="button" onClick={onStart}>🎯 开筛！</button>
      <p className="cover-whisper">后台已有 80 个小人排队等着挨刀 · 数字全程有出处，梗全程免费</p>
      <div className="cover-under">
        <p className="cover-fineprint">不撮合、不拉郎配、不预测真实爱情结果——数据只负责告诉你池子多大。</p>
        <nav aria-label="说明与规则" className="cover-links">
          <button type="button" onClick={() => onOpenInfo('method')}>怎么算的</button>
          <button type="button" onClick={() => onOpenInfo('privacy')}>隐私</button>
          <button type="button" onClick={() => onOpenInfo('house-rules')}>玩前须知</button>
        </nav>
      </div>
    </section>
  )
}
