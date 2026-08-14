import { array, object, string, type z } from 'zod/v4'
import {
  drinkingRateScenario,
  HEIGHT_SD_SCENARIOS,
  heightDist,
  nonSmokerRate,
} from '../data/model'
import {
  CENSUS_2020_MAINLAND_POPULATION_WAN,
  MAX_MODEL_AGE,
  MIN_MODEL_AGE,
  cityPopulationScale,
  maleShareAtAge,
  maritalShareAtAge,
  populationWanAtAge,
} from '../data/population'
import {
  populationPolicyForDimension,
  type PopulationScenarioMethod,
  unsupportedSelectedCities,
} from '../data/population-policy'
import { DIMENSION_BY_ID, type DimensionClass, type EvidenceGrade } from '../model/dimensions'
import { activeConditions } from '../model/selectionUtils'
import { DATA_VERSION, MODEL_VERSION } from '../model/versions'
import {
  parseSelection,
  selectionSchema,
  type ModelSelection,
  type SoftPreferenceId,
} from '../model/schema'

const clampProbability = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

export interface PopulationRange {
  conservative: number
  baseline: number
  optimistic: number
}

export interface ConditionImpact {
  dimensionId: string
  label: string
  classification: DimensionClass
  group: string
  before: number
  after: number
  retention: number
  marginalLoss: number
  evidenceGrade: EvidenceGrade
  note: string
}

export interface RelaxationSuggestion {
  dimensionId: string
  label: string
  currentEstimate: number
  relaxedEstimate: number
  gain: number
  gainRatio: number
  action: string
  note: string
}

export interface GroupResult {
  id: 'demographic' | 'anthropometric' | 'socioeconomic' | 'health_body'
  label: string
  classification: DimensionClass
  dimensions: string[]
  factor: number
  before: number
  after: number
  method: string
  evidenceGrade: EvidenceGrade
  note: string
}

export interface ModelResult {
  versions: { modelVersion: string; dataVersion: string }
  input: ModelSelection
  population: {
    base: number
    /** Full resident-population ceiling for the selected geography. */
    scopeCeiling: number
    estimate: number
    range: PopulationRange
    status: 'estimated' | 'upper_bound' | 'unavailable'
    interpretation: 'all_selected_hard_conditions' | 'quantified_conditions_only' | 'not_available'
    numericStatus: 'available' | 'unavailable'
    zeroMeaning: 'not_zero' | 'positive_below_resolution' | 'model_underflow' | 'logical_zero' | 'unavailable'
    resolutionFloor: number
    resolutionExceeded: boolean
    display: string
    displayShort: string
  }
  coverage: {
    includedHardConditions: string[]
    unquantifiedHardConditions: Array<{
      dimensionId: string
      label: string
      sensitive: boolean
      reason: string
    }>
    unsupportedCities: string[]
  }
  scores: {
    softMatch: number
    entertainment: number
    bidirectionalIllustration: number
  }
  scoreDetails: {
    selectedSoftPreferences: number
    reciprocalPreferencesProvided: boolean
    overlappingPreferences: number
    entertainmentSelections: number
    disclaimer: string
  }
  confidence: {
    grade: EvidenceGrade
    score: number
    reasons: string[]
  }
  impacts: ConditionImpact[]
  relaxations: RelaxationSuggestion[]
  groups: GroupResult[]
  explanation: string[]
}

export class ModelInputError extends Error {
  readonly issues: z.core.$ZodIssue[]

  constructor(error: z.ZodError) {
    super('模型输入未通过运行时校验')
    this.name = 'ModelInputError'
    this.issues = error.issues
  }
}

interface RawPopulationResult {
  base: number
  scopeCeiling: number
  estimate: number
  groups: GroupResult[]
  activeDimensions: string[]
  confidenceReasons: string[]
  availability: 'available' | 'unavailable'
  unsupportedCities: string[]
  structuralRange: PopulationRange
}

export interface ModelComputationOptions {
  /**
   * Selected soft/sensitive dimensions that the user explicitly declares as
   * hard requirements. They remain unquantified unless the population policy
   * has a reliable compatible denominator; no guessed prevalence is applied.
   */
  hardRequirementIds?: readonly string[]
}

const modelComputationOptionsSchema = object({
  hardRequirementIds: array(string().min(1))
    .max(DIMENSION_BY_ID.size)
    .refine((ids) => new Set(ids).size === ids.length, { message: '硬条件 ID 不能重复' })
    .refine((ids) => ids.every((id) => DIMENSION_BY_ID.has(id)), { message: '包含未登记的硬条件 ID' })
    .optional(),
}).strict()

export class ModelOptionsError extends Error {
  readonly issues: z.core.$ZodIssue[]

  constructor(error: z.ZodError) {
    super('模型计算选项未通过运行时校验')
    this.name = 'ModelOptionsError'
    this.issues = error.issues
  }
}

export class ModelRequirementError extends Error {
  readonly invalidDimensionIds: string[]

  constructor(invalidDimensionIds: string[]) {
    super(`硬条件必须是已选择且已登记的维度：${invalidDimensionIds.join('、')}`)
    this.name = 'ModelRequirementError'
    this.invalidDimensionIds = invalidDimensionIds
  }
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const density = 0.3989423 * Math.exp((-z * z) / 2)
  const probability = density * t * (
    0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))
  )
  return clampProbability(z > 0 ? 1 - probability : probability)
}

function probabilityInNormalRange(minimum: number, maximum: number, mean: number, standardDeviation: number): number {
  return clampProbability(
    normalCdf((maximum - mean) / standardDeviation) - normalCdf((minimum - mean) / standardDeviation),
  )
}

interface PopulationStratum {
  age: number
  /** Age×sex residents after the region scenario, before marital/other filters. */
  residents: ProbabilityScenario
}

function requireScenarioMethod(
  dimensionId: string,
  expectedMethod: PopulationScenarioMethod,
) {
  const policy = populationPolicyForDimension(dimensionId)
  if (policy.scenarioMethod !== expectedMethod) {
    throw new Error(`Population scenario policy is not runtime-aligned: ${dimensionId}`)
  }
  return policy
}

function multiplierScenarioFor(
  dimensionId: string,
  expectedMethod: PopulationScenarioMethod,
  baseline: number,
): ProbabilityScenario {
  const policy = requireScenarioMethod(dimensionId, expectedMethod)
  const range = policy.scenarioRange
  if (range == null) {
    throw new Error(`Population scenario policy is not runtime-aligned: ${dimensionId}`)
  }
  return {
    conservative: clampProbability(baseline * range.conservativeMultiplier),
    baseline,
    optimistic: clampProbability(baseline * range.optimisticMultiplier),
  }
}

function maritalShareScenarioAtAge(selection: ModelSelection, age: number): ProbabilityScenario {
  requireScenarioMethod('base.marital', 'five_year_group_mapping')
  const baseline = maritalShareAtAge(age, selection.target.gender, selection.target.maritalStatuses)
  if (selection.target.maritalStatuses.length === 0) {
    return { conservative: 1, baseline: 1, optimistic: 1 }
  }
  // These are declared sensitivity scenarios for mapping five-year official
  // rates to single ages. Boundary borrowing is deliberately wider. They are
  // not sampling confidence intervals.
  const relativeSpread = age < 20 || age > 49 ? 0.16 : 0.08
  return {
    conservative: clampProbability(baseline * (1 - relativeSpread)),
    baseline,
    optimistic: clampProbability(baseline * (1 + relativeSpread)),
  }
}

function populationStrata(selection: ModelSelection): PopulationStratum[] {
  const baselineScale = cityPopulationScale(selection.target.cities)
  const regionScale: ProbabilityScenario = isNationwideSelection(selection)
    ? { conservative: 1, baseline: 1, optimistic: 1 }
    : multiplierScenarioFor('base.region', 'city_structure_multiplier', baselineScale)
  const strata: PopulationStratum[] = []
  for (let age = selection.target.age.min; age <= selection.target.age.max; age += 1) {
    const totalAtAge = populationWanAtAge(age) * 10_000
    const genderShare = selection.target.gender === 'male' ? maleShareAtAge(age) : 1 - maleShareAtAge(age)
    const ageSexPeople = totalAtAge * genderShare
    strata.push({
      age,
      residents: {
        conservative: ageSexPeople * regionScale.conservative,
        baseline: ageSexPeople * regionScale.baseline,
        optimistic: ageSexPeople * regionScale.optimistic,
      },
    })
  }
  return strata
}

function isNationwideSelection(selection: ModelSelection): boolean {
  return selection.target.cities.length === 0 || selection.target.cities.includes('全国')
}

interface ProbabilityScenario {
  conservative: number
  baseline: number
  optimistic: number
}

function heightProbabilityAtAge(selection: ModelSelection, age: number): ProbabilityScenario | null {
  const range = selection.target.heightCm
  if (range == null || (range.min == null && range.max == null)) return null
  requireScenarioMethod('appearance.height', 'height_parameter_endpoints')
  // Integer UI values denote inclusive one-centimetre bins. Without the
  // half-centimetre continuity correction, 180–180 cm was an empty interval.
  const minimum = range.min == null ? 130 : range.min - 0.5
  const maximum = range.max == null ? 220 : range.max + 0.5
  const distribution = heightDist(age, selection.target.gender)
  const sdScenarios = HEIGHT_SD_SCENARIOS[selection.target.gender]
  const probabilities = [
    probabilityInNormalRange(minimum, maximum, distribution.mean, sdScenarios.conservative),
    probabilityInNormalRange(minimum, maximum, distribution.mean, sdScenarios.baseline),
    probabilityInNormalRange(minimum, maximum, distribution.mean, sdScenarios.optimistic),
  ]
  return {
    conservative: Math.min(...probabilities),
    baseline: probabilityInNormalRange(minimum, maximum, distribution.mean, distribution.sd),
    optimistic: Math.max(...probabilities),
  }
}

function lifestyleProbabilitiesAtAge(selection: ModelSelection, age: number): Array<{
  dimensionId: string
  probability: ProbabilityScenario
}> {
  const probabilities: Array<{ dimensionId: string; probability: ProbabilityScenario }> = []
  if (selection.correlated.smoking === 'non_smoker') {
    const point = nonSmokerRate(selection.target.gender)
    probabilities.push({
      dimensionId: 'lifestyle.smoking',
      probability: multiplierScenarioFor(
        'lifestyle.smoking',
        'all_age_to_target_age_multiplier',
        point,
      ),
    })
  }
  if (selection.correlated.drinking !== 'any') {
    requireScenarioMethod('lifestyle.drinking', 'drinking_raking_endpoints')
    const level = selection.correlated.drinking === 'not_regular' ? 'notRegular' : 'none'
    probabilities.push({
      dimensionId: 'lifestyle.drinking',
      probability: drinkingRateScenario(selection.target.gender, level, age),
    })
  }
  return probabilities
}

function intersectionBounds(probabilities: readonly ProbabilityScenario[]): ProbabilityScenario {
  if (probabilities.length === 0) return { conservative: 1, baseline: 1, optimistic: 1 }
  const conservative = probabilities.map((scenario) => clampProbability(scenario.conservative))
  const baseline = probabilities.map((scenario) => clampProbability(scenario.baseline))
  const optimistic = probabilities.map((scenario) => clampProbability(scenario.optimistic))
  return {
    // Fréchet bounds require no unobserved correlation parameter. The central
    // value is the transparent conditional-independence scenario, not a fact.
    conservative: clampProbability(
      conservative.reduce((sum, probability) => sum + probability, 0) - (conservative.length - 1),
    ),
    baseline: baseline.reduce((product, probability) => product * probability, 1),
    optimistic: Math.min(...optimistic),
  }
}

function selectedUnquantifiedHardConditions(
  selection: ModelSelection,
  hardRequirementIds: readonly string[],
): ModelResult['coverage']['unquantifiedHardConditions'] {
  const active = activeConditions(selection)
  const activeIds = new Set(active.map((condition) => condition.dimensionId))
  const invalidDimensionIds = [...new Set(hardRequirementIds)].filter((dimensionId) => {
    const dimension = DIMENSION_BY_ID.get(dimensionId)
    return dimension == null || dimension.classification === 'entertainment' || !activeIds.has(dimensionId)
  })
  if (invalidDimensionIds.length > 0) throw new ModelRequirementError(invalidDimensionIds)

  const selected = active.filter((condition) => {
    const policy = populationPolicyForDimension(condition.dimensionId)
    const isPopulationHard = condition.classification === 'hard_filter' || condition.classification === 'correlated_hard'
    return (isPopulationHard || hardRequirementIds.includes(condition.dimensionId)) && policy.mainEstimateEffect === 'do_not_apply'
  }).map((condition) => condition.dimensionId)

  return [...new Set(selected)].map((dimensionId) => {
    const dimension = DIMENSION_BY_ID.get(dimensionId)
    const policy = populationPolicyForDimension(dimensionId)
    return {
      dimensionId,
      label: dimension?.label ?? dimensionId,
      sensitive: dimension?.sensitive ?? true,
      reason: policy.reason,
    }
  })
}

function calculatePopulation(selection: ModelSelection): RawPopulationResult {
  const unsupportedCities = unsupportedSelectedCities(selection.target.cities)
  if (unsupportedCities.length > 0) {
    return {
      base: 0,
      estimate: 0,
      groups: [{
        id: 'demographic',
        label: '基础人口范围',
        classification: 'hard_filter',
        dimensions: ['base.age', 'base.region', 'base.gender'],
        factor: 0,
        before: 0,
        after: 0,
        method: '未计算：缺少已登记的一手常住人口锚点',
        evidenceGrade: 'NA',
        note: `${unsupportedCities.join('、')}当前不可可靠量化；0 是数值占位，不表示当地无人。`,
      }],
      activeDimensions: [],
      scopeCeiling: 0,
      confidenceReasons: [`${unsupportedCities.join('、')}缺少本数据版本可复核的官方常住人口锚点，主人口结果不可用。`],
      availability: 'unavailable',
      unsupportedCities,
      structuralRange: { conservative: 0, baseline: 0, optimistic: 0 },
    }
  }

  const strata = populationStrata(selection)
  const maritalActive = selection.target.maritalStatuses.length > 0
  const base = strata.reduce((sum, stratum) => {
    const marital = maritalShareScenarioAtAge(selection, stratum.age)
    return sum + stratum.residents.baseline * marital.baseline
  }, 0)
  const scopeCeiling = CENSUS_2020_MAINLAND_POPULATION_WAN * 10_000 * cityPopulationScale(selection.target.cities)
  const hasMaritalBoundaryApproximation = selection.target.maritalStatuses.length > 0 &&
    (selection.target.age.min < 20 || selection.target.age.max > 49)
  const demographicEvidenceGrade: EvidenceGrade = !isNationwideSelection(selection) || hasMaritalBoundaryApproximation
    ? 'C'
    : selection.target.maritalStatuses.length > 0 ? 'B' : 'A'
  const groups: GroupResult[] = [{
    id: 'demographic', label: '基础人口范围', classification: 'hard_filter',
    dimensions: ['base.age', 'base.region', 'base.gender', ...(selection.target.maritalStatuses.length > 0 ? ['base.marital'] : [])],
    factor: 1, before: base, after: base, method: '逐单岁人口 × 性别 × 五岁组婚史率并集 × 地域缩放',
    evidenceGrade: demographicEvidenceGrade,
    note: selection.target.maritalStatuses.length === 0
      ? '未选择婚史表示不限，不会回退未婚。'
      : hasMaritalBoundaryApproximation
        ? '婚史使用官方五岁组直接率；18–19 岁借用 15–19 岁组、50 岁借用 50–54 岁组，因边界不完全一致降为 C。'
        : '婚史互斥类别按官方五岁组直接率取并集。',
  }]
  const activeDimensions: string[] = []
  const heightActive = selection.target.heightCm != null &&
    (selection.target.heightCm.min != null || selection.target.heightCm.max != null)
  const lifestyleDimensions = [...new Set(
    strata.flatMap((stratum) => lifestyleProbabilitiesAtAge(selection, stratum.age).map((item) => item.dimensionId)),
  )]

  let baseline = 0
  let conservative = 0
  let optimistic = 0
  let afterHeight = 0
  for (const stratum of strata) {
    const maritalProbability = maritalShareScenarioAtAge(selection, stratum.age)
    const heightProbability = heightProbabilityAtAge(selection, stratum.age) ?? {
      conservative: 1,
      baseline: 1,
      optimistic: 1,
    }
    const lifestyleProbabilities = lifestyleProbabilitiesAtAge(selection, stratum.age).map((item) => item.probability)
    const allActiveProbabilities = [
      ...(maritalActive ? [maritalProbability] : []),
      ...(heightActive ? [heightProbability] : []),
      ...lifestyleProbabilities,
    ]
    const combinedBounds = intersectionBounds(allActiveProbabilities)
    const heightPeople = stratum.residents.baseline * maritalProbability.baseline * heightProbability.baseline
    afterHeight += heightPeople
    baseline += stratum.residents.baseline * combinedBounds.baseline
    conservative += stratum.residents.conservative * combinedBounds.conservative
    optimistic += stratum.residents.optimistic * combinedBounds.optimistic
  }

  if (heightActive) {
    const heightFactor = base > 0 ? clampProbability(afterHeight / base) : 0
    activeDimensions.push('appearance.height')
    groups.push({
      id: 'anthropometric', label: '明确身高范围', classification: 'hard_filter', dimensions: ['appearance.height'],
      factor: heightFactor, before: base, after: afterHeight, method: '逐岁加权：官方年龄/性别均值 + C级正态离散度区间概率', evidenceGrade: 'C',
      note: '每个单岁人口分别计算上下限的同一分布区间，再求和；不使用年龄中点。',
    })
  }

  if (lifestyleDimensions.length > 0) {
    const before = heightActive ? afterHeight : base
    const factor = before > 0 ? clampProbability(baseline / before) : 0
    activeDimensions.push(...lifestyleDimensions)
    groups.push({
      id: 'health_body', label: '生活方式相关组', classification: 'correlated_hard', dimensions: lifestyleDimensions,
      factor, before, after: baseline, method: '逐岁边际；多条件基准为条件独立情景，范围使用 Fréchet 联合概率界', evidenceGrade: 'C',
      note: lifestyleDimensions.length > 1
        ? '公开数据没有年龄×性别×烟酒联合微观表；基准值是透明情景，不宣称独立性为事实。'
        : '单一生活方式条件按公开年龄/性别边际逐岁加权。',
    })
  }

  return {
    base,
    scopeCeiling,
    estimate: Math.max(0, Number.isFinite(baseline) ? baseline : 0),
    groups,
    activeDimensions,
    confidenceReasons: [
      '人口按 2020 普查单岁表加总；婚史使用官方性别×五岁组率并在组内保持常数，2025 总量只做宏观校准。',
      ...(selection.target.maritalStatuses.length > 0 && !hasMaritalBoundaryApproximation
        ? ['婚史是官方五岁组率的透明组内应用，运行等级为 B，并加入 8% 组粒度敏感性。']
        : []),
      ...(hasMaritalBoundaryApproximation ? ['18–19/50 岁婚史分别借用 15–19/50–54 岁组，已降级并扩大范围。'] : []),
      ...(isNationwideSelection(selection) ? [] : ['已登记城市使用官方常住人口锚点，并套用 2020 全国年龄/性别份额；城市人口结构差异未直接观测，按 C 级宽情景处理。']),
      ...(lifestyleDimensions.length > 1 ? ['烟酒联合缺少同分母微观表；基准采用独立情景，范围采用不依赖相关假设的 Fréchet 界。'] : []),
    ],
    availability: 'available',
    unsupportedCities: [],
    structuralRange: {
      conservative: Math.min(baseline, conservative),
      baseline,
      optimistic: Math.max(baseline, optimistic),
    },
  }
}

function cloneSelection(selection: ModelSelection): ModelSelection {
  return {
    target: {
      ...selection.target,
      age: { ...selection.target.age },
      cities: [...selection.target.cities],
      maritalStatuses: [...selection.target.maritalStatuses],
      heightCm: selection.target.heightCm == null ? null : { ...selection.target.heightCm },
    },
    correlated: {
      ...selection.correlated,
      bodyTypes: [...selection.correlated.bodyTypes],
      educationLevels: [...selection.correlated.educationLevels],
      housing: { ...selection.correlated.housing },
      vehicle: { ...selection.correlated.vehicle, priceBands: [...selection.correlated.vehicle.priceBands] },
      healthCriteria: [...selection.correlated.healthCriteria],
      hairCriteria: [...selection.correlated.hairCriteria],
    },
    softPreferenceIds: [...selection.softPreferenceIds],
    entertainment: { zodiacs: [...selection.entertainment.zodiacs], mbti: [...selection.entertainment.mbti] },
    selfPreferenceIds: [...selection.selfPreferenceIds],
  }
}

function removeDimension(selection: ModelSelection, dimensionId: string): ModelSelection {
  const relaxed = cloneSelection(selection)
  switch (dimensionId) {
    case 'base.age': relaxed.target.age = { min: MIN_MODEL_AGE, max: MAX_MODEL_AGE }; break
    case 'base.region': relaxed.target.cities = ['全国']; break
    case 'base.marital': relaxed.target.maritalStatuses = []; break
    case 'appearance.height': relaxed.target.heightCm = null; break
    case 'appearance.body_type': relaxed.correlated.bodyTypes = []; break
    case 'education.level': relaxed.correlated.educationLevels = []; break
    case 'economy.income': relaxed.correlated.minAnnualIncomeWan = null; break
    case 'economy.wealth': relaxed.correlated.minHouseholdWealthWan = null; break
    case 'economy.house': relaxed.correlated.housing = { required: false, location: null, minAreaSqm: null, type: null }; break
    case 'economy.vehicle': relaxed.correlated.vehicle = { required: false, priceBands: [] }; break
    case 'lifestyle.smoking': relaxed.correlated.smoking = 'any'; break
    case 'lifestyle.drinking': relaxed.correlated.drinking = 'any'; break
    case 'health.chronic': relaxed.correlated.healthCriteria = relaxed.correlated.healthCriteria.filter((item) => item !== 'no_major_chronic'); break
    case 'appearance.hair_full': relaxed.correlated.hairCriteria = []; break
  }
  return relaxed
}

function impactCandidates(selection: ModelSelection, raw: RawPopulationResult): string[] {
  const candidates = [...raw.activeDimensions]
  if (selection.target.age.min !== MIN_MODEL_AGE || selection.target.age.max !== MAX_MODEL_AGE) candidates.push('base.age')
  if (!isNationwideSelection(selection)) candidates.push('base.region')
  if (selection.target.maritalStatuses.length > 0) candidates.push('base.marital')
  return [...new Set(candidates)]
}

function groupForDimension(dimensionId: string): string {
  if (dimensionId.startsWith('base.')) return 'demographic'
  if (dimensionId === 'appearance.height') return 'anthropometric'
  if (['appearance.body_type', 'lifestyle.smoking', 'lifestyle.drinking', 'health.chronic', 'health.myopia', 'appearance.hair_full'].includes(dimensionId)) return 'health_body'
  return 'socioeconomic'
}

function buildImpacts(selection: ModelSelection, raw: RawPopulationResult): ConditionImpact[] {
  return impactCandidates(selection, raw).map((dimensionId) => {
    const relaxedEstimate = Math.max(raw.estimate, calculatePopulation(removeDimension(selection, dimensionId)).estimate)
    const registry = DIMENSION_BY_ID.get(dimensionId)
    return {
      dimensionId,
      label: registry?.label ?? dimensionId,
      classification: registry?.classification ?? 'correlated_hard',
      group: groupForDimension(dimensionId),
      before: relaxedEstimate,
      after: raw.estimate,
      retention: relaxedEstimate > 0 ? clampProbability(raw.estimate / relaxedEstimate) : 1,
      marginalLoss: Math.max(0, relaxedEstimate - raw.estimate),
      evidenceGrade: registry?.evidenceGrade ?? 'C',
      note: relaxedEstimate === raw.estimate
        ? '该条件与同组条件重叠，单独移除不会明显改变当前估算。'
        : '边际影响通过保持其他条件不变、仅放宽这一项重新计算。',
    }
  }).sort((left, right) => right.marginalLoss - left.marginalLoss)
}

function buildRelaxations(impacts: readonly ConditionImpact[]): RelaxationSuggestion[] {
  // Neighbor scenarios are shown only for non-sensitive boundaries. Sensitive
  // boundaries remain user-controlled and are never proactively suggested for
  // relaxation by the engine.
  return impacts.filter((impact) =>
    impact.marginalLoss > 0 && !DIMENSION_BY_ID.get(impact.dimensionId)?.sensitive,
  ).slice(0, 5).map((impact) => ({
    dimensionId: impact.dimensionId,
    label: `放宽${impact.label}`,
    currentEstimate: impact.after,
    relaxedEstimate: impact.before,
    gain: impact.marginalLoss,
    gainRatio: impact.after > 0 ? impact.before / impact.after : Number.POSITIVE_INFINITY,
    action: `remove:${impact.dimensionId}`,
    note: `模型重算后约增加 ${formatCount(impact.marginalLoss)}；这是边际敏感度，不是对现实个体的承诺。`,
  }))
}

function softScores(selection: ModelSelection): ModelResult['scores'] & ModelResult['scoreDetails'] {
  const target = new Set<SoftPreferenceId>(selection.softPreferenceIds)
  // Structured legacy-compatible fields whose registry classification is soft
  // must participate in match scoring even though they never enter population.
  if (selection.correlated.schoolTier != null) target.add('education.school')
  if (selection.correlated.healthCriteria.includes('no_myopia')) target.add('health.myopia')
  if (selection.correlated.healthCriteria.includes('no_major_chronic')) target.add('health.chronic')
  const self = new Set<SoftPreferenceId>(selection.selfPreferenceIds)
  const overlap = [...target].filter((item) => self.has(item)).length
  const union = new Set([...target, ...self]).size
  const reciprocalProvided = self.size > 0
  // Without reciprocal answers the honest output is neutral, not invented fit.
  const softMatch = reciprocalProvided ? Math.round((union === 0 ? 1 : overlap / union) * 100) : 50
  const bidirectionalIllustration = reciprocalProvided
    ? Math.round((Math.max(target.size, self.size) === 0 ? 1 : overlap / Math.max(target.size, self.size)) * 100)
    : 50
  const entertainmentSelections = selection.entertainment.zodiacs.length + selection.entertainment.mbti.length
  let hash = 0
  const entertainmentKey = [...selection.entertainment.zodiacs, ...selection.entertainment.mbti].sort().join('|')
  for (let index = 0; index < entertainmentKey.length; index += 1) hash = (hash * 31 + entertainmentKey.charCodeAt(index)) >>> 0
  const entertainment = entertainmentSelections === 0 ? 0 : 55 + (hash % 41)
  return {
    softMatch,
    entertainment,
    bidirectionalIllustration,
    selectedSoftPreferences: target.size,
    reciprocalPreferencesProvided: reciprocalProvided,
    overlappingPreferences: overlap,
    entertainmentSelections,
    disclaimer: reciprocalProvided
      ? '双向条件命中示意只比较双方填写的偏好交集，不预测具体感情结果。'
      : '尚未填写反向偏好，契合度以 50 分中性占位，不作为人口概率。',
  }
}

function confidence(raw: RawPopulationResult): ModelResult['confidence'] {
  if (raw.availability === 'unavailable') {
    return { grade: 'NA', score: 0, reasons: [...raw.confidenceReasons] }
  }
  let score = 0.9
  if (raw.groups.some((group) => group.id === 'socioeconomic')) score -= 0.12
  if (raw.groups.some((group) => group.id === 'health_body' && group.dimensions.length > 1)) score -= 0.1
  if (raw.confidenceReasons.some((reason) => reason.includes('城市'))) score -= 0.08
  score = Math.min(0.95, Math.max(0.35, score))
  const scoreGrade: EvidenceGrade = score >= 0.85 ? 'A' : score >= 0.72 ? 'B' : score >= 0.55 ? 'C' : 'D'
  const gradeRank: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1, NA: 0 }
  const weakestActiveGrade = raw.groups.reduce<EvidenceGrade>(
    (weakest, group) => gradeRank[group.evidenceGrade] < gradeRank[weakest] ? group.evidenceGrade : weakest,
    'A',
  )
  const grade = gradeRank[scoreGrade] <= gradeRank[weakestActiveGrade] ? scoreGrade : weakestActiveGrade
  const reasons = [...raw.confidenceReasons]
  if (weakestActiveGrade !== 'A') {
    reasons.push(`最弱启用人口组为 ${weakestActiveGrade} 级，模型可信度不会高于该等级。`)
  }
  return { grade, score: Math.round(score * 100) / 100, reasons }
}

function sensitivityRange(raw: RawPopulationResult): PopulationRange {
  if (raw.availability === 'unavailable') {
    return { conservative: 0, baseline: 0, optimistic: 0 }
  }
  // Every range component was already propagated stratum by stratum from its
  // registered scenario endpoints. Do not widen again by condition count or
  // an unrelated root-sum-square factor.
  return {
    conservative: Math.max(0, Math.min(raw.estimate, raw.structuralRange.conservative)),
    baseline: raw.estimate,
    optimistic: Math.min(raw.scopeCeiling, Math.max(raw.estimate, raw.structuralRange.optimistic)),
  }
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '无法估算'
  if (value < 1) return '期望值低于 1 人'
  if (value < 100) return `约 ${Math.round(value)} 人`
  if (value < 10_000) return `约 ${Math.round(value / 10) * 10} 人`
  if (value < 100_000) return `约 ${(value / 10_000).toFixed(1)} 万人`
  return `约 ${Math.round(value / 10_000)} 万人`
}

export function formatCountShort(value: number): string {
  const formatted = formatCount(value)
  return formatted === '期望值低于 1 人' ? '< 1 人' : formatted.replace(/^约\s*/, '')
}

export function computeModel(input: unknown, options: unknown = {}): ModelResult {
  const parsed = selectionSchema.safeParse(input)
  if (!parsed.success) throw new ModelInputError(parsed.error)
  const parsedOptions = modelComputationOptionsSchema.safeParse(options)
  if (!parsedOptions.success) throw new ModelOptionsError(parsedOptions.error)
  const selection = parsed.data
  const raw = calculatePopulation(selection)
  const range = sensitivityRange(raw)
  const isUnavailable = raw.availability === 'unavailable'
  const resolutionFloor = isUnavailable ? 0 : Math.max(1, raw.base / 1_000_000)
  const resolutionExceeded = !isUnavailable && raw.estimate < resolutionFloor
  const impacts = isUnavailable ? [] : buildImpacts(selection, raw)
  const scores = softScores(selection)
  const unquantifiedHardConditions = selectedUnquantifiedHardConditions(
    selection,
    parsedOptions.data.hardRequirementIds ?? [],
  )
  const isUpperBound = !isUnavailable && unquantifiedHardConditions.length > 0
  const includedHardConditions = isUnavailable
    ? []
    : [...new Set(raw.groups.flatMap((group) => group.dimensions))]
  const zeroMeaning: ModelResult['population']['zeroMeaning'] = isUnavailable
    ? 'unavailable'
    : raw.estimate === 0
      ? 'model_underflow'
      : resolutionExceeded
        ? 'positive_below_resolution'
        : 'not_zero'
  return {
    versions: { modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION },
    input: selection,
    population: {
      base: raw.base,
      scopeCeiling: raw.scopeCeiling,
      estimate: raw.estimate,
      range,
      status: isUnavailable ? 'unavailable' : isUpperBound ? 'upper_bound' : 'estimated',
      interpretation: isUnavailable ? 'not_available' : isUpperBound ? 'quantified_conditions_only' : 'all_selected_hard_conditions',
      numericStatus: isUnavailable ? 'unavailable' : 'available',
      zeroMeaning,
      resolutionFloor,
      resolutionExceeded,
      display: isUnavailable
        ? `当前无法可靠估算：${raw.unsupportedCities.join('、')}尚无本数据版本已登记的一手常住人口锚点；这不表示当地无人。`
        : isUpperBound
        ? `${formatCount(raw.estimate)}（仅满足已计入条件的人数上限；${unquantifiedHardConditions.length} 项硬条件因证据不足未计入）`
        : raw.estimate === 0
        ? '模型数值已下溢到 0，低于当前数据分辨能力；不能解释为现实中恰好 0 人。'
        : resolutionExceeded
        ? `${formatCount(raw.estimate)}，已低于当前数据 ${formatCount(resolutionFloor)} 的可靠分辨能力；不代表现实中绝对不存在。`
        : formatCount(raw.estimate),
      displayShort: isUnavailable
        ? '无法可靠估算'
        : isUpperBound
        ? `≤ ${formatCountShort(raw.estimate)}`
        : resolutionExceeded ? '低于模型分辨率' : formatCountShort(raw.estimate),
    },
    coverage: {
      includedHardConditions,
      unquantifiedHardConditions,
      unsupportedCities: raw.unsupportedCities,
    },
    scores: {
      softMatch: scores.softMatch,
      entertainment: scores.entertainment,
      bidirectionalIllustration: scores.bidirectionalIllustration,
    },
    scoreDetails: {
      selectedSoftPreferences: scores.selectedSoftPreferences,
      reciprocalPreferencesProvided: scores.reciprocalPreferencesProvided,
      overlappingPreferences: scores.overlappingPreferences,
      entertainmentSelections: scores.entertainmentSelections,
      disclaimer: scores.disclaimer,
    },
    confidence: confidence(raw),
    impacts,
    relaxations: isUnavailable ? [] : buildRelaxations(impacts),
    groups: raw.groups,
    explanation: [
      isUnavailable
        ? '所选城市缺少已登记的一手常住人口锚点，本版本不会用历史约数或 0 冒充估算。'
        : isUpperBound
        ? `主人数只计算有可复核人口参数的条件；${unquantifiedHardConditions.map((item) => item.label).join('、')}保留为硬边界但未用猜测比例扣减，因此该数是上限。`
        : '主人数只计算有可复核人口参数的硬条件。',
      '软偏好和娱乐条件不会减少满足硬条件的估算人数。',
      '乐观/基准/保守是敏感度范围：烟酒联合采用 Fréchet 界，城市结构、身高分布、婚史组粒度再按已登记宽情景传播；不是抽样置信区间。',
      ...(resolutionExceeded ? ['当前结果低于模型分辨率，只能解释为期望值极小，不能解释为现实中不存在。'] : []),
    ],
  }
}

export function tryComputeModel(input: unknown, options: unknown = {}):
  | { success: true; data: ModelResult }
  | { success: false; error: ModelInputError | ModelOptionsError | ModelRequirementError } {
  try {
    return { success: true, data: computeModel(input, options) }
  } catch (error) {
    if (
      error instanceof ModelInputError ||
      error instanceof ModelOptionsError ||
      error instanceof ModelRequirementError
    ) return { success: false, error }
    throw error
  }
}

/** Parse a value without calculating, useful for form validation. */
export const validateModelSelection = parseSelection
