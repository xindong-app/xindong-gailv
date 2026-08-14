import type { ModelResult } from '../engine/modelEngine'
import { formatCount } from '../engine/modelEngine'
import { buildFunnelFrames } from '../fun/funnelFrames'
import { buildVerdict, fmtRarity, rarityTier } from '../fun/rarity'
import { pickProf } from '../fun/skins'
import { DIMENSION_BY_ID } from '../model/dimensions'
import { activeConditions, removeSelectionDimension } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'
import type { ShareDto, ShareSettings } from './types'

const NOTICE = '仅供娱乐参考·模型推算，不是官方结论，也不预测具体感情结果' as const

/**
 * 只含公开条件的选择副本 —— 毒舌总评专用。
 * 漏斗是链式重算, 隐藏条件会改变后续帧的条件概率;
 * 所以总评必须在"公开条件副本"上整链重算, 而不是算完再过滤帧。
 * 性别总是公开(目标口径); 年龄/地区跟随各自开关; 婚史与其余维度跟随条件白名单。
 */
function selectionForVerdict(
  selection: ModelSelection,
  settings: ShareSettings,
  publicConditionIds: ReadonlySet<string>,
): ModelSelection {
  let draft = structuredClone(selection)
  for (const condition of activeConditions(selection)) {
    const id = condition.dimensionId
    const isPublic = id === 'base.gender'
      ? true
      : id === 'base.age'
        ? settings.showAge
        : id === 'base.region'
          ? settings.showRegion
          : publicConditionIds.has(id)
    if (!isPublic) draft = removeSelectionDimension(draft, id)
  }
  return draft
}

export function buildShareDto(
  selection: ModelSelection,
  result: ModelResult,
  settings: ShareSettings,
): ShareDto {
  const included = new Set(settings.includedDimensionIds)
  const consentedSensitive = new Set(settings.sensitiveConsentDimensionIds)
  const conditions = settings.showConditions
    ? activeConditions(selection)
      .filter((condition) => {
        if (!included.has(condition.dimensionId)) return false
        if (!settings.showRegion && condition.dimensionId === 'base.region') return false
        if (!settings.showAge && condition.dimensionId === 'base.age') return false
        const dimension = DIMENSION_BY_ID.get(condition.dimensionId)
        return dimension != null && (!dimension.sensitive || consentedSensitive.has(dimension.id))
      })
      .map(({ dimensionId, label, summary }) => ({ dimensionId, label, summary }))
    : undefined

  const dto: ShareDto = {
    schemaVersion: 1,
    title: '择偶条件分析战报',
    versions: {
      modelVersion: result.versions.modelVersion,
      dataVersion: result.versions.dataVersion,
    },
    audience: {
      genderLabel: selection.target.gender === 'male' ? '男性' : '女性',
      ...(settings.showAge ? { ageRange: `${selection.target.age.min}–${selection.target.age.max} 岁` } : {}),
    },
    scores: settings.showEntertainment
      ? { entertainment: result.scores.entertainment }
      : {},
    confidenceGrade: result.confidence.grade,
    notice: NOTICE,
  }

  if (settings.showRegion) {
    dto.region = selection.target.cities.length === 0 ? '全国' : selection.target.cities.join('、')
  }
  const upperBound = result.population.status === 'upper_bound'
  if (settings.showCount && result.population.status !== 'unavailable') {
    dto.population = {
      estimateLabel: result.population.resolutionExceeded
        ? '低于模型可靠分辨率（不代表不存在）'
        : result.population.displayShort,
      rangeLabel: `${formatCount(result.population.range.conservative)}–${formatCount(result.population.range.optimistic)}`,
      resolutionExceeded: result.population.resolutionExceeded,
      ...(upperBound ? { upperBound: true } : {}),
    }
    // 数值下溢不是现实零人: 趣味层(稀有度/幸存者/总评)整体不派生
    const funAllowed = result.population.zeroMeaning !== 'model_underflow'
    if (funAllowed) {
      // 趣味块完全由人数派生: 人数不公开时稀有度同样不能出现(防止反推)
      const base = result.population.base
      const probability = base > 0 ? result.population.estimate / base : 0
      const tier = rarityTier(probability * 10_000)
      const survivors = base > 0 ? Math.max(0, Math.round((80 * result.population.estimate) / base)) : 0
      const survivorIndex = Math.max(0, survivors - 1)
      // 隐藏地区时只用全国通用人物, 不能用城市皮肤反推地域
      const survivorProf = pickProf(survivorIndex, settings.showRegion ? selection.target.cities : ['全国'])
      // 毒舌总评: 在"只含公开条件"的选择副本上整链重算,
      // 没有可公开的量化条件时整段省略(存在性也不泄露)
      const publicIds = new Set((conditions ?? []).map((condition) => condition.dimensionId))
      const verdictFrames = buildFunnelFrames(selectionForVerdict(selection, settings, publicIds))
      const verdict = conditions && conditions.length > 0 ? buildVerdict(verdictFrames) : null
      dto.fun = {
        tierKey: tier.key,
        tierLabel: upperBound ? `${tier.label}（最低稀有程度）` : tier.label,
        tierComment: upperBound
          ? '加入尚未量化的硬条件后，真实稀有度只会更高'
          : tier.comment,
        tierBg: tier.bg,
        tierFg: tier.fg,
        rarityText: upperBound ? `最多 ${fmtRarity(probability)}` : fmtRarity(probability),
        survivors,
        survivor: { name: survivorProf.name, emoji: survivorProf.emoji },
        ...(upperBound ? { upperBound: true } : {}),
        ...(verdict ? { verdict } : {}),
      }
    }
  }
  if (conditions) dto.conditions = conditions
  return dto
}
