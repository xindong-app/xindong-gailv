import { z } from 'zod'
import {
  CAR_RATE,
  EDU,
  EDU_INCOME_PREMIUM,
  ECON_RHO,
  HOUSE_LOCAL_RATE,
  INCOME_MEDIAN_WAN,
  INCOME_SIGMA,
  WEALTH_MEDIAN_WAN,
  WEALTH_SIGMA,
  bmiDist,
  drinkingRate,
  eduAgeFactor,
  fullHairRate,
  heightDist,
  incomeAgeFactor,
  nonSmokerRate,
  wealthAgeFactor,
} from '../data/model'
import {
  MAX_MODEL_AGE,
  MIN_MODEL_AGE,
  cityPopulationScale,
  cityWageScale,
  maleShareAtAge,
  maritalShareAtAge,
  populationWanAtAge,
} from '../data/population'
import { DIMENSION_BY_ID, type DimensionClass, type EvidenceGrade } from '../model/dimensions'
import { DATA_VERSION, MODEL_VERSION } from '../model/versions'
import {
  parseSelection,
  selectionSchema,
  type EducationId,
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
    estimate: number
    range: PopulationRange
    resolutionFloor: number
    resolutionExceeded: boolean
    display: string
    displayShort: string
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
  estimate: number
  groups: GroupResult[]
  activeDimensions: string[]
  uncertaintyContributions: number[]
  confidenceReasons: string[]
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const density = 0.3989423 * Math.exp((-z * z) / 2)
  const probability = density * t * (
    0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))
  )
  return clampProbability(z > 0 ? 1 - probability : probability)
}

function normalInverse(probability: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239]
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572]
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416]
  const lower = 0.02425
  const p = Math.min(1 - 1e-12, Math.max(1e-12, probability))
  if (p < lower) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - lower) return -normalInverse(1 - p)
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

/** P(Z1 > z1, Z2 > z2) for a Gaussian copula, by deterministic quadrature. */
function gaussianCopulaJointTail(p1: number, p2: number, rho: number): number {
  if (p1 >= 1) return p2
  if (p2 >= 1) return p1
  if (p1 <= 0 || p2 <= 0) return 0
  const z1 = normalInverse(1 - p1)
  const z2 = normalInverse(1 - p2)
  const segments = 120
  const from = z1
  const to = z1 + 8
  const width = (to - from) / segments
  let sum = 0
  for (let index = 0; index <= segments; index += 1) {
    const z = from + index * width
    const density = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI)
    const conditional = 1 - normalCdf((z2 - rho * z) / Math.sqrt(1 - rho * rho))
    sum += (index === 0 || index === segments ? 0.5 : 1) * density * conditional
  }
  return clampProbability(Math.min(p1, p2, sum * width))
}

function probabilityInNormalRange(minimum: number, maximum: number, mean: number, standardDeviation: number): number {
  return clampProbability(
    normalCdf((maximum - mean) / standardDeviation) - normalCdf((minimum - mean) / standardDeviation),
  )
}

function basePopulation(selection: ModelSelection): number {
  const scale = cityPopulationScale(selection.target.cities)
  let people = 0
  for (let age = selection.target.age.min; age <= selection.target.age.max; age += 1) {
    const totalAtAge = populationWanAtAge(age) * 10_000
    const genderShare = selection.target.gender === 'male' ? maleShareAtAge(age) : 1 - maleShareAtAge(age)
    const maritalShare = maritalShareAtAge(age, selection.target.gender, selection.target.maritalStatuses)
    people += totalAtAge * scale * genderShare * maritalShare
  }
  return Math.max(0, people)
}

function heightFactor(selection: ModelSelection): number {
  const range = selection.target.heightCm
  if (range == null || (range.min == null && range.max == null)) return 1
  const minimum = range.min ?? 130
  const maximum = range.max ?? 220
  let denominator = 0
  let numerator = 0
  for (let age = selection.target.age.min; age <= selection.target.age.max; age += 1) {
    const totalAtAge = populationWanAtAge(age)
    const genderShare = selection.target.gender === 'male' ? maleShareAtAge(age) : 1 - maleShareAtAge(age)
    const maritalShare = maritalShareAtAge(age, selection.target.gender, selection.target.maritalStatuses)
    const weight = totalAtAge * genderShare * maritalShare
    const distribution = heightDist(age, selection.target.gender)
    denominator += weight
    numerator += weight * probabilityInNormalRange(minimum, maximum, distribution.mean, distribution.sd)
  }
  return denominator > 0 ? clampProbability(numerator / denominator) : 0
}

function demographicWeightedProbability(
  selection: ModelSelection,
  probabilityAtAge: (age: number) => number,
): number {
  let denominator = 0
  let numerator = 0
  for (let age = selection.target.age.min; age <= selection.target.age.max; age += 1) {
    const totalAtAge = populationWanAtAge(age)
    const genderShare = selection.target.gender === 'male' ? maleShareAtAge(age) : 1 - maleShareAtAge(age)
    const maritalShare = maritalShareAtAge(age, selection.target.gender, selection.target.maritalStatuses)
    const weight = totalAtAge * genderShare * maritalShare
    denominator += weight
    numerator += weight * probabilityAtAge(age)
  }
  return denominator > 0 ? clampProbability(numerator / denominator) : 0
}

const BODY_RANGES: Record<ModelSelection['correlated']['bodyTypes'][number], readonly [number, number]> = {
  underweight: [0, 17], slim: [17, 18.5], balanced: [18.5, 21.5], standard: [21.5, 24],
  soft: [24, 26], full: [26, 28], round: [28, 99],
}

function bodyTypeProbability(selection: ModelSelection, age: number): number | null {
  if (selection.correlated.bodyTypes.length === 0) return null
  const { mean, sd } = bmiDist(age, selection.target.gender)
  const probability = selection.correlated.bodyTypes.reduce((sum, bodyType) => {
    const [minimum, maximum] = BODY_RANGES[bodyType]
    return sum + probabilityInNormalRange(minimum, maximum, mean, sd)
  }, 0)
  return clampProbability(probability)
}

const EDUCATION_BANDS: Record<EducationId, (age: number) => number> = {
  junior_college: (age) => Math.max(0, EDU.juniorPlus * eduAgeFactor(age) - EDU.bachelorPlus * eduAgeFactor(age)),
  bachelor: (age) => Math.max(0, EDU.bachelorPlus * eduAgeFactor(age) - EDU.masterPlus * eduAgeFactor(age)),
  master: (age) => Math.max(0, EDU.masterPlus * eduAgeFactor(age) - EDU.phd * eduAgeFactor(age)),
  doctorate: (age) => Math.max(0, EDU.phd * eduAgeFactor(age)),
}

function educationProbability(selection: ModelSelection, age: number): number {
  const selectedLevels = selection.correlated.educationLevels
  return clampProbability(selectedLevels.length === 0
    ? 1
    : selectedLevels.reduce((sum, level) => sum + EDUCATION_BANDS[level](age), 0))
}

function educationIncomePremium(selection: ModelSelection): number {
  if (selection.correlated.educationLevels.length === 0) return 1
  const premiumByLevel: Record<EducationId, number> = {
    junior_college: EDU_INCOME_PREMIUM.大专,
    bachelor: EDU_INCOME_PREMIUM.本科,
    master: EDU_INCOME_PREMIUM.硕士,
    doctorate: EDU_INCOME_PREMIUM.博士,
  }
  let totalWeight = 0
  let totalPremium = 0
  for (const level of selection.correlated.educationLevels) {
    const weight = EDUCATION_BANDS[level]((selection.target.age.min + selection.target.age.max) / 2)
    totalWeight += weight
    totalPremium += weight * premiumByLevel[level]
  }
  return totalWeight > 0 ? totalPremium / totalWeight : 1
}

function incomeTail(xWan: number): number {
  if (xWan <= 0) return 1
  return clampProbability(1 - normalCdf(Math.log(xWan / INCOME_MEDIAN_WAN) / INCOME_SIGMA))
}

function wealthTail(xWan: number): number {
  if (xWan <= 0) return 1
  return clampProbability(1 - normalCdf(Math.log(xWan / WEALTH_MEDIAN_WAN) / WEALTH_SIGMA))
}

function socioeconomicFactor(selection: ModelSelection): { factor: number; dimensions: string[]; note: string } {
  const midpoint = (selection.target.age.min + selection.target.age.max) / 2
  const dimensions: string[] = []
  const education = educationProbability(selection, midpoint)
  if (selection.correlated.educationLevels.length > 0) dimensions.push('education.level')

  let income = 1
  if (selection.correlated.minAnnualIncomeWan != null) {
    dimensions.push('economy.income')
    const scale = cityWageScale(selection.target.cities) * incomeAgeFactor(midpoint)
    income = incomeTail(selection.correlated.minAnnualIncomeWan / Math.max(0.1, scale * educationIncomePremium(selection)))
  }

  let wealth = 1
  if (selection.correlated.minHouseholdWealthWan != null) {
    dimensions.push('economy.wealth')
    const cityWealthScale = Math.pow(cityWageScale(selection.target.cities), 1.35)
    wealth = wealthTail(selection.correlated.minHouseholdWealthWan / Math.max(0.1, wealthAgeFactor(midpoint) * cityWealthScale))
  }
  const economy = income < 1 && wealth < 1
    ? gaussianCopulaJointTail(income, wealth, ECON_RHO)
    : Math.min(income, wealth)

  const housing = selection.correlated.housing
  const hasHousingCondition = housing.required || housing.location != null || housing.minAreaSqm != null || housing.type != null
  let house = 1
  if (hasHousingCondition) {
    dimensions.push('economy.house')
    let ownership = HOUSE_LOCAL_RATE
    if (selection.correlated.minHouseholdWealthWan != null) ownership += 0.2
    else if (selection.correlated.minAnnualIncomeWan != null) ownership += 0.1
    ownership = Math.min(0.94, ownership)
    const locationProbability = housing.location == null ? 1 : ({ core: 0.15, urban: 0.5, suburban: 0.9 } as const)[housing.location]
    const areaProbability = housing.minAreaSqm == null
      ? 1
      : housing.minAreaSqm <= 90 ? 0.55 : housing.minAreaSqm <= 120 ? 0.28 : housing.minAreaSqm <= 144 ? 0.12 : housing.minAreaSqm <= 200 ? 0.045 : 0.015
    const typeProbability = housing.type == null || housing.type === 'apartment'
      ? 1
      : ({ large_flat: 0.02, villa: 0.006, courtyard: 0.0002 } as const)[housing.type]
    // Type implies a size class, so it and area are nested rather than multiplied.
    house = ownership * locationProbability * Math.min(areaProbability, typeProbability)
  }

  const vehicle = selection.correlated.vehicle
  let car = 1
  if (vehicle.required || vehicle.priceBands.length > 0) {
    dimensions.push('economy.vehicle')
    const conditionalOwnership = Math.min(0.78, CAR_RATE + (income < 1 || wealth < 1 ? 0.13 : 0))
    const bandShare = vehicle.priceBands.length === 0
      ? 1
      : vehicle.priceBands.reduce((sum, band) => sum + ({
          under_10: 0.35, '10_20': 0.35, '20_50': 0.22, '50_100': 0.06, over_100: 0.02,
        } as const)[band], 0)
    car = conditionalOwnership * clampProbability(bandShare)
  }

  // This multiplication is a documented conditional chain:
  // P(education) × P(income,wealth | education,age,region)
  // × P(house | economy) × P(vehicle | economy), not independent marginals.
  const factor = clampProbability(education * economy * house * car)
  return {
    factor,
    dimensions,
    note: income < 1 && wealth < 1
      ? '学历→收入、收入×资产 Gaussian copula、住房/车辆条件概率链'
      : '学历、经济与资产条件通过条件概率链合并',
  }
}

/**
 * Positive-correlation conjunction. It interpolates on log scale between the
 * independent product and the tightest marginal. Thus it can never exceed any
 * individual condition, but avoids treating overlapping health traits as
 * fully independent repeated deductions.
 */
function correlatedConjunction(probabilities: readonly number[], correlation: number): number {
  if (probabilities.length === 0) return 1
  if (probabilities.length === 1) return clampProbability(probabilities[0])
  const positive = probabilities.map((probability) => Math.max(1e-12, clampProbability(probability)))
  const independent = positive.reduce((product, probability) => product * probability, 1)
  const upperBound = Math.min(...positive)
  return clampProbability(Math.pow(independent, 1 - correlation) * Math.pow(upperBound, correlation))
}

function healthBodyFactor(selection: ModelSelection): { factor: number; dimensions: string[]; note: string } {
  const midpoint = (selection.target.age.min + selection.target.age.max) / 2
  const probabilities: number[] = []
  const dimensions: string[] = []
  const body = bodyTypeProbability(selection, midpoint)
  if (body != null) { probabilities.push(body); dimensions.push('appearance.body_type') }
  if (selection.correlated.smoking === 'non_smoker') {
    probabilities.push(nonSmokerRate(selection.target.gender)); dimensions.push('lifestyle.smoking')
  }
  if (selection.correlated.drinking !== 'any') {
    const level = selection.correlated.drinking === 'not_regular' ? 'notRegular' : 'none'
    probabilities.push(demographicWeightedProbability(
      selection,
      (age) => drinkingRate(selection.target.gender, level, age),
    )); dimensions.push('lifestyle.drinking')
  }
  // `no_major_chronic` is retained in the schema for saved selections, but the
  // registry marks its composite prevalence as excluded. It is scored as a soft
  // preference below and must never enter this population factor.
  if (selection.correlated.hairCriteria.includes('full_hair')) {
    probabilities.push(fullHairRate(midpoint, selection.target.gender)); dimensions.push('appearance.hair_full')
  }
  return {
    factor: correlatedConjunction(probabilities, 0.3),
    dimensions,
    note: probabilities.length > 1
      ? '健康/体型/生活方式使用正相关交集近似（独立乘积与最小边际之间）'
      : '单一健康或生活方式边际概率',
  }
}

function calculatePopulation(selection: ModelSelection): RawPopulationResult {
  const base = basePopulation(selection)
  const hasMaritalBoundaryApproximation = selection.target.maritalStatuses.length > 0 &&
    (selection.target.age.min < 20 || selection.target.age.max > 49)
  const demographicEvidenceGrade: EvidenceGrade = !selection.target.cities.includes('全国') || hasMaritalBoundaryApproximation
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
  let estimate = base

  const height = heightFactor(selection)
  if (selection.target.heightCm != null && (selection.target.heightCm.min != null || selection.target.heightCm.max != null)) {
    const before = estimate
    estimate *= height
    activeDimensions.push('appearance.height')
    groups.push({
      id: 'anthropometric', label: '明确身高范围', classification: 'hard_filter', dimensions: ['appearance.height'],
      factor: height, before, after: estimate, method: '官方年龄/性别均值 + C级正态离散度区间概率', evidenceGrade: 'C',
      note: '上下限按同一分布计算，不重复扣减。',
    })
  }

  const socioeconomic = socioeconomicFactor(selection)
  if (socioeconomic.dimensions.length > 0) {
    const before = estimate
    estimate *= socioeconomic.factor
    activeDimensions.push(...socioeconomic.dimensions)
    groups.push({
      id: 'socioeconomic', label: '社会经济相关组', classification: 'correlated_hard', dimensions: socioeconomic.dimensions,
      factor: socioeconomic.factor, before, after: estimate, method: '条件概率链 + 收入资产 copula + 嵌套关系', evidenceGrade: 'C',
      note: socioeconomic.note,
    })
  }

  const healthBody = healthBodyFactor(selection)
  if (healthBody.dimensions.length > 0) {
    const before = estimate
    estimate *= healthBody.factor
    activeDimensions.push(...healthBody.dimensions)
    groups.push({
      id: 'health_body', label: '健康与生活相关组', classification: 'correlated_hard', dimensions: healthBody.dimensions,
      factor: healthBody.factor, before, after: estimate, method: '相关交集（有界对数插值）', evidenceGrade: 'C',
      note: healthBody.note,
    })
  }

  return {
    base,
    estimate: Math.max(0, Number.isFinite(estimate) ? estimate : 0),
    groups,
    activeDimensions,
    uncertaintyContributions: [
      selection.target.cities.includes('全国') ? 0.12 : 0.2,
      ...(selection.target.maritalStatuses.length > 0 ? [hasMaritalBoundaryApproximation ? 0.16 : 0.08] : []),
      ...(height < 1 ? [0.18] : []),
      ...(socioeconomic.dimensions.length > 0 ? [0.4] : []),
      ...(healthBody.dimensions.length > 0 ? [0.3] : []),
    ],
    confidenceReasons: [
      '人口按 2020 普查单岁表加总；婚史使用官方性别×五岁组率并在组内保持常数，2025 总量只做宏观校准。',
      ...(selection.target.maritalStatuses.length > 0 && !hasMaritalBoundaryApproximation
        ? ['婚史是官方五岁组率的透明组内应用，运行等级为 B，并加入 8% 组粒度敏感性。']
        : []),
      ...(hasMaritalBoundaryApproximation ? ['18–19/50 岁婚史分别借用 15–19/50–54 岁组，已降级并扩大范围。'] : []),
      ...(selection.target.cities.includes('全国') ? [] : ['已登记城市使用 2025 常住人口锚点；其他城市仍是历史口径，且都假设年龄结构与全国相同。']),
      ...(socioeconomic.dimensions.length > 0 ? ['收入、资产、住房与车辆分布包含 C 级模型参数，敏感性范围已扩大。'] : []),
      ...(healthBody.dimensions.length > 1 ? ['健康相关组使用透明相关性修正，相关参数仍需未来微观数据校准。'] : []),
    ],
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
  if (!selection.target.cities.includes('全国')) candidates.push('base.region')
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
  return impacts.filter((impact) => impact.marginalLoss > 0).slice(0, 5).map((impact) => ({
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
  const logUncertainty = Math.sqrt(raw.uncertaintyContributions.reduce(
    (sum, contribution) => sum + Math.log1p(contribution) ** 2,
    0,
  ))
  const factor = Math.exp(logUncertainty)
  return {
    conservative: Math.max(0, raw.estimate / factor),
    baseline: raw.estimate,
    optimistic: Math.min(raw.base, raw.estimate * factor),
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

export function computeModel(input: unknown): ModelResult {
  const parsed = selectionSchema.safeParse(input)
  if (!parsed.success) throw new ModelInputError(parsed.error)
  const selection = parsed.data
  const raw = calculatePopulation(selection)
  const range = sensitivityRange(raw)
  const resolutionFloor = Math.max(1, raw.base / 1_000_000)
  const resolutionExceeded = raw.estimate < resolutionFloor
  const impacts = buildImpacts(selection, raw)
  const scores = softScores(selection)
  return {
    versions: { modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION },
    input: selection,
    population: {
      base: raw.base,
      estimate: raw.estimate,
      range,
      resolutionFloor,
      resolutionExceeded,
      display: resolutionExceeded
        ? `模型期望值为 ${formatCount(raw.estimate)}，已低于当前数据约 ${formatCount(resolutionFloor)} 的可靠分辨能力；不代表现实中绝对不存在。`
        : formatCount(raw.estimate),
      displayShort: resolutionExceeded ? '低于模型分辨率' : formatCountShort(raw.estimate),
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
    relaxations: buildRelaxations(impacts),
    groups: raw.groups,
    explanation: [
      '硬条件用于人口范围；相关硬条件只在所属相关组内通过条件概率或相关交集计算。',
      '软偏好和娱乐条件不会减少满足硬条件的估算人数。',
      '乐观/基准/保守是按启用模型组的预设不确定度传播的敏感度范围，不是经过抽样校准的置信区间。',
      ...(resolutionExceeded ? ['当前结果低于模型分辨率，只能解释为期望值极小，不能解释为现实中不存在。'] : []),
    ],
  }
}

export function tryComputeModel(input: unknown):
  | { success: true; data: ModelResult }
  | { success: false; error: ModelInputError } {
  try {
    return { success: true, data: computeModel(input) }
  } catch (error) {
    if (error instanceof ModelInputError) return { success: false, error }
    throw error
  }
}

/** Parse a value without calculating, useful for form validation. */
export const validateModelSelection = parseSelection
