import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

export function scenario(patch: Partial<ModelSelection> = {}): ModelSelection {
  return {
    ...DEFAULT_SELECTION,
    ...patch,
    target: { ...DEFAULT_SELECTION.target, ...patch.target },
    correlated: {
      ...DEFAULT_SELECTION.correlated,
      ...patch.correlated,
      housing: { ...DEFAULT_SELECTION.correlated.housing, ...patch.correlated?.housing },
      vehicle: { ...DEFAULT_SELECTION.correlated.vehicle, ...patch.correlated?.vehicle },
    },
    entertainment: { ...DEFAULT_SELECTION.entertainment, ...patch.entertainment },
  }
}

export const GOLDEN_SCENARIOS: ReadonlyArray<{ id: string; label: string; input: ModelSelection }> = [
  { id: 'base', label: '全国 26–34 岁男性不限婚史基础池', input: DEFAULT_SELECTION },
  { id: 'one-common', label: '一个常见条件：不吸烟', input: scenario({ correlated: { ...DEFAULT_SELECTION.correlated, smoking: 'non_smoker' } }) },
  { id: 'three-common', label: '三个常见条件：175cm+、本科+、不吸烟', input: scenario({
    target: { ...DEFAULT_SELECTION.target, heightCm: { min: 175, max: null } },
    correlated: { ...DEFAULT_SELECTION.correlated, educationLevels: ['bachelor', 'master', 'doctorate'], smoking: 'non_smoker' },
  }) },
  { id: 'five-common', label: '五个条件：另加过去30天未饮酒与运动偏好', input: scenario({
    target: { ...DEFAULT_SELECTION.target, heightCm: { min: 175, max: null } },
    correlated: { ...DEFAULT_SELECTION.correlated, educationLevels: ['bachelor', 'master', 'doctorate'], smoking: 'non_smoker', drinking: 'not_regular' },
    softPreferenceIds: ['lifestyle.exercise'],
  }) },
  { id: 'eight-common', label: '八个条件：加入慢性病软偏好与多项软/娱乐偏好', input: scenario({
    target: { ...DEFAULT_SELECTION.target, heightCm: { min: 175, max: null } },
    correlated: { ...DEFAULT_SELECTION.correlated, educationLevels: ['bachelor', 'master', 'doctorate'], smoking: 'non_smoker', drinking: 'not_regular', healthCriteria: ['no_major_chronic'] },
    softPreferenceIds: ['lifestyle.exercise', 'lifestyle.sleep_rhythm', 'lifestyle.cooking', 'relationship.currently_single'],
    entertainment: { zodiacs: ['leo'], mbti: [] },
  }) },
  { id: 'economic-cluster', label: '收入、资产、住房、学历高相关组合', input: scenario({
    correlated: {
      ...DEFAULT_SELECTION.correlated,
      minAnnualIncomeWan: 30,
      minHouseholdWealthWan: 300,
      housing: { required: true, location: null, minAreaSqm: null, type: null },
      educationLevels: ['bachelor', 'master', 'doctorate'],
    },
  }) },
  { id: 'health-cluster', label: '体型、慢病、烟酒、发量相关组合', input: scenario({
    correlated: {
      ...DEFAULT_SELECTION.correlated,
      bodyTypes: ['balanced', 'standard'],
      smoking: 'non_smoker',
      drinking: 'not_regular',
      healthCriteria: ['no_major_chronic'],
      hairCriteria: ['full_hair'],
    },
    softPreferenceIds: ['lifestyle.exercise', 'lifestyle.sleep_rhythm'],
  }) },
  { id: 'beijing', label: '单城市北京', input: scenario({ target: { ...DEFAULT_SELECTION.target, cities: ['北京'] } }) },
  { id: 'multi-city', label: '多城市北京+上海+深圳', input: scenario({ target: { ...DEFAULT_SELECTION.target, cities: ['北京', '上海', '深圳'] } }) },
  { id: 'female', label: '全国 26–34 岁女性不限婚史', input: scenario({ target: { ...DEFAULT_SELECTION.target, gender: 'female' } }) },
  { id: 'age-18', label: '边界年龄 18 岁且不限婚史', input: scenario({ target: { ...DEFAULT_SELECTION.target, age: { min: 18, max: 18 }, maritalStatuses: [] } }) },
  { id: 'age-50', label: '边界年龄 50 岁且不限婚史', input: scenario({ target: { ...DEFAULT_SELECTION.target, age: { min: 50, max: 50 }, maritalStatuses: [] } }) },
  { id: 'soft-heavy', label: '软偏好很多但硬条件很少', input: scenario({
    softPreferenceIds: ['lifestyle.exercise', 'lifestyle.sleep_rhythm', 'lifestyle.cooking', 'family.only_child', 'family.parents_pension', 'career.in_system', 'relationship.currently_single', 'communication.conflict_repair', 'values.loyalty'],
    entertainment: { zodiacs: ['leo'], mbti: ['E', 'N', 'F', 'J'] },
  }) },
  { id: 'idol-preset', label: '旧“偶像剧男主”语义迁移', input: scenario({
    target: { ...DEFAULT_SELECTION.target, heightCm: { min: 180, max: null } },
    correlated: {
      ...DEFAULT_SELECTION.correlated,
      bodyTypes: ['balanced'], minAnnualIncomeWan: 50,
      housing: { required: true, location: 'core', minAreaSqm: null, type: null },
      educationLevels: ['bachelor', 'master', 'doctorate'], smoking: 'non_smoker', hairCriteria: ['full_hair'],
    },
    softPreferenceIds: ['values.partner_career_support'],
  }) },
  { id: 'mother-preset', label: '旧“我妈的理想型”语义迁移', input: scenario({
    target: { ...DEFAULT_SELECTION.target, age: { min: 26, max: 32 } },
    correlated: {
      ...DEFAULT_SELECTION.correlated, minAnnualIncomeWan: 20,
      housing: { required: true, location: null, minAreaSqm: null, type: null },
      vehicle: { required: true, priceBands: [] }, educationLevels: ['bachelor', 'master'],
      smoking: 'non_smoker', drinking: 'not_regular', hairCriteria: ['full_hair'],
    },
    softPreferenceIds: ['career.in_system'],
  }) },
]
