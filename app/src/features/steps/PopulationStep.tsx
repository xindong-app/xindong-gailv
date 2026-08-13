import { useMemo, useState } from 'react'
import { CITIES } from '../../data/cities'
import type { ModelSelection, MaritalStatusId } from '../../model/schema'
import { toggleArrayValue } from '../../model/selectionUtils'
import { Chip, EvidenceBadge, FieldHelp } from '../../components/ui'
import { DimensionSticker } from '../../fun/DimensionSticker'

const MARITAL_OPTIONS: Array<{ id: MaritalStatusId; label: string }> = [
  { id: 'never_married', label: '未婚' },
  { id: 'divorced', label: '离婚未再婚' },
  { id: 'widowed', label: '丧偶未再婚' },
]

export function PopulationStep({
  selection,
  onChange,
  onNext,
}: {
  selection: ModelSelection
  onChange: (next: ModelSelection) => void
  onNext: () => void
}) {
  const [cityQuery, setCityQuery] = useState('')
  const update = (mutate: (draft: ModelSelection) => void) => {
    const draft = structuredClone(selection)
    mutate(draft)
    onChange(draft)
  }
  const hotCities = CITIES.filter((city) => city.hot).slice(0, 12)
  const cityMatches = useMemo(() => {
    const term = cityQuery.trim().toLocaleLowerCase('zh-CN')
    if (!term) return []
    return CITIES.filter((city) => city.name.toLocaleLowerCase('zh-CN').includes(term)).slice(0, 12)
  }, [cityQuery])
  const chooseCity = (name: string) => {
    update((draft) => {
      if (name === '全国') {
        draft.target.cities = ['全国']
        return
      }
      const cities = draft.target.cities.filter((city) => city !== '全国')
      const next = toggleArrayValue(cities, name)
      draft.target.cities = next.length === 0 ? ['全国'] : next
    })
  }

  return (
    <section className="step-panel" aria-labelledby="population-title">
      <div className="step-heading">
        <span className="eyebrow">第一关 · 圈定人群</span>
        <h2 id="population-title" tabIndex={-1}>先圈出“在哪儿、几岁、什么状态”</h2>
        <p>这些是可解释的硬筛选。当前基础池已经实时计算，不需要先“开筛”。</p>
      </div>
      <div className="form-card">
        <fieldset>
          <legend><DimensionSticker className="legend-sticker" dimensionId="base.gender" />目标性别 <EvidenceBadge grade="A" /></legend>
          <div className="chip-row">
            <Chip active={selection.target.gender === 'male'} tone="sky" onClick={() => update((draft) => { draft.target.gender = 'male' })}>男性</Chip>
            <Chip active={selection.target.gender === 'female'} tone="pink" onClick={() => update((draft) => { draft.target.gender = 'female' })}>女性</Chip>
          </div>
        </fieldset>
        <fieldset>
          <legend><DimensionSticker className="legend-sticker" dimensionId="base.age" />年龄范围 <EvidenceBadge grade="A" /></legend>
          <div className="range-fields">
            <label htmlFor="minimum-age">最低年龄 <output>{selection.target.age.min} 岁</output>
              <input id="minimum-age" aria-label="最低年龄" aria-valuetext={`${selection.target.age.min} 岁`} max={selection.target.age.max} min={18} type="range" value={selection.target.age.min}
                onChange={(event) => update((draft) => { draft.target.age.min = Number(event.target.value) })} />
            </label>
            <label htmlFor="maximum-age">最高年龄 <output>{selection.target.age.max} 岁</output>
              <input id="maximum-age" aria-label="最高年龄" aria-valuetext={`${selection.target.age.max} 岁`} max={50} min={selection.target.age.min} type="range" value={selection.target.age.max}
                onChange={(event) => update((draft) => { draft.target.age.max = Number(event.target.value) })} />
            </label>
          </div>
          <FieldHelp>18–50 岁每个单岁都有有效人口锚点，区间按单岁求和。</FieldHelp>
        </fieldset>
        <fieldset>
          <legend><DimensionSticker className="legend-sticker" dimensionId="base.region" />居住地区 <EvidenceBadge grade="C" /></legend>
          <div className="chip-row">
            <Chip active={selection.target.cities.includes('全国')} tone="sun" onClick={() => chooseCity('全国')}>全国</Chip>
            {hotCities.map((city) => (
              <Chip active={selection.target.cities.includes(city.name)} key={city.name} tone="sun" onClick={() => chooseCity(city.name)}>{city.name}</Chip>
            ))}
          </div>
          <label className="city-search" htmlFor="city-search">
            <span>搜索其他城市</span>
            <input id="city-search" type="search" placeholder="输入城市名，例如青岛" value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} />
          </label>
          {cityQuery && (
            <div className="city-search-results" aria-live="polite">
              {cityMatches.length > 0 ? (
                <div className="chip-row">{cityMatches.map((city) => <Chip active={selection.target.cities.includes(city.name)} key={city.name} tone="sun" onClick={() => chooseCity(city.name)}>{city.name}</Chip>)}</div>
              ) : (
                <div className="empty-inline" role="status">没有匹配城市。请尝试省会、地级市全名，或使用全国口径。</div>
              )}
            </div>
          )}
          <FieldHelp>多城市按人口并集；全国与城市互斥。城市搜索无结果时不会静默写入未知地区。</FieldHelp>
        </fieldset>
        <fieldset>
          <legend><DimensionSticker className="legend-sticker" dimensionId="base.marital" />婚姻状态 <EvidenceBadge grade="B" /></legend>
          <div className="chip-row">
            {MARITAL_OPTIONS.map((option) => (
              <Chip active={selection.target.maritalStatuses.includes(option.id)} key={option.id} tone="lilac"
                onClick={() => update((draft) => { draft.target.maritalStatuses = toggleArrayValue(draft.target.maritalStatuses, option.id) })}>
                {option.label}
              </Chip>
            ))}
          </div>
          <FieldHelp>{selection.target.maritalStatuses.length === 0 ? '当前为不限婚史；不会偷偷回退到“未婚”。' : '状态互斥，多选按并集计算；使用官方性别×五岁组率，组内年龄为同一比例。18–19 岁或 50 岁会降为 C 级边界近似。'}</FieldHelp>
        </fieldset>
      </div>
      <div className="step-actions"><button className="button button-primary" type="button" onClick={onNext}>下一关：上硬菜 →</button></div>
    </section>
  )
}
