import { useMemo, useState } from 'react'
import { DIMENSION_CATEGORIES, DIMENSION_REGISTRY, type DimensionCategory } from '../../model/dimensions'
import type { ModelSelection, SoftPreferenceId } from '../../model/schema'
import { toggleArrayValue } from '../../model/selectionUtils'
import { Chip, EvidenceStatusBadge } from '../../components/ui'

const CLASS_COPY = {
  hard_filter: ['硬筛选', '只用于有清晰统计含义的范围'],
  correlated_hard: ['相关硬条件', '在相关组内联合处理'],
  soft_preference: ['软偏好', '只改变契合度，不砍人口'],
  entertainment: ['娱乐', '只负责彩蛋，不碰人口'],
} as const

export function DimensionLibraryStep({ selection, onChange, onNext }: {
  selection: ModelSelection
  onChange: (next: ModelSelection) => void
  onNext: () => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<DimensionCategory | 'all'>('all')
  const update = (mutate: (draft: ModelSelection) => void) => {
    const draft = structuredClone(selection)
    mutate(draft)
    onChange(draft)
  }
  const dimensions = useMemo(() => DIMENSION_REGISTRY.filter((dimension) => {
    if (['base.gender', 'base.age', 'base.region', 'base.marital', 'appearance.height', 'appearance.body_type', 'education.level', 'education.school', 'economy.income', 'economy.wealth'].includes(dimension.id)) return false
    if (dimension.sensitive || dimension.classification === 'entertainment') return false
    const categoryMatches = category === 'all' || dimension.category === category
    const term = query.trim().toLocaleLowerCase('zh-CN')
    const searchMatches = !term || `${dimension.label}${dimension.description}${dimension.category}`.toLocaleLowerCase('zh-CN').includes(term)
    return categoryMatches && searchMatches
  }), [category, query])

  const isActive = (id: string) => {
    if (id === 'economy.house') return selection.correlated.housing.required
    if (id === 'economy.vehicle') return selection.correlated.vehicle.required
    if (id === 'lifestyle.smoking') return selection.correlated.smoking !== 'any'
    if (id === 'lifestyle.drinking') return selection.correlated.drinking !== 'any'
    if (id === 'health.chronic') return selection.correlated.healthCriteria.includes('no_major_chronic')
    if (id === 'health.myopia') return selection.correlated.healthCriteria.includes('no_myopia')
    if (id === 'appearance.hair_full') return selection.correlated.hairCriteria.length > 0
    return selection.softPreferenceIds.includes(id as SoftPreferenceId)
  }
  const toggleDimension = (id: string) => update((draft) => {
    switch (id) {
      case 'economy.house': draft.correlated.housing.required = !draft.correlated.housing.required; break
      case 'economy.vehicle': draft.correlated.vehicle.required = !draft.correlated.vehicle.required; break
      case 'lifestyle.smoking': draft.correlated.smoking = draft.correlated.smoking === 'any' ? 'non_smoker' : 'any'; break
      case 'lifestyle.drinking': draft.correlated.drinking = draft.correlated.drinking === 'any' ? 'not_regular' : 'any'; break
      case 'health.chronic': draft.correlated.healthCriteria = toggleArrayValue(draft.correlated.healthCriteria, 'no_major_chronic'); break
      case 'health.myopia': draft.correlated.healthCriteria = toggleArrayValue(draft.correlated.healthCriteria, 'no_myopia'); break
      case 'appearance.hair_full': draft.correlated.hairCriteria = toggleArrayValue(draft.correlated.hairCriteria, 'full_hair'); break
      default: draft.softPreferenceIds = toggleArrayValue(draft.softPreferenceIds, id as SoftPreferenceId)
    }
  })

  return (
    <section className="step-panel" aria-labelledby="library-title">
      <div className="step-heading">
        <span className="eyebrow">第三关 · 维度宝库</span>
        <h2 id="library-title" tabIndex={-1}>想找得细，不必把人群砍成粉末</h2>
        <p>69 个原子维度按作用分类。搜得到、看得懂，也能知道它到底改人数还是只改契合度。</p>
      </div>
      <div className="library-toolbar">
        <label className="search-field" htmlFor="dimension-search"><span>搜索维度</span><input id="dimension-search" type="search" placeholder="例如：沟通、做饭、工作稳定…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="清除搜索" type="button" onClick={() => setQuery('')}>×</button>}</label>
        <label className="select-field" htmlFor="category-filter"><span>分类</span><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value as DimensionCategory | 'all')}><option value="all">全部分类</option>{DIMENSION_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      </div>
      <div aria-live="polite" className="search-status">找到 {dimensions.length} 个可选维度</div>
      {dimensions.length === 0 ? (
        <div className="empty-state"><span aria-hidden="true">⌕</span><h3>这次没搜到</h3><p>试试更短的词，或清除搜索浏览全部分类。</p><button className="button button-secondary" type="button" onClick={() => { setQuery(''); setCategory('all') }}>清除筛选</button></div>
      ) : (
        <div className="dimension-grid">
          {dimensions.map((dimension) => {
            const copy = CLASS_COPY[dimension.classification]
            return (
              <article className="dimension-card" data-class={dimension.classification} key={dimension.id}>
                <div className="dimension-card-top"><span className="class-badge">{copy[0]}</span><EvidenceStatusBadge grade={dimension.evidenceGrade} /></div>
                <h3>{dimension.label}</h3><p>{dimension.description}</p><small>{copy[1]}</small>
                <Chip active={isActive(dimension.id)} tone={dimension.classification === 'soft_preference' ? 'mint' : 'sun'} onClick={() => toggleDimension(dimension.id)}>{isActive(dimension.id) ? '已加入' : '加入条件'}</Chip>
              </article>
            )
          })}
        </div>
      )}
      <div className="step-actions"><button className="button button-primary" type="button" onClick={onNext}>下一关：彩蛋区 →</button></div>
    </section>
  )
}
