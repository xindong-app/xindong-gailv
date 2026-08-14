import { DIMENSION_BY_ID, DIMENSION_REGISTRY } from './dimensions'
import {
  BODY_TYPES,
  DEFAULT_SELECTION,
  MBTI_POLES,
  ZODIACS,
  type ModelSelection,
  type SoftPreferenceId,
} from './schema'

export interface ActiveCondition {
  dimensionId: string
  label: string
  classification: 'hard_filter' | 'correlated_hard' | 'soft_preference' | 'entertainment'
  sensitive: boolean
  summary: string
}

export function cloneSelection(selection: ModelSelection): ModelSelection {
  return structuredClone(selection)
}

export function toggleArrayValue<T extends string>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function removeSelectionDimension(selection: ModelSelection, dimensionId: string): ModelSelection {
  const next = cloneSelection(selection)
  switch (dimensionId) {
    case 'base.gender': next.target.gender = DEFAULT_SELECTION.target.gender; break
    case 'base.age': next.target.age = { ...DEFAULT_SELECTION.target.age }; break
    case 'base.region': next.target.cities = ['全国']; break
    case 'base.marital': next.target.maritalStatuses = []; break
    case 'appearance.height': next.target.heightCm = null; break
    case 'appearance.body_type': next.correlated.bodyTypes = []; break
    case 'education.level': next.correlated.educationLevels = []; break
    case 'education.school': next.correlated.schoolTier = null; break
    case 'economy.income': next.correlated.minAnnualIncomeWan = null; break
    case 'economy.wealth': next.correlated.minHouseholdWealthWan = null; break
    case 'economy.house': next.correlated.housing = { ...DEFAULT_SELECTION.correlated.housing }; break
    case 'economy.vehicle': next.correlated.vehicle = { required: false, priceBands: [] }; break
    case 'lifestyle.smoking': next.correlated.smoking = 'any'; break
    case 'lifestyle.drinking': next.correlated.drinking = 'any'; break
    case 'health.chronic':
      next.correlated.healthCriteria = next.correlated.healthCriteria.filter((item) => item !== 'no_major_chronic')
      break
    case 'health.myopia':
      next.correlated.healthCriteria = next.correlated.healthCriteria.filter((item) => item !== 'no_myopia')
      break
    case 'appearance.hair_full': next.correlated.hairCriteria = []; break
    case 'entertainment.zodiac': next.entertainment.zodiacs = []; break
    case 'entertainment.mbti': next.entertainment.mbti = []; break
    default:
      if (DIMENSION_BY_ID.get(dimensionId)?.classification === 'soft_preference') {
        next.softPreferenceIds = next.softPreferenceIds.filter((item) => item !== dimensionId)
        next.selfPreferenceIds = next.selfPreferenceIds.filter((item) => item !== dimensionId)
      }
  }
  return next
}

export function activeConditions(selection: ModelSelection): ActiveCondition[] {
  const items: ActiveCondition[] = []
  const add = (dimensionId: string, summary: string) => {
    const dimension = DIMENSION_BY_ID.get(dimensionId)
    if (!dimension) return
    items.push({
      dimensionId,
      label: dimension.label,
      classification: dimension.classification,
      sensitive: dimension.sensitive,
      summary,
    })
  }

  add('base.gender', selection.target.gender === 'male' ? '男性' : '女性')
  add('base.age', `${selection.target.age.min}–${selection.target.age.max} 岁`)
  add('base.region', selection.target.cities.length === 0 ? '全国' : selection.target.cities.join('、'))
  if (selection.target.maritalStatuses.length > 0) add('base.marital', `${selection.target.maritalStatuses.length} 个状态`)
  if (selection.target.heightCm?.min != null || selection.target.heightCm?.max != null) {
    add('appearance.height', `${selection.target.heightCm.min ?? '不限'}–${selection.target.heightCm.max ?? '不限'} cm`)
  }
  if (selection.correlated.bodyTypes.length > 0 && selection.correlated.bodyTypes.length < BODY_TYPES.length) {
    add('appearance.body_type', `${selection.correlated.bodyTypes.length} 档`)
  }
  if (selection.correlated.educationLevels.length > 0) add('education.level', `${selection.correlated.educationLevels.length} 档`)
  if (selection.correlated.schoolTier) add('education.school', `${selection.correlated.schoolTier.toUpperCase()} 偏好`)
  if ((selection.correlated.minAnnualIncomeWan ?? 0) > 0) add('economy.income', `${selection.correlated.minAnnualIncomeWan} 万+/年`)
  if ((selection.correlated.minHouseholdWealthWan ?? 0) > 0) add('economy.wealth', `${selection.correlated.minHouseholdWealthWan} 万+`)
  const housing = selection.correlated.housing
  if (housing.required || housing.location != null || housing.minAreaSqm != null || housing.type != null) {
    add('economy.house', [housing.required ? '要求有住房' : '', housing.location ?? '', housing.minAreaSqm ? `${housing.minAreaSqm}㎡+` : '', housing.type ?? ''].filter(Boolean).join(' · '))
  }
  if (selection.correlated.vehicle.required || selection.correlated.vehicle.priceBands.length > 0) {
    add('economy.vehicle', selection.correlated.vehicle.priceBands.length > 0 ? `${selection.correlated.vehicle.priceBands.length} 个价位档` : '要求有车')
  }
  if (selection.correlated.smoking !== 'any') add('lifestyle.smoking', '当前不吸烟')
  if (selection.correlated.drinking !== 'any') add('lifestyle.drinking', selection.correlated.drinking === 'none' ? '过去 12 个月未饮酒' : '过去 30 天未饮酒')
  if (selection.correlated.healthCriteria.includes('no_major_chronic')) add('health.chronic', '软偏好')
  if (selection.correlated.healthCriteria.includes('no_myopia')) add('health.myopia', '软偏好')
  if (selection.correlated.hairCriteria.length > 0) add('appearance.hair_full', '无雄激素性脱发')
  for (const id of selection.softPreferenceIds) add(id, '偏好')
  if (selection.entertainment.zodiacs.length > 0 && selection.entertainment.zodiacs.length < ZODIACS.length) {
    add('entertainment.zodiac', `${selection.entertainment.zodiacs.length} 个`)
  }
  const selectedMbti = new Set(selection.entertainment.mbti)
  const constrainedMbtiAxes = [
    [MBTI_POLES[0], MBTI_POLES[1]],
    [MBTI_POLES[2], MBTI_POLES[3]],
    [MBTI_POLES[4], MBTI_POLES[5]],
    [MBTI_POLES[6], MBTI_POLES[7]],
  ].filter(([left, right]) => selectedMbti.has(left) !== selectedMbti.has(right)).length
  if (constrainedMbtiAxes > 0) add('entertainment.mbti', selection.entertainment.mbti.join(''))
  return items
}

export function selectedSoftEntries(selection: ModelSelection) {
  const selected = new Set<SoftPreferenceId>(selection.softPreferenceIds)
  return DIMENSION_REGISTRY.filter(
    (dimension) => dimension.classification === 'soft_preference' && selected.has(dimension.id as SoftPreferenceId),
  )
}

export function countOptionalConditions(selection: ModelSelection): number {
  return activeConditions(selection).filter((item) => !['base.gender', 'base.age', 'base.region'].includes(item.dimensionId)).length
}

export function sanitizeForSession(selection: ModelSelection): ModelSelection {
  const safe = cloneSelection(DEFAULT_SELECTION)
  safe.target.gender = selection.target.gender
  safe.target.age = { ...selection.target.age }
  safe.target.cities = [...selection.target.cities]
  // 婚史属于敏感条件。即使默认选择里有预填值，也不能进入会话草稿。
  safe.target.maritalStatuses = []
  safe.target.heightCm = selection.target.heightCm ? { ...selection.target.heightCm } : null
  safe.correlated.educationLevels = [...selection.correlated.educationLevels]
  safe.correlated.schoolTier = selection.correlated.schoolTier
  safe.softPreferenceIds = selection.softPreferenceIds.filter((id) => !DIMENSION_BY_ID.get(id)?.sensitive)
  safe.entertainment = {
    zodiacs: [...selection.entertainment.zodiacs],
    mbti: [...selection.entertainment.mbti],
  }
  return safe
}
