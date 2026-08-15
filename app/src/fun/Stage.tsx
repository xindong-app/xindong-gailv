// 常驻舞台带 —— 全站唯一的小人剧场(深色天鹅绒 + 脚灯 + 聚光灯)
// 桌面端固定于视口底部, 可折叠成字幕条; 手机端仍走底部字幕条+弹层(见 Home)
import { useEffect, useMemo, useState } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { formatCount } from '../engine/modelEngine'
import { FunFunnel } from './FunFunnel'
import { buildFunnelFrames } from './funnelFrames'
import { rarityTier } from './rarity'
import { SlotNumber } from './SlotNumber'

export function Stage({ result }: { result: ModelResult }) {
  const [collapsed, setCollapsed] = useState(false)
  // v4: 舞台主数字走综合人口层, 与结果页同一份口径
  const pool = result.comprehensivePopulation
  const available = pool.numericStatus === 'available'
  const frames = useMemo(
    () => buildFunnelFrames(result.input, result.computationContext),
    [result.input, result.computationContext],
  )
  const base = pool.base
  const probability = available && base > 0 ? pool.estimate / base : 0
  const tier = rarityTier(probability * 10_000)
  const cities = result.input.target.cities
  const scope = `${cities.includes('全国') ? '全国' : cities.join('、')} · ${result.input.target.age.min}–${result.input.target.age.max} 岁 · ${result.input.target.gender === 'male' ? '男生' : '女生'}`
  // "就差一点"字幕: 轮播引擎的放宽建议(前 3 条), 播报即链路反馈
  const tips = available ? result.relaxations.slice(0, 3) : []
  const [tipIndex, setTipIndex] = useState(0)
  useEffect(() => {
    if (tips.length < 2) return undefined
    const id = window.setInterval(() => setTipIndex((index) => (index + 1) % tips.length), 3400)
    return () => window.clearInterval(id)
  }, [tips.length])
  const currentTip = tips[tipIndex % Math.max(1, tips.length)]

  return (
    <section aria-label="小人剧场" className={`stage${collapsed ? ' stage--collapsed' : ''}`} data-tier={available ? tier.key : 'NA'}>
      <div className="stage-footlights" aria-hidden="true" />
      <div className="stage-spotlight" aria-hidden="true" />
      <div className="stage-inner">
        <div className="stage-scoreboard">
          <span className="stage-scoreboard-label">
            {available
              ? (pool.zeroMeaning === 'model_underflow' ? '小到数不出来' : '池中还剩')
              : '这一片算不出'}
          </span>
          <SlotNumber text={pool.displayShort} ariaLabel={pool.display} />
          <span className="stage-scope">{scope}</span>
          {!collapsed && currentTip && (
            <span key={currentTip.dimensionId} className="stage-tip">
              就差一点：{currentTip.label}，池子多约 {formatCount(currentTip.gain)}
            </span>
          )}
          <button
            aria-expanded={!collapsed}
            className="stage-toggle"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? '展开舞台 ↑' : '收起舞台 ↓'}
          </button>
        </div>
        {!collapsed && (
          <div className="stage-arena">
            {available && pool.zeroMeaning !== 'model_underflow' ? (
              <FunFunnel pool={base} frames={frames} cities={cities} />
            ) : (
              <div className="stage-unavailable" role="status">
                <span aria-hidden="true">🌫️</span>
                {available ? (
                  <>
                    <p>小人表示演不了：这个数字小到模型都数不出来。</p>
                    <small>数值下溢 ≠ 现实归零——现实中完全可能有人，只是低于分辨率。</small>
                  </>
                ) : (
                  <>
                    <p>小人今天不上台：{result.coverage.unsupportedCities.join('、') || '当前地域'}还没有官方常住人口锚点。</p>
                    <small>不可用 ≠ 0 人；换有锚点的城市或全国口径，剧场立刻开演。</small>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
