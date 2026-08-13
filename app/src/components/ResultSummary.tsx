import { useMemo } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { formatCount, formatCountShort } from '../engine/modelEngine'
import { FunFunnel } from '../fun/FunFunnel'
import { buildFunnelFrames } from '../fun/funnelFrames'
import { RarityStamp } from '../fun/RarityStamp'
import { buildComparisons, buildVerdict, fmtRarity, rarityTier } from '../fun/rarity'
import { useCountUp } from '../fun/useCountUp'
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
  const animated = useCountUp(result.population.estimate)
  // 帧拆解走趣味层(渐进调用引擎公开接口), result.input 身份不变时命中缓存
  const frames = useMemo(() => buildFunnelFrames(result.input), [result.input])
  const base = result.population.base
  const probability = base > 0 ? result.population.estimate / base : 0
  const perWan = probability * 10_000
  const tier = rarityTier(perWan)
  const verdict = buildVerdict(frames)
  const comparisons = buildComparisons(probability)
  const cities = result.input.target.cities
  const scope = `${cities.includes('全国') ? '全国' : cities.join('、')} · ${result.input.target.age.min}–${result.input.target.age.max} 岁 · ${result.input.target.gender === 'male' ? '男生' : '女生'}`
  const numberText = result.population.resolutionExceeded
    ? result.population.displayShort
    : formatCountShort(animated)

  return (
    <section aria-labelledby={compact ? undefined : headingId} className="result-summary" data-compact={compact}>
      <div className="result-kicker">
        <span>满足硬条件的估算人群</span>
        <ModelConfidenceBadge grade={result.confidence.grade} />
      </div>
      {!compact && <h2 className="visually-hidden" id={headingId}>当前结果摘要</h2>}
      <div className="result-stage">
        <div
          key={numberText}
          aria-label={result.population.display}
          aria-live="polite"
          aria-atomic="true"
          className="result-number pop-in"
        >
          {numberText}
        </div>
        <p className="result-scope">在「{scope}」的池子里捞</p>
        {!compact && base > 0 && <RarityStamp tier={tier} rarityText={fmtRarity(probability)} />}
      </div>
      {!compact && (
        <>
          <div className="range-grid" aria-label="估算范围">
            <div><span>保守</span><b>{formatCount(result.population.range.conservative)}</b></div>
            <div className="range-primary"><span>基准</span><b>{formatCount(result.population.range.baseline)}</b></div>
            <div><span>乐观</span><b>{formatCount(result.population.range.optimistic)}</b></div>
          </div>
          {verdict && (
            <div className="verdict-card">
              <span className="verdict-label">毒舌总评</span>{verdict}
              {comparisons.length > 0 && (
                <ul className="verdict-comparisons">
                  {comparisons.map((line) => <li key={line}>📌 {line}</li>)}
                </ul>
              )}
            </div>
          )}
          {showFunnel && <FunFunnel pool={base} frames={frames} />}
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
        {onShare && <button className="button button-primary" type="button" onClick={onShare}>生成战报</button>}
      </div>
    </section>
  )
}
