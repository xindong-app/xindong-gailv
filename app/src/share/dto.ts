import type { ModelResult } from '../engine/modelEngine'
import { formatCount } from '../engine/modelEngine'
import { DIMENSION_BY_ID } from '../model/dimensions'
import { activeConditions } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'
import type { ShareDto, ShareSettings } from './types'

const NOTICE = '仅供娱乐参考·模型推算，不是官方结论，也不预测具体感情结果' as const

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
    scores: settings.showEntertainment ? { entertainment: result.scores.entertainment } : {},
    confidenceGrade: result.confidence.grade,
    notice: NOTICE,
  }

  if (settings.showRegion) {
    dto.region = selection.target.cities.length === 0 ? '全国' : selection.target.cities.join('、')
  }
  if (settings.showCount) {
    dto.population = {
      estimateLabel: result.population.resolutionExceeded
        ? '低于模型可靠分辨率（不代表不存在）'
        : result.population.displayShort,
      rangeLabel: `${formatCount(result.population.range.conservative)}–${formatCount(result.population.range.optimistic)}`,
      resolutionExceeded: result.population.resolutionExceeded,
    }
  }
  if (conditions) dto.conditions = conditions
  return dto
}
