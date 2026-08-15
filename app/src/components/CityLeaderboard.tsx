// 城市分布榜 —— 「TA 们都躲在哪儿」: 同一套条件, 56 城各算一遍, 排出名次。
// 纯趣味层: 只调用引擎公开接口 tryComputeModel, 不触碰引擎内部数学。
// v4: 排名按综合人口层(全部已选条件都参与), 与结果页主数字同一份口径。
import { useMemo } from 'react'
import type { ModelResult } from '../engine/modelEngine'
import { formatCountShort, tryComputeModel } from '../engine/modelEngine'
import { CITIES } from '../data/cities'
import type { ModelSelection } from '../model/schema'

interface CityRow {
  name: string
  hot: boolean
  estimate: number
}

const TOP_N = 6

export function CityLeaderboard({ result }: { result: ModelResult }) {
  const selected = result.input.target.cities
  const rows = useMemo<CityRow[]>(() => {
    const input = result.input as ModelSelection
    const options = {
      hardRequirementIds: result.computationContext.hardRequirementIds,
      ...(result.computationContext.seekerGender ? { seekerGender: result.computationContext.seekerGender } : {}),
    }
    const out: CityRow[] = []
    for (const city of CITIES) {
      const draft = { ...input, target: { ...input.target, cities: [city.name] } }
      const computed = tryComputeModel(draft, options)
      if (!computed.success) continue
      const pool = computed.data.comprehensivePopulation
      if (pool.numericStatus !== 'available' || pool.zeroMeaning === 'model_underflow') continue
      out.push({ name: city.name, hot: city.hot === true, estimate: pool.estimate })
    }
    return out.sort((a, b) => b.estimate - a.estimate)
  }, [result.input, result.computationContext])

  if (rows.length === 0) return null
  const top = rows.slice(0, TOP_N)
  const worst = rows[rows.length - 1]
  const max = top[0]?.estimate ?? 1
  const selectedOutsideTop = rows.filter((row) => selected.includes(row.name) && !top.some((t) => t.name === row.name))
  const shown = [...top, ...selectedOutsideTop]

  return (
    <section className="city-board" aria-label="城市分布榜">
      <h3>🌆 TA 们都躲在哪儿</h3>
      <ol className="city-board-list">
        {shown.map((row, index) => (
          <li key={row.name} data-picked={selected.includes(row.name) || undefined}>
            <span className="city-board-rank">{index + 1 <= TOP_N ? `${index + 1}` : '·'}</span>
            <span className="city-board-name">{row.hot && <em aria-hidden="true">🔥</em>}{row.name}{selected.includes(row.name) && <i>你选的</i>}</span>
            <span className="city-board-bar"><b style={{ width: `${Math.max(2, (row.estimate / max) * 100)}%` }} /></span>
            <span className="city-board-count">{formatCountShort(row.estimate)}</span>
          </li>
        ))}
      </ol>
      <p className="city-board-tail">
        垫底的是 <b>{worst.name}</b>：{formatCountShort(worst.estimate)} —— 且行且珍惜。
      </p>
      <small className="city-board-note">各城市综合情景估算 × 同一套条件 · 含先验情景维度时只感受量级，不是精确名册</small>
    </section>
  )
}
