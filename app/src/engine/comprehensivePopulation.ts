import {
  estimateDimensionRetention,
  probabilityPolicyForDimension,
} from '../data/dimension-probability'
import { educationShareAtAge } from '../data/education'
import {
  DIMENSION_BY_ID,
  type EvidenceGrade,
} from '../model/dimensions'
import { activeConditions } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'
import {
  EVIDENCE_CATALOG_DATA_VERSION,
  EVIDENCE_CATALOG_MODEL_VERSION,
} from '../model/versions'

export interface ComprehensiveRange {
  conservative: number
  baseline: number
  optimistic: number
}

export interface ComprehensiveConditionFactor {
  dimensionId: string
  label: string
  /** Event semantics; see eventStatus before treating it as an identified set. */
  eventDefinition: string
  group: string
  probability: ComprehensiveRange
  /** Leave-one-condition-out retention after the correlation rule is applied. */
  effectiveProbability: number
  evidenceGrade: EvidenceGrade
  evidenceIds: string[]
  basisType: string
  method: string
  note: string
  /** Whether the selected event is concretely represented by the input. */
  eventStatus: 'identified' | 'generic_binary_prior'
}

export interface ComprehensiveCorrelationScenario {
  group: string
  activeDimensionIds: string[]
  referenceStrength: number
  note: string
}

export interface ComprehensiveConditionImpact {
  dimensionId: string
  label: string
  group: string
  before: number
  after: number
  retention: number
  marginalLoss: number
  evidenceGrade: EvidenceGrade
  note: string
}

export interface ComprehensivePopulationResult {
  /** Reliable-layer reference value before the scenario-only conditions. */
  base: number
  scopeCeiling: number
  estimate: number
  range: ComprehensiveRange
  status: 'estimated' | 'unavailable'
  numericStatus: 'available' | 'unavailable'
  zeroMeaning: 'not_zero' | 'positive_below_resolution' | 'model_underflow' | 'logical_zero' | 'unavailable'
  resolutionFloor: number
  resolutionExceeded: boolean
  display: string
  displayShort: string
  activeConditionCount: number
  directConditionCount: number
  modeledConditionCount: number
  identifiedConditionCount: number
  genericPriorConditionIds: string[]
  assumptionCount: number
  interpretation: 'identified_scenario' | 'prior_sensitivity_only'
  correlationScenarios: ComprehensiveCorrelationScenario[]
  evidenceCoverage: Record<EvidenceGrade, number>
  directConditionIds: string[]
  modeledConditionIds: string[]
  factors: ComprehensiveConditionFactor[]
  impacts: ComprehensiveConditionImpact[]
  method: string
  evidenceCatalog: {
    modelVersion: string
    dataVersion: string
  }
}

export interface ComprehensiveAgeStratum {
  age: number
  range: ComprehensiveRange
  /** Optional mutually-exclusive education cell used by conditional models. */
  educationLevels?: ModelSelection['correlated']['educationLevels']
  /** Reliable-layer marginals used to condition same-group scenario factors. */
  directProbabilities?: readonly {
    dimensionId: string
    probability: ComprehensiveRange
  }[]
}

export interface ComprehensivePopulationOptions {
  seekerGender?: 'male' | 'female'
  /** Reliable-layer counts after all direct conditions, one row per age. */
  ageStrata?: readonly ComprehensiveAgeStratum[]
}

interface ReliablePopulationLayer {
  estimate: number
  scopeCeiling: number
  range: ComprehensiveRange
  numericStatus: 'available' | 'unavailable'
  zeroMeaning: 'not_zero' | 'positive_below_resolution' | 'model_underflow' | 'logical_zero' | 'unavailable'
  resolutionFloor: number
}

interface ModeledFactor {
  dimensionId: string
  label: string
  eventDefinition: string
  group: string
  probability: ComprehensiveRange
  evidenceGrade: EvidenceGrade
  evidenceIds: string[]
  basisType: string
  method: string
  note: string
  analystPrior: boolean
  correlationStrength: ComprehensiveRange
  eventStatus: 'identified' | 'generic_binary_prior'
}

interface JointFactors {
  conservative: number
  baseline: number
  optimistic: number
}

const clampProbability = (value: number): number => Math.min(
  1,
  Math.max(0, Number.isFinite(value) ? value : 0),
)

const EMPTY_EVIDENCE_COVERAGE: Record<EvidenceGrade, number> = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  NA: 0,
}

function evidenceGrade(value: unknown): EvidenceGrade {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D' || value === 'NA'
    ? value
    : 'NA'
}

function formatScenarioCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '无法估算'
  if (value < 1) return '期望值低于 1 人'
  if (value < 100) return `约 ${Math.round(value)} 人`
  if (value < 10_000) return `约 ${Math.round(value / 10) * 10} 人`
  if (value < 100_000) return `约 ${(value / 10_000).toFixed(1)} 万人`
  return `约 ${Math.round(value / 10_000)} 万人`
}

function formatScenarioCountShort(value: number): string {
  const formatted = formatScenarioCount(value)
  return formatted === '期望值低于 1 人' ? '< 1 人' : formatted.replace(/^约\s*/, '')
}

function activeRetentionInput(
  selection: ModelSelection,
  dimensionId: string,
  seekerGender?: 'male' | 'female',
  age?: number,
) {
  const input: {
    dimensionId: string
    active: true
    selectedValues?: readonly string[]
    threshold?: number
    contextKey?: string
    facets?: Readonly<Record<string, string | number | boolean | null>>
  } = {
    dimensionId,
    active: true,
    facets: {
      targetGender: selection.target.gender,
      seekerGender: seekerGender ?? null,
      ageMin: age ?? selection.target.age.min,
      ageMax: age ?? selection.target.age.max,
      ageMid: age ?? (selection.target.age.min + selection.target.age.max) / 2,
      cityKey: selection.target.cities.length === 0 ? '全国' : [...selection.target.cities].sort().join('|'),
      maritalStatuses: [...selection.target.maritalStatuses].sort().join('|'),
      educationLevels: [...selection.correlated.educationLevels].sort().join('|'),
    },
  }

  switch (dimensionId) {
    case 'appearance.body_type':
      input.selectedValues = selection.correlated.bodyTypes
      break
    case 'education.school':
      if (selection.correlated.schoolTier != null) {
        input.selectedValues = [selection.correlated.schoolTier]
      }
      break
    case 'economy.income':
      input.threshold = selection.correlated.minAnnualIncomeWan ?? undefined
      break
    case 'economy.wealth':
      input.threshold = selection.correlated.minHouseholdWealthWan ?? undefined
      break
    case 'economy.house': {
      const housing = selection.correlated.housing
      input.facets = {
        ...input.facets,
        // Any nested housing constraint necessarily implies that qualifying
        // people must have access to a qualifying home.
        required: housing.required || housing.location != null || housing.minAreaSqm != null || housing.type != null,
        location: housing.location,
        minAreaSqm: housing.minAreaSqm,
        type: housing.type,
      }
      break
    }
    case 'economy.vehicle':
      input.selectedValues = selection.correlated.vehicle.priceBands
      input.facets = {
        ...input.facets,
        required: selection.correlated.vehicle.required || selection.correlated.vehicle.priceBands.length > 0,
      }
      break
    case 'health.chronic':
      input.selectedValues = ['no_major_chronic']
      break
    case 'health.myopia':
      input.selectedValues = ['no_myopia']
      break
    case 'appearance.hair_full':
      input.selectedValues = selection.correlated.hairCriteria
      break
    case 'entertainment.zodiac':
      input.selectedValues = selection.entertainment.zodiacs
      break
    case 'entertainment.mbti':
      input.selectedValues = selection.entertainment.mbti
      break
    case 'relationship.orientation_compatible':
      // ModelSelection intentionally does not contain the seeker's gender.
      // The data policy therefore returns the explicitly wide unknown-pairing
      // scenario rather than pretending target gender determines orientation.
      if (seekerGender != null) input.contextKey = `${seekerGender}_${selection.target.gender}`
      break
  }

  return input
}

function normalizeRange(range: { lower: number; reference: number; upper: number }): ComprehensiveRange {
  const baseline = clampProbability(range.reference)
  return {
    conservative: Math.min(baseline, clampProbability(range.lower)),
    baseline,
    optimistic: Math.max(baseline, clampProbability(range.upper)),
  }
}

function isNeutralRange(range: ComprehensiveRange): boolean {
  return range.conservative === 1 && range.baseline === 1 && range.optimistic === 1
}

function isNeutralDirectCondition(selection: ModelSelection, dimensionId: string): boolean {
  return dimensionId === 'appearance.height' &&
    selection.target.heightCm?.min == null && selection.target.heightCm?.max == null
}

const SCHOOL_ELIGIBLE_EDUCATION_LEVELS = ['bachelor', 'master', 'doctorate'] as const

function conditionSchoolRangeOnEducation(
  range: ComprehensiveRange,
  selection: ModelSelection,
  age?: number,
  educationCellLevels?: ModelSelection['correlated']['educationLevels'],
): ComprehensiveRange {
  const targetAge = Math.round(age ?? (selection.target.age.min + selection.target.age.max) / 2)
  const higherEducationShare = educationShareAtAge(
    targetAge,
    selection.target.gender,
    [...SCHOOL_ELIGIBLE_EDUCATION_LEVELS],
  )
  if (higherEducationShare <= 0) return { conservative: 0, baseline: 0, optimistic: 0 }
  const bounded = {
    conservative: Math.min(range.conservative, higherEducationShare),
    baseline: Math.min(range.baseline, higherEducationShare),
    optimistic: Math.min(range.optimistic, higherEducationShare),
  }
  const selectedLevels = educationCellLevels ?? selection.correlated.educationLevels
  if (educationCellLevels == null && selectedLevels.length === 0) return bounded
  const hasEligibleLevel = selectedLevels.some((level) =>
    SCHOOL_ELIGIBLE_EDUCATION_LEVELS.includes(level as (typeof SCHOOL_ELIGIBLE_EDUCATION_LEVELS)[number]))
  if (!hasEligibleLevel) return { conservative: 0, baseline: 0, optimistic: 0 }
  return {
    conservative: clampProbability(bounded.conservative / higherEducationShare),
    baseline: clampProbability(bounded.baseline / higherEducationShare),
    optimistic: clampProbability(bounded.optimistic / higherEducationShare),
  }
}

function selectedEventDefinition(
  selection: ModelSelection,
  dimensionId: string,
  summary: string,
): string {
  const dimension = DIMENSION_BY_ID.get(dimensionId)
  const label = dimension?.label ?? dimensionId
  if (selection.softPreferenceIds.includes(dimensionId as ModelSelection['softPreferenceIds'][number]) &&
    !hasIdentifiedStructuredEvent(selection, dimensionId)) {
    return `目标对象符合用户在“${label}”上的自定义要求；输入只记录该要求已启用，不记录具体方向或阈值。`
  }
  if (summary === '软偏好' && dimension?.description) {
    return `${label}：${dimension.description}`
  }
  return `${label}：${summary}`
}

function hasIdentifiedStructuredEvent(selection: ModelSelection, dimensionId: string): boolean {
  switch (dimensionId) {
    case 'education.school': return selection.correlated.schoolTier != null
    case 'health.chronic': return selection.correlated.healthCriteria.includes('no_major_chronic')
    case 'health.myopia': return selection.correlated.healthCriteria.includes('no_myopia')
    default: return false
  }
}

function product(values: readonly number[]): number {
  if (values.some((value) => value <= 0)) return 0
  const logValue = values.reduce((sum, value) => sum + Math.log(clampProbability(value)), 0)
  return clampProbability(Math.exp(logValue))
}

function productOfMultipliers(values: readonly number[]): number {
  if (values.some((value) => value <= 0)) return 0
  const logValue = values.reduce((sum, value) => sum + Math.log(value), 0)
  return Math.exp(Math.min(logValue, Math.log(Number.MAX_VALUE)))
}

/**
 * Symmetric, order-independent clustered intersection.
 *
 * reference = product(p)^(1-rho) * min(p)^rho
 *
 * rho=0 is the transparent independence scenario; rho=1 approaches a fully
 * nested intersection. Every additional p<1 still tightens the reference as
 * long as rho<1. Bounds avoid claiming an observed joint distribution:
 * Fréchet for the lower endpoint and min(marginals) for the upper endpoint.
 */
function jointWithinGroup(factors: readonly ModeledFactor[]): JointFactors {
  if (factors.length === 0) return { conservative: 1, baseline: 1, optimistic: 1 }
  const lower = factors.map((factor) => factor.probability.conservative)
  const reference = factors.map((factor) => factor.probability.baseline)
  const upper = factors.map((factor) => factor.probability.optimistic)
  const rho = clampProbability(
    factors.reduce((sum, factor) => sum + factor.correlationStrength.baseline, 0) / factors.length,
  )
  const independent = product(reference)
  const minimum = Math.min(...reference)
  const baseline = clampProbability(
    Math.pow(independent, 1 - rho) * Math.pow(minimum, rho),
  )
  return {
    conservative: clampProbability(
      lower.reduce((sum, probability) => sum + probability, 0) - (lower.length - 1),
    ),
    baseline,
    optimistic: Math.min(...upper),
  }
}

function conditionalJoint(
  direct: readonly ModeledFactor[],
  modeled: readonly ModeledFactor[],
): JointFactors {
  if (direct.length === 0) return jointWithinGroup(modeled)
  const before = jointWithinGroup(direct)
  const after = jointWithinGroup([...direct, ...modeled])
  const directIndependentReference = product(direct.map((factor) => factor.probability.baseline))
  return {
    // The reliable layer already propagated the direct-only Fréchet/min
    // endpoints, so direct-only endpoint corrections are exactly neutral.
    conservative: modeled.length === 0
      ? 1
      : before.conservative > 0
        ? clampProbability(after.conservative / before.conservative)
        : 1,
    // The reliable reference uses the transparent independent product for
    // direct marginals. Replace that product with the registered group joint,
    // even when there is no weak factor in the group.
    baseline: directIndependentReference > 0
      ? after.baseline / directIndependentReference
      : 1,
    optimistic: modeled.length === 0
      ? 1
      : before.optimistic > 0
        ? clampProbability(after.optimistic / before.optimistic)
        : 1,
  }
}

function combineFactors(
  factors: readonly ModeledFactor[],
  directFactorsAtAge: readonly ModeledFactor[] = [],
): JointFactors {
  const groups = new Map<string, ModeledFactor[]>()
  const directGroups = new Map<string, ModeledFactor[]>()
  for (const factor of factors) {
    const group = groups.get(factor.group) ?? []
    group.push(factor)
    groups.set(factor.group, group)
  }
  for (const factor of directFactorsAtAge) {
    const group = directGroups.get(factor.group) ?? []
    group.push(factor)
    directGroups.set(factor.group, group)
  }
  const groupIds = new Set([...groups.keys(), ...directGroups.keys()])
  const joints = [...groupIds].map((group) => conditionalJoint(
    directGroups.get(group) ?? [],
    groups.get(group) ?? [],
  ))
  return {
    conservative: product(joints.map((joint) => joint.conservative)),
    // A conditional correction may exceed 1: the reliable reference uses an
    // independent product, whereas a positively correlated intersection is
    // larger. It is a multiplier, not a probability, and is capped only after
    // being applied to the reliable population envelope.
    baseline: productOfMultipliers(joints.map((joint) => joint.baseline)),
    optimistic: product(joints.map((joint) => joint.optimistic)),
  }
}

function selectedFactors(
  selection: ModelSelection,
  seekerGender?: 'male' | 'female',
  age?: number,
  educationCellLevels?: ModelSelection['correlated']['educationLevels'],
): {
  activeIds: string[]
  directIds: string[]
  modeled: ModeledFactor[]
} {
  const conditions = [...new Map(activeConditions(selection).map((condition) => [condition.dimensionId, condition])).values()]
  const activeIds: string[] = []
  const directIds: string[] = []
  const modeled: ModeledFactor[] = []

  for (const condition of conditions) {
    const { dimensionId } = condition
    const result = estimateDimensionRetention(activeRetentionInput(selection, dimensionId, seekerGender, age))
    if (result.status === 'delegated_direct') {
      if (isNeutralDirectCondition(selection, dimensionId)) continue
      activeIds.push(dimensionId)
      directIds.push(dimensionId)
      continue
    }
    if (result.status !== 'modeled') {
      throw new Error(`Active dimension has no comprehensive probability policy: ${dimensionId} (${result.reason})`)
    }
    const policy = result.policy
    const registry = DIMENSION_BY_ID.get(dimensionId)
    const rawProbability = normalizeRange(result.range)
    const probability = dimensionId === 'education.school' && selection.correlated.schoolTier != null
      ? conditionSchoolRangeOnEducation(rawProbability, selection, age, educationCellLevels)
      : rawProbability
    // A legal but exhaustive/zero-threshold selection is numerically the same
    // as not selecting the dimension and must not inflate audit counters.
    if (isNeutralRange(probability)) continue
    const usesOrientationFallback = dimensionId === 'relationship.orientation_compatible' && seekerGender == null
    activeIds.push(dimensionId)
    modeled.push({
      dimensionId,
      label: registry?.label ?? dimensionId,
      eventDefinition: selectedEventDefinition(selection, dimensionId, condition.summary),
      group: policy.correlationGroup,
      probability,
      evidenceGrade: usesOrientationFallback ? 'NA' : evidenceGrade(policy.grade),
      evidenceIds: usesOrientationFallback ? [] : [...policy.sourceIds],
      basisType: usesOrientationFallback ? 'max_entropy' : policy.basisType,
      method: policy.method,
      note: usesOrientationFallback
        ? `${policy.limitations.join('；')}；未提供本人统计性别，当前使用覆盖四种配对的最大熵宽回退。`
        : policy.limitations.join('；'),
      analystPrior: usesOrientationFallback || policy.limitations.includes('analyst_prior'),
      correlationStrength: normalizeRange(policy.correlationStrength),
      eventStatus: selection.softPreferenceIds.includes(
        dimensionId as ModelSelection['softPreferenceIds'][number],
      ) && !hasIdentifiedStructuredEvent(selection, dimensionId)
        ? 'generic_binary_prior'
        : 'identified',
    })
  }

  return { activeIds, directIds, modeled }
}

interface AgeFactorEvaluation {
  stratum: ComprehensiveAgeStratum
  direct: ModeledFactor[]
  modeled: ModeledFactor[]
}

function directFactorsAtAge(stratum: ComprehensiveAgeStratum): ModeledFactor[] {
  return (stratum.directProbabilities ?? []).map(({ dimensionId, probability }) => {
    const policy = probabilityPolicyForDimension(dimensionId)
    if (policy == null || policy.method !== 'delegated_direct') {
      throw new Error(`Reliable-layer marginal has no delegated probability policy: ${dimensionId}`)
    }
    return {
      dimensionId,
      label: DIMENSION_BY_ID.get(dimensionId)?.label ?? dimensionId,
      eventDefinition: `${DIMENSION_BY_ID.get(dimensionId)?.label ?? dimensionId}：可靠层逐岁边际`,
      group: policy.correlationGroup,
      probability,
      evidenceGrade: evidenceGrade(policy.grade),
      evidenceIds: [...policy.sourceIds],
      basisType: policy.basisType,
      method: policy.method,
      note: policy.limitations.join('；'),
      analystPrior: policy.limitations.includes('analyst_prior'),
      correlationStrength: normalizeRange(policy.correlationStrength),
      eventStatus: 'identified',
    }
  })
}

function evaluateAgeRows(
  rows: readonly AgeFactorEvaluation[],
  omittedDimensionId?: string,
): ComprehensiveRange {
  return rows.reduce<ComprehensiveRange>((total, row) => {
    const factors = omittedDimensionId == null
      ? row.modeled
      : row.modeled.filter((factor) => factor.dimensionId !== omittedDimensionId)
    const joint = combineFactors(factors, row.direct)
    return {
      conservative: total.conservative + row.stratum.range.conservative * joint.conservative,
      baseline: total.baseline + row.stratum.range.baseline * joint.baseline,
      optimistic: total.optimistic + row.stratum.range.optimistic * joint.optimistic,
    }
  }, { conservative: 0, baseline: 0, optimistic: 0 })
}

function weightedFactorProbability(
  dimensionId: string,
  rows: readonly AgeFactorEvaluation[],
): ComprehensiveRange {
  const weighted = (
    probabilityKey: keyof ComprehensiveRange,
    weightKey: keyof ComprehensiveRange,
  ): number => {
    let numerator = 0
    let denominator = 0
    for (const row of rows) {
      const factor = row.modeled.find((candidate) => candidate.dimensionId === dimensionId)
      if (factor == null) continue
      const weight = row.stratum.range[weightKey]
      numerator += weight * factor.probability[probabilityKey]
      denominator += weight
    }
    if (denominator > 0) return clampProbability(numerator / denominator)
    const values = rows.flatMap((row) => {
      const factor = row.modeled.find((candidate) => candidate.dimensionId === dimensionId)
      return factor == null ? [] : [factor.probability[probabilityKey]]
    })
    return values.length === 0
      ? 1
      : clampProbability(values.reduce((sum, value) => sum + value, 0) / values.length)
  }
  const baseline = weighted('baseline', 'baseline')
  return {
    conservative: Math.min(baseline, weighted('conservative', 'conservative')),
    baseline,
    optimistic: Math.max(baseline, weighted('optimistic', 'optimistic')),
  }
}

function aggregateModeledFactors(
  fallback: readonly ModeledFactor[],
  rows: readonly AgeFactorEvaluation[],
): ModeledFactor[] {
  return fallback.map((factor) => ({
    ...factor,
    probability: rows.length === 0
      ? factor.probability
      : weightedFactorProbability(factor.dimensionId, rows),
  }))
}

function correlationScenarioGroups(
  rows: readonly AgeFactorEvaluation[],
): ComprehensiveCorrelationScenario[] {
  const groups = new Map<string, Map<string, ModeledFactor>>()
  for (const row of rows) {
    for (const factor of [...row.direct, ...row.modeled]) {
      const byDimension = groups.get(factor.group) ?? new Map<string, ModeledFactor>()
      if (!byDimension.has(factor.dimensionId)) byDimension.set(factor.dimensionId, factor)
      groups.set(factor.group, byDimension)
    }
  }
  return [...groups.entries()].flatMap(([group, byDimension]) => {
    const active = [...byDimension.values()]
    if (active.length < 2) return []
    const referenceStrength = active.reduce(
      (sum, factor) => sum + factor.correlationStrength.baseline,
      0,
    ) / active.length
    if (referenceStrength <= 0) return []
    return [{
      group,
      activeDimensionIds: active.map((factor) => factor.dimensionId).sort(),
      referenceStrength,
      note: '相关强度是分析者敏感性情景，不是由联合微观样本拟合出的相关系数。',
    }]
  }).sort((left, right) => left.group.localeCompare(right.group))
}

function buildImpacts(
  after: number,
  factors: readonly ModeledFactor[],
  rows: readonly AgeFactorEvaluation[],
): ComprehensiveConditionImpact[] {
  return factors.map((factor) => {
    const before = evaluateAgeRows(rows, factor.dimensionId).baseline
    const retention = before > 0 ? clampProbability(after / before) : 1
    return {
      dimensionId: factor.dimensionId,
      label: factor.label,
      group: factor.group,
      before,
      after,
      retention,
      marginalLoss: Math.max(0, before - after),
      evidenceGrade: factor.evidenceGrade,
      note: factor.group === factor.dimensionId
        ? '保持其他条件不变，仅移除此条件后重算。'
        : '保持其他条件不变，仅移除此条件后按相关簇联合情景重算。',
    }
  }).sort((left, right) => right.marginalLoss - left.marginalLoss)
}

function directEvidenceGrade(dimensionId: string, selection: ModelSelection): EvidenceGrade {
  if (dimensionId === 'base.region') {
    return selection.target.cities.length === 0 || selection.target.cities.includes('全国') ? 'A' : 'C'
  }
  if (dimensionId === 'base.marital' &&
    (selection.target.age.min < 20 || selection.target.age.max > 49)) {
    return 'C'
  }
  return DIMENSION_BY_ID.get(dimensionId)?.evidenceGrade ?? 'NA'
}

function buildCoverage(
  selection: ModelSelection,
  directIds: readonly string[],
  modeled: readonly ModeledFactor[],
): Record<EvidenceGrade, number> {
  const coverage = { ...EMPTY_EVIDENCE_COVERAGE }
  for (const dimensionId of directIds) {
    coverage[directEvidenceGrade(dimensionId, selection)] += 1
  }
  for (const factor of modeled) coverage[factor.evidenceGrade] += 1
  return coverage
}

export function computeComprehensivePopulation(
  selection: ModelSelection,
  reliable: ReliablePopulationLayer,
  options: ComprehensivePopulationOptions = {},
): ComprehensivePopulationResult {
  const initial = selectedFactors(selection, options.seekerGender)
  const calculationStrata: readonly ComprehensiveAgeStratum[] = reliable.numericStatus === 'unavailable'
    ? []
    : options.ageStrata != null && options.ageStrata.length > 0
      ? options.ageStrata
      : [{
          age: (selection.target.age.min + selection.target.age.max) / 2,
          range: { ...reliable.range },
        }]
  const ageRows: AgeFactorEvaluation[] = calculationStrata.map((stratum) => {
    const stratumSelection = stratum.educationLevels == null
      ? selection
      : {
          ...selection,
          correlated: {
            ...selection.correlated,
            educationLevels: [...stratum.educationLevels],
          },
        }
    return {
      stratum,
      direct: directFactorsAtAge(stratum),
      modeled: selectedFactors(
        stratumSelection,
        options.seekerGender,
        stratum.age,
        stratum.educationLevels,
      ).modeled,
    }
  })
  const { activeIds, directIds } = initial
  const modeled = aggregateModeledFactors(initial.modeled, ageRows)
  const evidenceCoverage = buildCoverage(selection, directIds, modeled)
  const correlationScenarios = correlationScenarioGroups(ageRows)
  const assumptionCount = modeled.filter((factor) =>
    factor.analystPrior ||
    factor.evidenceGrade === 'D' ||
    factor.evidenceGrade === 'NA' ||
    factor.basisType.includes('assumption') ||
    factor.basisType.includes('prior'),
  ).length + correlationScenarios.length
  const interpretation = modeled.some((factor) => factor.eventStatus === 'generic_binary_prior')
    ? 'prior_sensitivity_only' as const
    : 'identified_scenario' as const
  const genericPriorConditionIds = modeled
    .filter((factor) => factor.eventStatus === 'generic_binary_prior')
    .map((factor) => factor.dimensionId)

  if (reliable.numericStatus === 'unavailable') {
    return {
      base: 0,
      scopeCeiling: reliable.scopeCeiling,
      estimate: 0,
      range: { conservative: 0, baseline: 0, optimistic: 0 },
      status: 'unavailable',
      numericStatus: 'unavailable',
      zeroMeaning: 'unavailable',
      resolutionFloor: 0,
      resolutionExceeded: false,
      display: '可靠人口层不可用，因此不能生成全条件综合估算。',
      displayShort: '无法估算',
      activeConditionCount: activeIds.length,
      directConditionCount: directIds.length,
      modeledConditionCount: modeled.length,
      identifiedConditionCount: activeIds.length - genericPriorConditionIds.length,
      genericPriorConditionIds,
      assumptionCount,
      interpretation,
      correlationScenarios,
      evidenceCoverage,
      directConditionIds: directIds,
      modeledConditionIds: modeled.map((factor) => factor.dimensionId),
      factors: [],
      impacts: [],
      method: '可靠人口层不可用时不以占位数继续连乘。',
      evidenceCatalog: {
        modelVersion: EVIDENCE_CATALOG_MODEL_VERSION,
        dataVersion: EVIDENCE_CATALOG_DATA_VERSION,
      },
    }
  }

  const evaluated = evaluateAgeRows(ageRows)
  const estimate = Math.min(
    reliable.scopeCeiling,
    reliable.range.optimistic,
    Math.max(0, evaluated.baseline),
  )
  const conservative = Math.min(
    estimate,
    Math.max(0, evaluated.conservative),
  )
  const optimistic = Math.min(
    reliable.scopeCeiling,
    reliable.range.optimistic,
    Math.max(estimate, evaluated.optimistic),
  )
  const resolutionExceeded = estimate > 0 && estimate < reliable.resolutionFloor
  const hasExplicitScenarioZero = modeled.some((factor) => factor.probability.optimistic === 0)
  const zeroMeaning: ComprehensivePopulationResult['zeroMeaning'] =
    reliable.zeroMeaning === 'logical_zero' || hasExplicitScenarioZero
    ? 'logical_zero'
    : estimate === 0
      ? 'model_underflow'
      : resolutionExceeded
        ? 'positive_below_resolution'
        : 'not_zero'
  const impacts = buildImpacts(estimate, modeled, ageRows)
  const impactById = new Map(impacts.map((impact) => [impact.dimensionId, impact]))
  const factors: ComprehensiveConditionFactor[] = modeled.map((factor) => ({
    dimensionId: factor.dimensionId,
    label: factor.label,
    eventDefinition: factor.eventDefinition,
    group: factor.group,
    probability: factor.probability,
    effectiveProbability: impactById.get(factor.dimensionId)?.retention ?? 1,
    evidenceGrade: factor.evidenceGrade,
    evidenceIds: factor.evidenceIds,
    basisType: factor.basisType,
    method: factor.method,
    note: factor.note,
    eventStatus: factor.eventStatus,
  }))

  return {
    base: reliable.estimate,
    scopeCeiling: reliable.scopeCeiling,
    estimate,
    range: { conservative, baseline: estimate, optimistic },
    status: 'estimated',
    numericStatus: 'available',
    zeroMeaning,
    resolutionFloor: reliable.resolutionFloor,
    resolutionExceeded,
    display: zeroMeaning === 'logical_zero'
      ? '所选条件在当前模型定义下构成逻辑空集（0 人）。'
      : estimate === 0
        ? '全条件模型数值已下溢到 0；这不表示现实中绝对不存在。'
      : resolutionExceeded
        ? `${formatScenarioCount(estimate)}，低于当前模型可靠分辨能力。`
        : `${formatScenarioCount(estimate)}（全条件综合情景）`,
    displayShort: zeroMeaning === 'logical_zero'
      ? '逻辑空集 · 0 人'
      : resolutionExceeded
        ? '低于模型分辨率'
        : formatScenarioCountShort(estimate),
    activeConditionCount: activeIds.length,
    directConditionCount: directIds.length,
    modeledConditionCount: modeled.length,
    identifiedConditionCount: activeIds.length - genericPriorConditionIds.length,
    genericPriorConditionIds,
    assumptionCount,
    interpretation,
    correlationScenarios,
    evidenceCoverage,
    directConditionIds: directIds,
    modeledConditionIds: modeled.map((factor) => factor.dimensionId),
    factors,
    impacts,
    method: interpretation === 'prior_sensitivity_only'
      ? '可靠人口逐岁分层作为起点；具体事件按逐岁条件率计算，未记录方向的通用开关仅作二元兼容先验敏感性模拟；结果不是可识别的精确人群集合。'
      : '可靠人口逐岁分层作为起点；每岁重算条件率，同维度选项先取并集，簇内使用对称相关情景，簇间作透明乘积后再加总。',
    evidenceCatalog: {
      modelVersion: EVIDENCE_CATALOG_MODEL_VERSION,
      dataVersion: EVIDENCE_CATALOG_DATA_VERSION,
    },
  }
}
