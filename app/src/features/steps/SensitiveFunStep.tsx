import { useState } from 'react'
import { DIMENSION_REGISTRY } from '../../model/dimensions'
import { SOFT_PREFERENCE_IDS, type ModelSelection, type SoftPreferenceId, type ZodiacId, type MbtiPoleId, type CarBandId, type HouseLocationId, type HouseTypeId, type BodyTypeId } from '../../model/schema'
import { toggleArrayValue } from '../../model/selectionUtils'
import { Chip } from '../../components/ui'
import { DimensionSticker } from '../../fun/DimensionSticker'

const ZODIAC_LABELS: Record<ZodiacId, string> = { aries: '白羊', taurus: '金牛', gemini: '双子', cancer: '巨蟹', leo: '狮子', virgo: '处女', libra: '天秤', scorpio: '天蝎', sagittarius: '射手', capricorn: '摩羯', aquarius: '水瓶', pisces: '双鱼' }
const MBTI_AXES: Array<[MbtiPoleId, MbtiPoleId]> = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']]
const HOUSE_LOCATIONS: Array<[HouseLocationId, string]> = [['core', '核心区'], ['urban', '市区'], ['suburban', '郊区']]
const HOUSE_TYPES: Array<[HouseTypeId, string]> = [['apartment', '普通住宅'], ['large_flat', '大平层'], ['villa', '别墅'], ['courtyard', '四合院']]
const CAR_BANDS: Array<[CarBandId, string]> = [['under_10', '10 万以下'], ['10_20', '10–20 万'], ['20_50', '20–50 万'], ['50_100', '50–100 万'], ['over_100', '100 万以上']]
const BODY_OPTIONS: Array<[BodyTypeId, string]> = [['underweight', '骨感'], ['slim', '纤细'], ['balanced', '匀称'], ['standard', '标准'], ['soft', '微胖'], ['full', '丰腴'], ['round', '圆润']]

export function SensitiveFunStep({ selection, onChange, onNext }: { selection: ModelSelection; onChange: (next: ModelSelection) => void; onNext: () => void }) {
  const [sensitiveOpen, setSensitiveOpen] = useState(false)
  const update = (mutate: (draft: ModelSelection) => void) => { const draft = structuredClone(selection); mutate(draft); onChange(draft) }
  const sensitive = DIMENSION_REGISTRY.filter((dimension) =>
    dimension.sensitive &&
    dimension.classification === 'soft_preference' &&
    SOFT_PREFERENCE_IDS.includes(dimension.id as SoftPreferenceId) &&
    !['education.school', 'health.myopia', 'health.chronic'].includes(dimension.id),
  )
  const chooseMbti = (pole: MbtiPoleId) => update((draft) => {
    const axis = MBTI_AXES.find(([left, right]) => left === pole || right === pole)
    if (!axis) return
    const withoutAxis = draft.entertainment.mbti.filter((item) => !axis.includes(item))
    draft.entertainment.mbti = draft.entertainment.mbti.includes(pole) ? withoutAxis : [...withoutAxis, pole]
  })

  return (
    <section className="step-panel" aria-labelledby="sensitive-title">
      <div className="step-heading"><span className="eyebrow">第四关 · 彩蛋与边界</span><h2 id="sensitive-title" tabIndex={-1}>彩蛋随便玩，敏感的有护栏</h2><p>敏感人口条件与敏感偏好都默认折叠、默认不分享；星座和 MBTI 只生成娱乐指数。</p></div>
      <section className="sensitive-box">
        <button aria-controls="sensitive-options" aria-expanded={sensitiveOpen} className="disclosure-button" type="button" onClick={() => setSensitiveOpen((value) => !value)}><span><b>敏感人口条件与偏好</b><small>房车、健康、外形、家庭财务、关系边界等 · 默认不分享</small></span><span aria-hidden="true">{sensitiveOpen ? '−' : '+'}</span></button>
        {sensitiveOpen && <div id="sensitive-options">
          <div className="sensitive-hard-grid">
            <fieldset className="sensitive-hard-card"><legend><DimensionSticker className="legend-sticker" dimensionId="economy.house" />住房条件 · 硬边界不砍人</legend><Chip active={selection.correlated.housing.required} tone="sun" onClick={() => update((draft) => { draft.correlated.housing.required = !draft.correlated.housing.required })}>要求有住房</Chip><div className="chip-row nested-row"><span>位置</span>{HOUSE_LOCATIONS.map(([id, label]) => <Chip key={id} active={selection.correlated.housing.location === id} tone="sun" onClick={() => update((draft) => { draft.correlated.housing.location = draft.correlated.housing.location === id ? null : id; if (draft.correlated.housing.location) draft.correlated.housing.required = true })}>{label}</Chip>)}</div><div className="chip-row nested-row"><span>类型</span>{HOUSE_TYPES.map(([id, label]) => <Chip key={id} active={selection.correlated.housing.type === id} tone="sun" onClick={() => update((draft) => { draft.correlated.housing.type = draft.correlated.housing.type === id ? null : id; if (draft.correlated.housing.type) draft.correlated.housing.required = true })}>{label}</Chip>)}</div><label className="compound-number" htmlFor="house-area"><span>最低面积（㎡）</span><input id="house-area" min="1" max="2000" placeholder="不限" type="number" value={selection.correlated.housing.minAreaSqm ?? ''} onChange={(event) => update((draft) => { draft.correlated.housing.minAreaSqm = event.target.value ? Number(event.target.value) : null; if (draft.correlated.housing.minAreaSqm) draft.correlated.housing.required = true })} /></label></fieldset>
            <fieldset className="sensitive-hard-card"><legend><DimensionSticker className="legend-sticker" dimensionId="economy.vehicle" />车辆条件 · 硬边界不砍人</legend><Chip active={selection.correlated.vehicle.required} tone="sun" onClick={() => update((draft) => { draft.correlated.vehicle.required = !draft.correlated.vehicle.required })}>要求有车</Chip><div className="chip-row nested-row"><span>价位并集</span>{CAR_BANDS.map(([id, label]) => <Chip key={id} active={selection.correlated.vehicle.priceBands.includes(id)} tone="sun" onClick={() => update((draft) => { draft.correlated.vehicle.priceBands = toggleArrayValue(draft.correlated.vehicle.priceBands, id); if (draft.correlated.vehicle.priceBands.length > 0) draft.correlated.vehicle.required = true })}>{label}</Chip>)}</div></fieldset>
            <fieldset className="sensitive-hard-card"><legend><DimensionSticker className="legend-sticker" dimensionId="health.chronic" />健康与外形 · 硬边界不砍人</legend><div className="chip-row"><Chip active={selection.correlated.healthCriteria.includes('no_major_chronic')} tone="peach" onClick={() => update((draft) => { draft.correlated.healthCriteria = toggleArrayValue(draft.correlated.healthCriteria, 'no_major_chronic') })}>无慢性病</Chip><Chip active={selection.correlated.healthCriteria.includes('no_myopia')} tone="peach" onClick={() => update((draft) => { draft.correlated.healthCriteria = toggleArrayValue(draft.correlated.healthCriteria, 'no_myopia') })}>不近视</Chip><Chip active={selection.correlated.hairCriteria.includes('full_hair')} tone="sun" onClick={() => update((draft) => { draft.correlated.hairCriteria = toggleArrayValue(draft.correlated.hairCriteria, 'full_hair') })}>不脱发</Chip></div><p>“无重大慢性病”缺少定义一致的联合比例，“不近视”也缺成人同口径数据，两者只进入契合示意；脱发条件保留为硬边界但不砍人——六城社区研究的口径不足以代表全国。</p></fieldset>
            <fieldset className="sensitive-hard-card"><legend><DimensionSticker className="legend-sticker" dimensionId="appearance.body_type" />体型与烟酒 · 烟酒计入，体型保留</legend><div className="chip-row">{BODY_OPTIONS.map(([id, label]) => <Chip key={id} active={selection.correlated.bodyTypes.includes(id)} tone="sun" onClick={() => update((draft) => { draft.correlated.bodyTypes = toggleArrayValue(draft.correlated.bodyTypes, id) })}>{label}</Chip>)}</div><div className="chip-row nested-row"><span>生活习惯</span><Chip active={selection.correlated.smoking === 'non_smoker'} tone="sun" onClick={() => update((draft) => { draft.correlated.smoking = draft.correlated.smoking === 'non_smoker' ? 'any' : 'non_smoker' })}>当前不吸烟</Chip><Chip active={selection.correlated.drinking === 'not_regular'} tone="sun" onClick={() => update((draft) => { draft.correlated.drinking = draft.correlated.drinking === 'not_regular' ? 'any' : 'not_regular' })}>过去 30 天未饮酒</Chip><Chip active={selection.correlated.drinking === 'none'} tone="sun" onClick={() => update((draft) => { draft.correlated.drinking = draft.correlated.drinking === 'none' ? 'any' : 'none' })}>过去 12 个月未饮酒</Chip></div><p>体型标签主观，只记录不砍人；烟酒按全国调查回溯期口径真实计入，联合用 Fréchet 界。回溯期口径不代表终身状态。</p></fieldset>
          </div>
          <div className="sensitive-grid">{sensitive.map((dimension) => <article key={dimension.id}><h3>{dimension.label}</h3><p>{dimension.description}</p><Chip active={selection.softPreferenceIds.includes(dimension.id as SoftPreferenceId)} tone="peach" onClick={() => update((draft) => { draft.softPreferenceIds = toggleArrayValue(draft.softPreferenceIds, dimension.id as SoftPreferenceId) })}>{selection.softPreferenceIds.includes(dimension.id as SoftPreferenceId) ? '已加入' : '加入偏好'}</Chip></article>)}</div>
        </div>}
      </section>
      <section className="fun-box" aria-labelledby="fun-title"><div className="fun-heading"><span className="class-badge">纯娱乐</span><h3 id="fun-title">玄学在这里单独玩</h3><p>无论选多少，满足硬条件的人数都不变。</p></div>
        <fieldset><legend><DimensionSticker className="legend-sticker" dimensionId="entertainment.zodiac" />星座</legend><div className="chip-row">{(Object.keys(ZODIAC_LABELS) as ZodiacId[]).map((zodiac) => <Chip key={zodiac} active={selection.entertainment.zodiacs.includes(zodiac)} tone="lilac" onClick={() => update((draft) => { draft.entertainment.zodiacs = toggleArrayValue(draft.entertainment.zodiacs, zodiac) })}>{ZODIAC_LABELS[zodiac]}</Chip>)}</div></fieldset>
        <fieldset><legend><DimensionSticker className="legend-sticker" dimensionId="entertainment.mbti" />MBTI 四轴</legend><div className="axis-grid">{MBTI_AXES.map((axis) => <div className="chip-row" key={axis.join('')}>{axis.map((pole) => <Chip key={pole} active={selection.entertainment.mbti.includes(pole)} tone="lilac" onClick={() => chooseMbti(pole)}>{pole}</Chip>)}</div>)}</div></fieldset>
      </section>
      <div className="step-actions"><button className="button button-primary" type="button" onClick={onNext}>⚡ 揭榜！</button></div>
    </section>
  )
}
