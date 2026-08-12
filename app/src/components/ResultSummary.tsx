import type { ModelResult } from '../engine/modelEngine'
import { formatCount } from '../engine/modelEngine'
import { PopulationFunnel } from './PopulationFunnel'
import { ModelConfidenceBadge } from './ui'

export function ResultSummary({
  result,
  compact = false,
  showFunnel = true,
  headingId = 'result-summary-title',
  onOpenDetails,
  onShare,
}: {
  result: ModelResult
  compact?: boolean
  showFunnel?: boolean
  headingId?: string
  onOpenDetails?: () => void
  onShare?: () => void
}) {
  const topImpact = result.impacts[0]
  return (
    <section aria-labelledby={compact ? undefined : headingId} className="result-summary" data-compact={compact}>
      <div className="result-kicker">
        <span>满足硬条件的估算人群</span>
        <ModelConfidenceBadge grade={result.confidence.grade} />
      </div>
      {!compact && <h2 className="visually-hidden" id={headingId}>当前结果摘要</h2>}
      <div aria-label={result.population.display} aria-live="polite" aria-atomic="true" className="result-number">{result.population.displayShort}</div>
      {!compact && (
        <>
          <div className="range-grid" aria-label="估算范围">
            <div><span>保守</span><b>{formatCount(result.population.range.conservative)}</b></div>
            <div className="range-primary"><span>基准</span><b>{formatCount(result.population.range.baseline)}</b></div>
            <div><span>乐观</span><b>{formatCount(result.population.range.optimistic)}</b></div>
          </div>
          {showFunnel && <PopulationFunnel result={result} />}
          <p className="result-boundary">
            {result.population.resolutionExceeded
              ? '不是宇宙没货，是数据分辨率到头了；现实中不等于绝对不存在。'
              : '这是范围估算，不是实时名册，也不是对具体感情结果的预测。'}
          </p>
          <div className="score-grid">
            <div>
              <span>软偏好契合</span>
              <b>{result.scores.softMatch}<small>/100</small></b>
              <p>{result.scoreDetails.reciprocalPreferencesProvided ? '基于双方偏好交集' : '未填反向偏好，暂用中性值'}</p>
            </div>
            <div>
              <span>娱乐指数</span>
              <b>{result.scores.entertainment}<small>/100</small></b>
              <p>不进入人口估算</p>
            </div>
          </div>
          {topImpact && (
            <div className="top-impact">
              <span>当前最大限制项</span>
              <b>{topImpact.label}</b>
              <small>边际减少 {formatCount(topImpact.marginalLoss)}</small>
            </div>
          )}
          <div className="version-line">
            模型 {result.versions.modelVersion} · 数据 {result.versions.dataVersion}
          </div>
        </>
      )}
      <div className="result-actions">
        {onOpenDetails && <button className="button button-secondary" type="button" onClick={onOpenDetails}>查看解释</button>}
        {onShare && <button className="button button-primary" type="button" onClick={onShare}>准备分享</button>}
      </div>
    </section>
  )
}
