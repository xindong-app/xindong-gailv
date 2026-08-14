// 常驻舞台带 —— 全站唯一的小人剧场(深色天鹅绒 + 脚灯 + 聚光灯)
// 桌面端固定于视口底部, 可折叠成字幕条; 手机端仍走底部字幕条+弹层(见 Home)
import { useMemo, useState } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { FunFunnel } from './FunFunnel'
import { buildFunnelFrames } from './funnelFrames'
import { rarityTier } from './rarity'
import { SlotNumber } from './SlotNumber'

export function Stage({ result }: { result: ModelResult }) {
  const [collapsed, setCollapsed] = useState(false)
  const available = result.population.numericStatus === 'available'
  const frames = useMemo(() => buildFunnelFrames(result.input), [result.input])
  const base = result.population.base
  const probability = available && base > 0 ? result.population.estimate / base : 0
  const tier = rarityTier(probability * 10_000)
  const cities = result.input.target.cities
  const scope = `${cities.includes('全国') ? '全国' : cities.join('、')} · ${result.input.target.age.min}–${result.input.target.age.max} 岁 · ${result.input.target.gender === 'male' ? '男生' : '女生'}`

  return (
    <section aria-label="小人剧场" className={`stage${collapsed ? ' stage--collapsed' : ''}`} data-tier={available ? tier.key : 'NA'}>
      <div className="stage-footlights" aria-hidden="true" />
      <div className="stage-spotlight" aria-hidden="true" />
      <div className="stage-inner">
        <div className="stage-scoreboard">
          <span className="stage-scoreboard-label">{available ? '池中还剩' : '这一片算不出'}</span>
          <SlotNumber text={result.population.displayShort} ariaLabel={result.population.display} />
          <span className="stage-scope">{scope}</span>
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
            {available ? (
              <FunFunnel pool={base} frames={frames} cities={cities} />
            ) : (
              <div className="stage-unavailable" role="status">
                <span aria-hidden="true">🌫️</span>
                <p>小人今天不上台：{result.coverage.unsupportedCities.join('、') || '当前地域'}还没有官方常住人口锚点。</p>
                <small>不可用 ≠ 0 人；换有锚点的城市或全国口径，剧场立刻开演。</small>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
