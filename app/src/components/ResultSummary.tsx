import { useMemo } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { formatCount, formatCountShort } from '../engine/modelEngine'
import { FunFunnel } from '../fun/FunFunnel'
import { buildAnalogy } from '../fun/analogy'
import { buildFunnelFrames } from '../fun/funnelFrames'
import { RarityStamp } from '../fun/RarityStamp'
import { WipeoutShow } from '../fun/WipeoutShow'
import { buildComparisons, buildVerdict, fmtRarity, rarityTier } from '../fun/rarity'
import { useCountUp } from '../fun/useCountUp'
import { CityLeaderboard } from './CityLeaderboard'
import { ModelConfidenceBadge } from './ui'

/** 人口主数的三种 v3 状态说明卡: 不可用 / 上限 / 低于分辨率(可与上限叠加) */
function PopulationStateNotice({ result }: { result: ModelResult }) {
  const { population, coverage } = result
  if (population.status === 'unavailable') {
    return (
      <article className="state-notice" data-state="unavailable" role="status">
        <h3>这一片暂时算不出来</h3>
        <p>{population.display}</p>
        {coverage.unsupportedCities.length > 0 && (
          <p className="state-notice-cities">
            暂无锚点：{coverage.unsupportedCities.join('、')}
          </p>
        )}
        <small>换到有官方常住人口锚点的城市，或改用全国口径，就能继续估算。</small>
      </article>
    )
  }
  return (
    <>
      {population.status === 'upper_bound' && (
        <article className="state-notice" data-state="upper-bound">
          <h3>这是上限，不是精确点数</h3>
          <p>主数字只计算了有可靠人口参数的条件；下面 {coverage.unquantifiedHardConditions.length} 项硬边界保留生效，但因为证据不足没有参与砍人：</p>
          <ul className="unquantified-list">
            {coverage.unquantifiedHardConditions.map((item) => (
              <li key={item.dimensionId}><b>{item.label}</b><small>{item.reason}</small></li>
            ))}
          </ul>
          <small>真实人数只会更少或相等——所以它是「上限」。不猜比例，是这个产品的倔强。</small>
        </article>
      )}
      {population.zeroMeaning === 'model_underflow' && (
        <article className="state-notice" data-state="underflow">
          <h3>数字小到数不出来了</h3>
          <p>估算值在浮点近似中已经下溢到 0——它低于模型的分辨能力，<b>不等于</b>现实中恰好一个人都没有。</p>
        </article>
      )}
    </>
  )
}

export function ResultSummary({
  result,
  compact = false,
  showFunnel = true,
  headingId = 'result-summary-title',
  revealKey,
  onOpenDetails,
  onShare,
}: {
  result: ModelResult
  compact?: boolean
  showFunnel?: boolean
  headingId?: string
  /** 变化时钢印重新砸落(用于揭榜仪式感) */
  revealKey?: string | number
  onOpenDetails?: () => void
  onShare?: () => void
}) {
  const topImpact = result.impacts[0]
  const available = result.population.numericStatus === 'available'
  const upperBound = result.population.status === 'upper_bound'
  // 数值下溢不是现实零人: 稀有度/毒舌/漏斗等人数派生趣味全部不演
  const funAllowed = available && result.population.zeroMeaning !== 'model_underflow'
  // 逻辑空集(条件互相打架, 上下界均为 0): 上演团灭专场, 不演稀有度
  const logicalZero = result.population.zeroMeaning === 'logical_zero'
  const animated = useCountUp(available ? result.population.estimate : 0)
  // 帧拆解走趣味层(渐进调用引擎公开接口), result.input 身份不变时命中缓存
  const frames = useMemo(() => buildFunnelFrames(result.input), [result.input])
  const base = result.population.base
  const probability = funAllowed && base > 0 ? result.population.estimate / base : 0
  const tier = rarityTier(probability * 10_000)
  const verdict = funAllowed && !logicalZero ? buildVerdict(frames) : null
  const comparisons = funAllowed && !logicalZero ? buildComparisons(probability) : []
  const analogy = funAllowed && !logicalZero ? buildAnalogy(result.population.estimate) : null
  // 图鉴卡幸存者: 与漏斗阵列同一份确定性数学
  const FUNNEL_TOTAL = 80
  const survivorCount = frames.length > 0 && base > 0
    ? Math.round((FUNNEL_TOTAL * frames[frames.length - 1].survivors) / Math.max(1, base))
    : FUNNEL_TOTAL
  const cities = result.input.target.cities
  const scope = `${cities.includes('全国') ? '全国' : cities.join('、')} · ${result.input.target.age.min}–${result.input.target.age.max} 岁 · ${result.input.target.gender === 'male' ? '男生' : '女生'}`
  const numberText = !available || result.population.resolutionExceeded
    ? result.population.displayShort
    : formatCountShort(animated)

  return (
    <section aria-labelledby={compact ? undefined : headingId} className="result-summary" data-compact={compact}>
      <div className="result-kicker">
        <span>{upperBound ? '满足已计入条件的人数上限' : '满足硬条件的估算人群'}</span>
        {upperBound && <span className="status-badge" data-kind="upper-bound">上限</span>}
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
        {!compact && analogy && (
          <p className="result-analogy">{analogy.emoji} {analogy.text}</p>
        )}
        {!compact && funAllowed && !logicalZero && base > 0 && (
          <RarityStamp tier={tier} rarityText={upperBound ? `最多 ${fmtRarity(probability)} · 仅按已计入条件` : fmtRarity(probability)} revealKey={revealKey} survivorCount={survivorCount} />
        )}
        {logicalZero && <WipeoutShow />}
        {!compact && funAllowed && upperBound && (
          <p className="rarity-cap-note">加入尚未量化的硬条件后，真实稀有度只会更高——这是最低稀有程度，不是最终评级。</p>
        )}
      </div>
      {!compact && (
        <>
          <PopulationStateNotice result={result} />
          {funAllowed && (
            <div className="range-grid" aria-label="估算范围">
              <div><span>保守</span><b>{formatCount(result.population.range.conservative)}</b></div>
              <div className="range-primary"><span>基准</span><b>{formatCount(result.population.range.baseline)}</b></div>
              <div><span>乐观</span><b>{formatCount(result.population.range.optimistic)}</b></div>
            </div>
          )}
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
          {funAllowed && !logicalZero && <CityLeaderboard result={result} />}
          {funAllowed && showFunnel && <FunFunnel pool={base} frames={frames} cities={result.input.target.cities} />}
          <p className="result-boundary">
            {!available
              ? '不可用不是 0 人；只是这个地域组合暂时没有可复核的人口锚点。'
              : result.population.zeroMeaning === 'model_underflow'
                ? '数值下溢不是现实归零；只是低到模型测不出来。'
                : result.population.resolutionExceeded
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
          {funAllowed && topImpact && (
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
