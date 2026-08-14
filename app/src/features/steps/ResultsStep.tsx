import { useEffect, useState } from 'react'
import type { ModelResult } from '../../engine/modelEngine'
import { formatCount } from '../../engine/modelEngine'
import { ResultSummary } from '../../components/ResultSummary'
import { RelationshipScenarioCard } from '../../components/RelationshipScenarioCard'
import { playTada } from '../../fun/sound'
import type { GenderId, ModelSelection, SoftPreferenceId } from '../../model/schema'
import { DIMENSION_BY_ID } from '../../model/dimensions'
import { toggleArrayValue } from '../../model/selectionUtils'
import { declarableHardConditions } from '../../features/hardDeclaration'
import { Chip, EvidenceStatusBadge } from '../../components/ui'

export function ResultsStep({ result, selection, comparison, hardRequirementIds, seekerGender, onChange, onRelax, onShare, onCaptureComparison, onSeekerGender, onToggleHardRequirement }: {
  result: ModelResult
  selection: ModelSelection
  comparison: ModelResult | null
  /** 已声明为硬边界的已选软偏好(v3) */
  hardRequirementIds: readonly string[]
  seekerGender: GenderId | null
  onChange: (next: ModelSelection) => void
  onRelax: (dimensionId: string) => void
  onShare: () => void
  onCaptureComparison: () => void
  onSeekerGender: (gender: GenderId | null) => void
  onToggleHardRequirement: (dimensionId: string) => void
}) {
  // 揭榜仪式感: 进入本步时钢印重新砸落 + 聚光灯扫过 + tada 音效
  const [revealKey] = useState(() => Date.now())
  useEffect(() => {
    playTada()
    // 主数字必须完全露出在底部舞台之上: 滚到视口中偏上
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const numberEl = document.querySelector('.results-step .result-number')
    if (numberEl) {
      window.requestAnimationFrame(() => {
        numberEl.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
      })
    }
  }, [])
  const targetSoftIds = new Set<SoftPreferenceId>(selection.softPreferenceIds)
  if (selection.correlated.schoolTier) targetSoftIds.add('education.school')
  if (selection.correlated.healthCriteria.includes('no_myopia')) targetSoftIds.add('health.myopia')
  if (selection.correlated.healthCriteria.includes('no_major_chronic')) targetSoftIds.add('health.chronic')
  const reciprocalOptions = [...targetSoftIds].map((id) => DIMENSION_BY_ID.get(id)).filter(Boolean)
  // 可声明为硬边界的候选: 已选且未量化的软偏好(含结构化字段里的慢性病/近视)
  const declarableSoftIds = declarableHardConditions(selection)
  return (
    <section className="step-panel results-step" aria-labelledby="results-title">
      <div className="reveal-spotlight" aria-hidden="true" />
      <div className="step-heading"><span className="eyebrow">揭榜时刻</span><h2 id="results-title" tabIndex={-1}>先看战况，再看谁是守门员</h2><p>数字不是名单，范围不是置信区间，双向命中也不是爱情预测。每一层都能展开复核。</p></div>
      <ResultSummary headingId="main-result-summary-title" result={result} onShare={onShare} revealKey={revealKey} showFunnel={false} />
      {declarableSoftIds.length > 0 && (
        <article className="hard-declare-card" aria-labelledby="hard-declare-title">
          <div>
            <span className="eyebrow">高级 · 硬边界声明</span>
            <h3 id="hard-declare-title">把软偏好升级为硬边界</h3>
            <p>软偏好默认只影响契合度。声明为硬边界后，它会被当作严格条件列出——但因为缺少同口径数据，模型不会编造扣减比例，主数字会诚实地标为「上限」。</p>
          </div>
          <div className="chip-row">
            {declarableSoftIds.map((id) => {
              const dimension = DIMENSION_BY_ID.get(id)
              if (!dimension) return null
              const declared = hardRequirementIds.includes(id)
              return (
                <Chip key={id} active={declared} tone="peach" onClick={() => onToggleHardRequirement(id)}>
                  {declared ? '硬边界 · ' : ''}{dimension.label}
                </Chip>
              )
            })}
          </div>
          {hardRequirementIds.length > 0 && (
            <small className="hard-declare-note">已声明 {hardRequirementIds.length} 项：主人数现在是「满足已量化条件的人数上限」。</small>
          )}
        </article>
      )}
      <article className="comparison-card">
        <div>
          <span className="eyebrow">方案 A / B</span>
          <h3>比较一次改动带来的真实差异</h3>
          <p>先保存当前方案 A，再调整条件；这里比较的是同一模型下的估算变化。</p>
        </div>
        {comparison ? (
          comparison.population.numericStatus === 'unavailable' || result.population.numericStatus === 'unavailable' ? (
            <p className="empty-inline">有一侧暂时算不出来，这组没法比——换有锚点的地域再比。</p>
          ) : (
          <div className="comparison-values" aria-live="polite">
            <div><span>方案 A</span><b>{comparison.population.displayShort}</b></div>
            <span aria-hidden="true">→</span>
            <div><span>当前方案 B</span><b>{result.population.displayShort}</b></div>
            <strong>{result.population.estimate >= comparison.population.estimate ? '+' : '−'} {formatCount(Math.abs(result.population.estimate - comparison.population.estimate))}</strong>
            {(comparison.population.status === 'upper_bound' || result.population.status === 'upper_bound') && (
              <small>含「上限」口径：上限与上限的比法，看个趋势就好。</small>
            )}
          </div>
          )
        ) : <p className="empty-inline">尚未保存方案 A。</p>}
        <button className="button button-secondary" type="button" onClick={onCaptureComparison}>{comparison ? '用当前方案更新 A' : '保存当前为方案 A'}</button>
      </article>
      <div className="result-detail-grid">
        <article className="detail-card"><div className="detail-head"><div><span className="eyebrow">边际重算</span><h3>哪些条件最“狠”</h3></div><span className="count-badge">{result.impacts.length}</span></div>
          {result.impacts.length === 0 ? <p className="empty-inline">当前只有基础范围，没有额外限制项。</p> : <ol className="impact-list">{result.impacts.slice(0, 6).map((impact) => <li key={impact.dimensionId}><div><b>{impact.label}</b><span><EvidenceStatusBadge grade={impact.evidenceGrade} /> · 保留 {(impact.retention * 100).toFixed(1)}%</span></div><strong>− {formatCount(impact.marginalLoss)}</strong></li>)}</ol>}
        </article>
        <article className="detail-card"><div className="detail-head"><div><span className="eyebrow">灵敏度</span><h3>放宽一格，地球多多少人</h3></div></div>
          {result.relaxations.length === 0 ? <p className="empty-inline">暂无可放宽条件。</p> : <div className="relax-list">{result.relaxations.slice(0, 5).map((suggestion) => <button key={suggestion.dimensionId} type="button" onClick={() => onRelax(suggestion.dimensionId)}><span><b>{suggestion.label}</b><small>{formatCount(suggestion.currentEstimate)} → {formatCount(suggestion.relaxedEstimate)}</small></span><span>应用</span></button>)}</div>}
        </article>
      </div>
      <article className="method-card"><div><span className="eyebrow">相关性处理</span><h3>新模型没有把每个条件都当独立事件</h3></div><div className="method-grid">{result.groups.map((group) => <section key={group.id}><span className="class-badge">{group.classification === 'hard_filter' ? '硬筛选' : '相关硬条件'}</span><h4>{group.label}</h4><p>{group.method}</p><small>{group.note}</small></section>)}</div></article>
      <article className="reciprocal-card"><div><span className="eyebrow">反向自评 · 可选</span><h3>双向条件命中示意</h3><p>只比较双方填写的软偏好交集，不把两个人群比例相乘，也不预测真实感情。</p></div>
        {reciprocalOptions.length === 0 ? <p className="empty-inline">先在维度库加入软偏好，才能填写对方也在意什么。</p> : <div className="chip-row">{reciprocalOptions.map((dimension) => dimension && <Chip key={dimension.id} active={selection.selfPreferenceIds.includes(dimension.id as SoftPreferenceId)} tone="mint" onClick={() => { const next = structuredClone(selection); next.selfPreferenceIds = toggleArrayValue(next.selfPreferenceIds, dimension.id as SoftPreferenceId); onChange(next) }}>{dimension.label}</Chip>)}</div>}
        <div className="intersection-score"><span>当前双向命中示意</span><b>{result.scores.bidirectionalIllustration}<small>/100</small></b><p>{result.scoreDetails.disclaimer}</p></div>
      </article>
      <RelationshipScenarioCard result={result} seekerGender={seekerGender} onSeekerGender={onSeekerGender} />
      <article className="model-boundaries"><h3>模型知道什么，也知道自己不知道什么</h3><ul>{result.explanation.map((item) => <li key={item}>{item}</li>)}</ul><p>可信度 {result.confidence.grade}（{Math.round(result.confidence.score * 100)}% 方法评分）· 分辨率下限 {formatCount(result.population.resolutionFloor)}</p></article>
    </section>
  )
}
