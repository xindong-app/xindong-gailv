import { CITIES, type City } from './cities'

/** Stable population-quantification statuses consumed by the model engine. */
export type PopulationQuantificationStatus =
  | 'included_estimate'
  | 'unquantified'
  | 'research_only'

export type MainEstimateEffect = 'apply' | 'do_not_apply'
export type ResultSemantics = 'estimate' | 'upper_bound' | 'research_scenario_only'
export type PopulationScenarioMethod =
  | 'direct_point'
  | 'city_structure_multiplier'
  | 'five_year_group_mapping'
  | 'height_parameter_endpoints'
  | 'all_age_to_target_age_multiplier'
  | 'drinking_raking_endpoints'
  | 'not_applied'

export interface PopulationQuantificationPolicy {
  dimensionId: string
  status: PopulationQuantificationStatus
  mainEstimateEffect: MainEstimateEffect
  resultSemantics: ResultSemantics
  evidenceIds: readonly string[]
  reason: string
  /** Exact runtime sensitivity method. This is machine-checked at release. */
  scenarioMethod: PopulationScenarioMethod
  /** Multipliers consumed only by multiplier-based methods; never a CI. */
  scenarioRange?: {
    conservativeMultiplier: number
    optimisticMultiplier: number
    isConfidenceInterval: false
  }
}

const policy = (
  dimensionId: string,
  status: PopulationQuantificationStatus,
  mainEstimateEffect: MainEstimateEffect,
  resultSemantics: ResultSemantics,
  evidenceIds: readonly string[],
  reason: string,
  scenarioRange?: PopulationQuantificationPolicy['scenarioRange'],
  scenarioMethod?: PopulationScenarioMethod,
): PopulationQuantificationPolicy => ({
  dimensionId,
  status,
  mainEstimateEffect,
  resultSemantics,
  evidenceIds,
  reason,
  scenarioMethod: scenarioMethod ?? (mainEstimateEffect === 'apply' ? 'direct_point' : 'not_applied'),
  ...(scenarioRange == null ? {} : { scenarioRange }),
})

const C_WIDE_RANGE = {
  conservativeMultiplier: 0.7,
  optimisticMultiplier: 1.3,
  isConfidenceInterval: false,
} as const

/**
 * Authoritative policy map for whether a user condition may reduce the main
 * population estimate. IDs are stable model dimension IDs, not display labels.
 */
export const POPULATION_QUANTIFICATION_POLICY: Readonly<Record<string, PopulationQuantificationPolicy>> = {
  'base.age': policy(
    'base.age', 'included_estimate', 'apply', 'estimate',
    ['evidence.base.age.census-2020-single-year', 'evidence.base.age.population-sample-2025'],
    '2020年七普提供18—50岁逐岁人口；2025只校准总量/大组，结果仍须说明时点错位。',
  ),
  'base.gender': policy(
    'base.gender', 'included_estimate', 'apply', 'estimate',
    ['evidence.base.age.census-2020-single-year', 'evidence.base.age.population-sample-2025'],
    '七普逐岁表直接给出男性和女性人数；当前只支持男/女统计口径。',
  ),
  'base.region': policy(
    'base.region', 'included_estimate', 'apply', 'estimate',
    ['evidence.base.region.census-mainland-total-2020', 'evidence.base.region.population-2025'],
    '全国可量化；2025全国总量只作宏观校准。城市只有在cities.ts登记官方常住人口锚点时可量化，并固定使用2020七普大陆人口141,177.8724万人作为年龄×性别份额分母；城市结构外推采用C级宽情景。',
    C_WIDE_RANGE,
    'city_structure_multiplier',
  ),
  'base.marital': policy(
    'base.marital', 'included_estimate', 'apply', 'estimate',
    ['evidence.base.marital.census-2020'],
    '七普长表提供按年龄和性别分层的互斥婚姻状态；不等于当前是否有伴侣。',
    undefined,
    'five_year_group_mapping',
  ),
  'appearance.height': policy(
    'appearance.height', 'included_estimate', 'apply', 'estimate',
    ['evidence.appearance.height.sport-monitoring-2020', 'evidence.appearance.height.distribution-assumption'],
    '年龄性别均值有官方实测，区间概率依赖C级分布假设，必须显示宽情景。',
    undefined,
    'height_parameter_endpoints',
  ),
  'appearance.body_type': policy(
    'appearance.body_type', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.appearance.bmi.nhc-2018'],
    '产品体型标签是主观语义，无法由全国BMI超重/肥胖率可靠映射；选择后只记录条件并把主人数解释为上界。',
  ),
  'education.level': policy(
    'education.level', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.education.level.census-2020'],
    '证据表可直接提取，但完整18—50岁逐岁×性别机器表尚未进入运行时；在提取验收前禁止常量近似砍人。',
  ),
  'economy.income': policy(
    'economy.income', 'research_only', 'do_not_apply', 'research_scenario_only',
    ['evidence.economy.income.wages-2025', 'evidence.economy.income.household-2025', 'evidence.economy.income.migrant-workers-2025'],
    '单位就业者平均工资、居民人均可支配收入和农民工月均收入均不是18—50岁目标个人税前年收入分布。',
  ),
  'economy.wealth': policy(
    'economy.wealth', 'research_only', 'do_not_apply', 'research_scenario_only',
    ['evidence.economy.wealth.pbc-2019', 'evidence.economy.wealth.distribution-assumption'],
    '2019城镇家庭资产不能当作全国目标个人/家庭资产阈值分布；高尾也缺少同分母公开微观表。',
  ),
  'economy.house': policy(
    'economy.house', 'research_only', 'do_not_apply', 'research_scenario_only',
    ['evidence.economy.house.pbc-2019', 'evidence.economy.house.local-young-assumption'],
    '城镇家庭拥有住房不等于目标个人名下、本地、满足类型和面积，无法直接转为个人硬条件概率。',
  ),
  'economy.vehicle': policy(
    'economy.vehicle', 'research_only', 'do_not_apply', 'research_scenario_only',
    ['evidence.economy.car.household-2025', 'evidence.economy.car.personal-assumption'],
    '每百户家用汽车拥有量不是个人有车概率，也不支持价位阈值；不得进入主人口连乘。',
  ),
  'lifestyle.smoking': policy(
    'lifestyle.smoking', 'included_estimate', 'apply', 'estimate',
    ['evidence.lifestyle.smoking.cdc-2024'],
    '全国调查的当前吸烟率可按性别取补集；不是终身从不吸烟。公开表缺少18—50岁年龄×性别联合格，运行时用0.70—1.30宽情景传播全龄率映射风险。',
    C_WIDE_RANGE,
    'all_age_to_target_age_multiplier',
  ),
  'lifestyle.drinking': policy(
    'lifestyle.drinking', 'included_estimate', 'apply', 'estimate',
    ['evidence.lifestyle.drinking.cdc-2024'],
    '全国调查支持回溯期边际率；年龄×性别联合需raking，运行时直接传播登记的raking分母端点，不再叠加通用倍数。',
    undefined,
    'drinking_raking_endpoints',
  ),
  'appearance.hair_full': policy(
    'appearance.hair_full', 'research_only', 'do_not_apply', 'research_scenario_only',
    ['evidence.appearance.hair_full.community-study'],
    '六城社区研究与全国18—50岁、尤其女性的同粒度分布不一致，不能作为全国主估算硬扣减。',
  ),
  'health.chronic': policy(
    'health.chronic', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.health.chronic.no-major-disease-assumption'],
    '“无重大疾病”缺少统一病种、诊断时点和联合患病口径；敏感条件只能记录，主人数为上界。',
  ),
  'health.myopia': policy(
    'health.myopia', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.health.myopia.adult-evidence-gap'],
    '缺少覆盖全国18—50岁且与产品定义一致的成人分布。',
  ),
  'relationship.currently_single': policy(
    'relationship.currently_single', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.soft.currently_single.assumption'],
    '婚姻状态不等于当前没有伴侣，现有0.65常数无同口径调查支持。',
  ),
  'relationship.orientation_compatible': policy(
    'relationship.orientation_compatible', 'unquantified', 'do_not_apply', 'upper_bound',
    ['evidence.soft.orientation.assumption'],
    '没有当前全国代表性成人数据支持男男/女女方向可用关系池；行为、身份与吸引不可互换。',
  ),
  'relationship.children_plan': policy(
    'relationship.children_plan', 'unquantified', 'do_not_apply', 'upper_bound',
    [],
    '生育意愿随年龄、关系状态、时间和政策变化，公开结果尚不能构造18—50岁城市联合硬条件概率。',
  ),
}

const DEFAULT_UNQUANTIFIED_POLICY = policy(
  '__unknown__',
  'unquantified',
  'do_not_apply',
  'upper_bound',
  [],
  '该稳定维度ID尚未登记可进入主人口估算的同口径证据。',
)

/** Stable engine API: unknown dimensions fail closed as unquantified. */
export function populationPolicyForDimension(dimensionId: string): PopulationQuantificationPolicy {
  return POPULATION_QUANTIFICATION_POLICY[dimensionId] ?? {
    ...DEFAULT_UNQUANTIFIED_POLICY,
    dimensionId,
  }
}

export function isDimensionAppliedToMainEstimate(dimensionId: string): boolean {
  return populationPolicyForDimension(dimensionId).mainEstimateEffect === 'apply'
}

function cityByName(name: string): City | undefined {
  return CITIES.find((city) => city.name === name)
}

/** 全国由国家级锚点支持；城市必须有已登记官方常住人口锚点。 */
export function isCityMainEstimateSupported(name: string): boolean {
  if (name === '全国') return true
  return cityByName(name)?.mainEstimateStatus === 'included_estimate'
}

/** Unknown city IDs are deliberately returned as unsupported. */
export function unsupportedSelectedCities(cities: readonly string[]): string[] {
  return [...new Set(cities.filter((name) => !isCityMainEstimateSupported(name)))]
}

export function supportedSelectedCities(cities: readonly string[]): string[] {
  return [...new Set(cities.filter(isCityMainEstimateSupported))]
}
