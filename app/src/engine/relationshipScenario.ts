import type { z } from 'zod/v4/mini'
import {
  CURRENTLY_SINGLE_SCENARIO,
  ORIENTATION_COMPATIBILITY_SCENARIOS,
  RELATIONSHIP_EVIDENCE_SOURCES,
  RELATIONSHIP_DATA_VERSION,
  RELATIONSHIP_EVIDENCE_RETRIEVED_AT,
  RELATIONSHIP_SCENARIO_VERSION,
  RELATIONSHIP_SOURCE_BY_ID,
  RELATIONSHIP_WILLINGNESS_SCENARIO,
  type RelationshipEvidenceGrade,
  type RelationshipFactorScenario,
} from '../data/relationship'
import {
  relationshipScenarioInputSchema,
  relationshipScenarioRequestSchema,
  type RelationshipCountRange,
  type RelationshipFactorOverride,
  type RelationshipPairing,
  type RelationshipRateRange,
  type RelationshipScenarioInput,
} from '../model/relationshipSchema'
import type { GenderId } from '../model/schema'

export type RelationshipFactorId = 'orientationCompatibility' | 'currentlySingle' | 'relationshipWillingness'
export type RelationshipFactorStatus = 'scenario' | 'not_estimated' | 'unavailable'

export interface RelationshipSourceSummary {
  id: string
  title: string
  publisher: string
  year: number
  url: string | null
  documentPath: string | null
  applicablePopulation: string
  measure: string
  limitations: readonly string[]
  kind: 'study' | 'analyst_scenario'
}

export interface AvailableRelationshipFactor {
  id: RelationshipFactorId
  label: string
  status: 'scenario'
  range: RelationshipRateRange
  evidenceGrade: RelationshipEvidenceGrade
  sourceIds: readonly string[]
  applicablePopulation: string
  basis: string
  limitations: readonly string[]
  isObservedPopulationRate: false
  isConfidenceInterval: false
}

export interface MissingRelationshipFactor {
  id: RelationshipFactorId
  label: string
  status: 'not_estimated' | 'unavailable'
  reason: string
  evidenceGrade: 'NA'
  sourceIds: readonly string[]
  isObservedPopulationRate: false
  isConfidenceInterval: false
}

export type RelationshipFactorResult = AvailableRelationshipFactor | MissingRelationshipFactor

export interface RelationshipScenarioResult {
  versions: {
    relationshipScenarioVersion: string
    relationshipDataVersion: string
    relationshipEvidenceRetrievedAt: string
  }
  pairing: RelationshipPairing
  seekerGender: GenderId
  targetGender: GenderId
  mainLayer: {
    status: 'available' | 'unavailable'
    role: 'statistical_upper_bound'
    range: RelationshipCountRange | null
    modelVersion: string | null
    dataVersion: string | null
    reason: string | null
    note: string
  }
  factors: {
    orientationCompatibility: RelationshipFactorResult
    currentlySingle: RelationshipFactorResult
    relationshipWillingness: RelationshipFactorResult
  }
  confidence: {
    level: 'low'
    evidenceGrade: 'NA'
    note: string
  }
  combined: {
    status: 'scenario' | 'not_estimated' | 'unavailable'
    range: RelationshipCountRange | null
    display: { lower: string; reference: string; upper: string } | null
    blockingFactorIds: readonly RelationshipFactorId[]
    isObservedPopulationEstimate: false
    isConfidenceInterval: false
    zeroMeaning: {
      lower: 'none' | 'explicit_zero_assumption' | 'main_population_zero' | 'main_population_scenario_zero' | 'numeric_underflow'
      reference: 'none' | 'explicit_zero_assumption' | 'main_population_zero' | 'main_population_scenario_zero' | 'numeric_underflow'
      upper: 'none' | 'explicit_zero_assumption' | 'main_population_zero' | 'main_population_scenario_zero' | 'numeric_underflow'
    }
    note: string
  }
  sources: readonly RelationshipSourceSummary[]
  explanation: readonly string[]
}

const FACTOR_LABELS: Readonly<Record<RelationshipFactorId, string>> = {
  orientationCompatibility: '性取向相容',
  currentlySingle: '当前单身',
  relationshipWillingness: '愿意进入关系',
}

function pairingFor(seekerGender: GenderId, targetGender: GenderId): RelationshipPairing {
  return `${seekerGender}_${targetGender}` as RelationshipPairing
}

function defaultFactor(
  id: RelationshipFactorId,
  scenario: RelationshipFactorScenario,
): AvailableRelationshipFactor {
  return {
    id,
    label: FACTOR_LABELS[id],
    status: 'scenario',
    range: { ...scenario.range },
    evidenceGrade: scenario.evidenceGrade,
    sourceIds: [...scenario.sourceIds],
    applicablePopulation: scenario.applicablePopulation,
    basis: scenario.basis,
    limitations: [...scenario.limitations],
    isObservedPopulationRate: false,
    isConfidenceInterval: false,
  }
}

function factorFromOverride(
  id: RelationshipFactorId,
  fallback: RelationshipFactorScenario,
  override: RelationshipFactorOverride | undefined,
): RelationshipFactorResult {
  if (override == null) return defaultFactor(id, fallback)
  if (override.status === 'scenario') {
    return {
      id,
      label: FACTOR_LABELS[id],
      status: 'scenario',
      range: { ...override.range },
      evidenceGrade: 'NA',
      sourceIds: [],
      applicablePopulation: id === 'orientationCompatibility'
        ? '调用方明确提供的目标性别取向相容情境'
        : `调用方明确提供的“${FACTOR_LABELS[id]}”条件比例情境`,
      basis: override.note ?? '调用方提供的敏感性假设；模型未将其验证为人口统计率。',
      limitations: ['调用方参数没有外部证据登记，结果只适合情境重算。'],
      isObservedPopulationRate: false,
      isConfidenceInterval: false,
    }
  }
  return {
    id,
    label: FACTOR_LABELS[id],
    status: override.status,
    reason: override.reason,
    evidenceGrade: 'NA',
    sourceIds: [],
    isObservedPopulationRate: false,
    isConfidenceInterval: false,
  }
}

function factorMap(
  pairing: RelationshipPairing,
  overrides: RelationshipScenarioInput['overrides'],
): RelationshipScenarioResult['factors'] {
  return {
    orientationCompatibility: factorFromOverride(
      'orientationCompatibility',
      ORIENTATION_COMPATIBILITY_SCENARIOS[pairing],
      overrides.orientationCompatibility,
    ),
    currentlySingle: factorFromOverride(
      'currentlySingle',
      CURRENTLY_SINGLE_SCENARIO,
      overrides.currentlySingle,
    ),
    relationshipWillingness: factorFromOverride(
      'relationshipWillingness',
      RELATIONSHIP_WILLINGNESS_SCENARIO,
      overrides.relationshipWillingness,
    ),
  }
}

type BoundProductStatus = 'represented' | 'explicit_zero' | 'numeric_underflow'

interface BoundProduct {
  value: number
  status: BoundProductStatus
}

function multiplyBound(values: readonly number[]): BoundProduct {
  if (values.some((value) => value === 0)) return { value: 0, status: 'explicit_zero' }
  const populationCeiling = values[0]
  if (values.slice(1).every((value) => value === 1)) {
    return { value: populationCeiling, status: 'represented' }
  }

  // Summing logarithms prevents an intermediate multiplication from silently
  // becoming zero. If Math.exp still returns zero, the true product is
  // positive but lies below JavaScript's smallest representable positive number.
  // Every following value is a proportion in [0, 1], so clamp the represented
  // result to the population input to preserve the mathematical upper bound.
  const logProduct = values.reduce((sum, value) => sum + Math.log(value), 0)
  const rawValue = Math.exp(logProduct)
  return rawValue === 0
    ? { value: 0, status: 'numeric_underflow' }
    : { value: Math.min(populationCeiling, rawValue), status: 'represented' }
}

function multiplyFactors(
  population: RelationshipCountRange,
  factors: readonly AvailableRelationshipFactor[],
): {
  range: RelationshipCountRange
  products: { lower: BoundProduct; reference: BoundProduct; upper: BoundProduct }
} {
  const products = {
    lower: multiplyBound([population.lower, ...factors.map((factor) => factor.range.lower)]),
    reference: multiplyBound([population.reference, ...factors.map((factor) => factor.range.reference)]),
    upper: multiplyBound([population.upper, ...factors.map((factor) => factor.range.upper)]),
  }
  return {
    range: {
      lower: products.lower.value,
      reference: products.reference.value,
      upper: products.upper.value,
    },
    products,
  }
}

export type RelationshipZeroCause =
  | 'unspecified'
  | 'main_population'
  | 'main_population_scenario'
  | 'explicit_factor'
  | 'numeric_underflow'

export function formatRelationshipCount(
  value: number,
  zeroCause: RelationshipZeroCause = 'unspecified',
): string {
  if (!Number.isFinite(value) || value < 0) return '无法估算'
  if (value === 0) {
    if (zeroCause === 'numeric_underflow') return '正值低于数值可表示范围（不是 0 人）'
    if (zeroCause === 'main_population') return '0 人（主人口情境为 0）'
    if (zeroCause === 'main_population_scenario') return '0 人（主人口敏感性边界；不代表现实无人）'
    if (zeroCause === 'explicit_factor') return '0 人（由明确的零比例情境产生）'
    return '0 人（情境结果为 0）'
  }
  if (value < 1) return '情境期望值低于 1 人'
  if (value < 100) return `约 ${Math.round(value)} 人`
  if (value < 10_000) return `约 ${Math.round(value / 10) * 10} 人`
  if (value < 100_000) return `约 ${(value / 10_000).toFixed(1)} 万人`
  return `约 ${Math.round(value / 10_000)} 万人`
}

function sourceSummaries(factors: RelationshipScenarioResult['factors']): RelationshipSourceSummary[] {
  const sourceIds = new Set(Object.values(factors).flatMap((factor) => [...factor.sourceIds]))
  return RELATIONSHIP_EVIDENCE_SOURCES
    .filter((source) => sourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      year: source.year,
      url: source.url,
      documentPath: source.documentPath,
      applicablePopulation: source.applicablePopulation,
      measure: source.measure,
      limitations: [...source.limitations],
      kind: source.kind,
    }))
}

function assertRegisteredSources(factors: RelationshipScenarioResult['factors']): void {
  for (const factor of Object.values(factors)) {
    for (const sourceId of factor.sourceIds) {
      if (!RELATIONSHIP_SOURCE_BY_ID.has(sourceId)) {
        throw new Error(`关系情境引用了未登记来源：${sourceId}`)
      }
    }
  }
  for (const source of RELATIONSHIP_EVIDENCE_SOURCES) {
    if (source.kind === 'study' && (source.url == null || !source.url.startsWith('https://'))) {
      throw new Error(`关系研究来源必须使用 HTTPS：${source.id}`)
    }
    if (source.kind === 'analyst_scenario' && (
      source.url != null || source.documentPath == null || source.documentPath.startsWith('/')
    )) {
      throw new Error(`分析者情境必须使用仓库相对 documentPath：${source.id}`)
    }
  }
}

export class RelationshipScenarioInputError extends Error {
  readonly issues: z.core.$ZodIssue[]

  constructor(error: z.core.$ZodError) {
    super('关系情境输入未通过运行时校验')
    this.name = 'RelationshipScenarioInputError'
    this.issues = error.issues
  }
}

export function computeRelationshipScenario(input: unknown): RelationshipScenarioResult {
  const parsed = relationshipScenarioInputSchema.safeParse(input)
  if (!parsed.success) throw new RelationshipScenarioInputError(parsed.error)

  const request = parsed.data
  const pairing = pairingFor(request.seekerGender, request.targetGender)
  const factors = factorMap(pairing, request.overrides)
  assertRegisteredSources(factors)

  const common = {
    versions: {
      relationshipScenarioVersion: RELATIONSHIP_SCENARIO_VERSION,
      relationshipDataVersion: RELATIONSHIP_DATA_VERSION,
      relationshipEvidenceRetrievedAt: RELATIONSHIP_EVIDENCE_RETRIEVED_AT,
    },
    pairing,
    seekerGender: request.seekerGender,
    targetGender: request.targetGender,
    factors,
    sources: sourceSummaries(factors),
    confidence: {
      level: 'low' as const,
      evidenceGrade: 'NA' as const,
      note: '关系层包含“当前单身”和“愿意进入关系”两个没有全国观测锚点的分析者情境；整体证据等级按最弱环节标为 NA，只能用于宽范围敏感性分析。',
    },
  }

  if (request.targetPopulation.status === 'unavailable') {
    return {
      ...common,
      mainLayer: {
        status: 'unavailable',
        role: 'statistical_upper_bound',
        range: null,
        modelVersion: request.targetPopulation.modelVersion ?? null,
        dataVersion: request.targetPopulation.dataVersion ?? null,
        reason: request.targetPopulation.reason,
        note: '主人口层不可用时，不会用关系比例制造一个人数。',
      },
      combined: {
        status: 'unavailable',
        range: null,
        display: null,
        blockingFactorIds: [],
        isObservedPopulationEstimate: false,
        isConfidenceInterval: false,
        zeroMeaning: { lower: 'none', reference: 'none', upper: 'none' },
        note: '缺少可计算的目标性别主人口上限，关系情境不可用。',
      },
      explanation: [
        '主人口层和关系情境层严格分离；关系层不会替代缺失的城市或人口锚点。',
        '“不可用”不是 0 人，也不是期望值低于 1 人。',
      ],
    }
  }

  const mainRange: RelationshipCountRange = {
    lower: request.targetPopulation.range.conservative,
    reference: request.targetPopulation.range.baseline,
    upper: request.targetPopulation.range.optimistic,
  }
  if (request.targetPopulation.estimate === 0 && request.targetPopulation.zeroMeaning !== 'logical_zero') {
    return {
      ...common,
      mainLayer: {
        status: 'available',
        role: 'statistical_upper_bound',
        range: mainRange,
        modelVersion: request.targetPopulation.modelVersion,
        dataVersion: request.targetPopulation.dataVersion,
        reason: null,
        note: '主人口模型返回了数值 0，但关系层无法判断它是逻辑空集还是模型下溢。',
      },
      combined: {
        status: 'unavailable',
        range: null,
        display: null,
        blockingFactorIds: [],
        isObservedPopulationEstimate: false,
        isConfidenceInterval: false,
        zeroMeaning: { lower: 'none', reference: 'none', upper: 'none' },
        note: '缺少可核验的逻辑零原因，关系层不会把主人口数值 0 宣称为现实中 0 人。',
      },
      explanation: [
        '数值下溢、模型分辨率不足与逻辑空集是三种不同状态。',
        '只有调用方明确提供零比例关系情境时，关系层才会显示“由明确的零比例情境产生”。',
      ],
    }
  }
  if (request.targetPopulation.zeroMeaning === 'logical_zero') {
    const zeroDisplay = '0 人（主人口逻辑空集）'
    return {
      ...common,
      mainLayer: {
        status: 'available',
        role: 'statistical_upper_bound',
        range: mainRange,
        modelVersion: request.targetPopulation.modelVersion,
        dataVersion: request.targetPopulation.dataVersion,
        reason: null,
        note: '主人口层已由调用方证明为逻辑空集；关系层不会把它改写成模型下溢或“低于 1 人”。',
      },
      combined: {
        status: 'scenario',
        range: { lower: 0, reference: 0, upper: 0 },
        display: { lower: zeroDisplay, reference: zeroDisplay, upper: zeroDisplay },
        blockingFactorIds: [],
        isObservedPopulationEstimate: false,
        isConfidenceInterval: false,
        zeroMeaning: {
          lower: 'main_population_zero',
          reference: 'main_population_zero',
          upper: 'main_population_zero',
        },
        note: '组合人数为逻辑 0，仅因为主人口层已经证明为空集；不是抽样结果或模型下溢。',
      },
      explanation: [
        '逻辑空集与数值下溢严格区分。',
        '主人口集合为空时，与任何关系条件的交集仍为空；未知关系比例不会改变这一集合事实。',
      ],
    }
  }
  const blockingFactors = Object.values(factors).filter(
    (factor): factor is MissingRelationshipFactor => factor.status !== 'scenario',
  )

  if (blockingFactors.length > 0) {
    const hasUnavailable = blockingFactors.some((factor) => factor.status === 'unavailable')
    return {
      ...common,
      mainLayer: {
        status: 'available',
        role: 'statistical_upper_bound',
        range: mainRange,
        modelVersion: request.targetPopulation.modelVersion,
        dataVersion: request.targetPopulation.dataVersion,
        reason: null,
        note: '这是只满足主人口层可量化条件的目标性别统计上限，不等于可建立关系的人数。',
      },
      combined: {
        status: hasUnavailable ? 'unavailable' : 'not_estimated',
        range: null,
        display: null,
        blockingFactorIds: blockingFactors.map((factor) => factor.id),
        isObservedPopulationEstimate: false,
        isConfidenceInterval: false,
        zeroMeaning: { lower: 'none', reference: 'none', upper: 'none' },
        note: hasUnavailable
          ? '至少一个必要关系层因素不可用，因此不输出组合人数。'
          : '至少一个必要关系层因素未估算，因此不输出伪造的组合人数。',
      },
      explanation: [
        '未估算或不可用的因素不会被偷偷当作 100%、0% 或中性值。',
        '主人口上限仍可单独使用；组合层没有数字不表示现实中没有符合者。',
      ],
    }
  }

  const availableFactors = Object.values(factors) as AvailableRelationshipFactor[]
  const multiplication = multiplyFactors(mainRange, availableFactors)
  const range = multiplication.range
  const zeroMeaningForBound = (
    mainPopulationValue: number,
    factorValues: readonly number[],
    productStatus: BoundProductStatus,
  ): RelationshipScenarioResult['combined']['zeroMeaning']['reference'] => mainPopulationValue === 0
    ? 'main_population_scenario_zero'
    : factorValues.some((factorValue) => factorValue === 0)
      ? 'explicit_zero_assumption'
      : productStatus === 'numeric_underflow'
        ? 'numeric_underflow'
        : 'none'
  const lowerFactorValues = availableFactors.map((factor) => factor.range.lower)
  const referenceFactorValues = availableFactors.map((factor) => factor.range.reference)
  const upperFactorValues = availableFactors.map((factor) => factor.range.upper)
  const zeroMeaning = {
    lower: zeroMeaningForBound(mainRange.lower, lowerFactorValues, multiplication.products.lower.status),
    reference: zeroMeaningForBound(mainRange.reference, referenceFactorValues, multiplication.products.reference.status),
    upper: zeroMeaningForBound(mainRange.upper, upperFactorValues, multiplication.products.upper.status),
  }
  const formatBound = (
    value: number,
    mainPopulationValue: number,
    factorValues: readonly number[],
    productStatus: BoundProductStatus,
  ): string => formatRelationshipCount(
    value,
    mainPopulationValue === 0
      ? 'main_population_scenario'
      : factorValues.some((factorValue) => factorValue === 0)
        ? 'explicit_factor'
        : productStatus === 'numeric_underflow' ? 'numeric_underflow' : 'unspecified',
  )
  return {
    ...common,
    mainLayer: {
      status: 'available',
      role: 'statistical_upper_bound',
      range: mainRange,
      modelVersion: request.targetPopulation.modelVersion,
      dataVersion: request.targetPopulation.dataVersion,
      reason: null,
      note: '这是只满足主人口层可量化条件的目标性别统计上限，不等于可建立关系的人数。',
    },
    combined: {
      status: 'scenario',
      range,
      display: {
        lower: formatBound(
          range.lower,
          mainRange.lower,
          lowerFactorValues,
          multiplication.products.lower.status,
        ),
        reference: formatBound(
          range.reference,
          mainRange.reference,
          referenceFactorValues,
          multiplication.products.reference.status,
        ),
        upper: formatBound(
          range.upper,
          mainRange.upper,
          upperFactorValues,
          multiplication.products.upper.status,
        ),
      },
      blockingFactorIds: [],
      isObservedPopulationEstimate: false,
      isConfidenceInterval: false,
      zeroMeaning,
      note: '结果是宽情境范围：主人口范围 × 取向相容条件比例 × 当前单身条件比例 × 关系意愿条件比例；不是官方人数、预测值或置信区间。',
    },
    explanation: [
      '本人性别与目标性别被明确记录；男男、女女和异性组合使用各自的取向相容情境。',
      '三个比例按条件链定义，因此相乘不是把三个无条件边际率假装独立。',
      '取向、单身和关系意愿分别呈现；任何一层都不会使用软偏好重合分数替代。',
      Object.values(zeroMeaning).some((meaning) => meaning === 'explicit_zero_assumption')
        ? '范围中标为 0 的边界来自调用方明确设定的零比例；其他正数边界仍按其数值显示，不会彼此混淆。'
        : Object.values(zeroMeaning).some((meaning) => meaning === 'numeric_underflow')
          ? '至少一个边界的全部输入均为正，但乘积低于 JavaScript 最小可表示正数；数值字段保留为 0 并显式标记 numeric_underflow，不能解释为现实中 0 人。'
        : '正数但低于 1 时只表示情境期望值低于 1，不代表现实中绝对不存在。',
    ],
  }
}

export interface CompatibleModelResult {
  versions: { modelVersion: string; dataVersion: string }
  input: { target: { gender: GenderId } }
  population: {
    status?: 'estimated' | 'upper_bound' | 'unavailable'
    zeroMeaning?: 'not_zero' | 'positive_below_resolution' | 'model_underflow' | 'logical_zero' | 'unavailable'
    estimate: number
    range: { conservative: number; baseline: number; optimistic: number }
    display?: string
  }
}

export function computeRelationshipScenarioFromModel(
  modelResult: CompatibleModelResult,
  request: unknown,
): RelationshipScenarioResult {
  const parsed = relationshipScenarioRequestSchema.safeParse(request)
  if (!parsed.success) throw new RelationshipScenarioInputError(parsed.error)
  const parsedRequest = parsed.data
  if (modelResult.input.target.gender !== parsedRequest.targetGender) {
    throw new Error(
      `关系情境目标性别 ${parsedRequest.targetGender} 与主人口结果目标性别 ${modelResult.input.target.gender} 不一致`,
    )
  }
  if (modelResult.population.status === 'unavailable') {
    return computeRelationshipScenario({
      ...parsedRequest,
      targetPopulation: {
        status: 'unavailable',
        reason: modelResult.population.display ?? '主人口模型未能提供可靠的人口锚点',
        modelVersion: modelResult.versions.modelVersion,
        dataVersion: modelResult.versions.dataVersion,
      },
    })
  }
  if (modelResult.population.estimate === 0 && modelResult.population.zeroMeaning !== 'logical_zero') {
    return computeRelationshipScenario({
      ...parsedRequest,
      targetPopulation: {
        status: 'unavailable',
        reason: modelResult.population.zeroMeaning === 'model_underflow'
          ? '主人口模型数值下溢，不能解释为现实中 0 人'
          : '主人口模型未提供可证明的逻辑零原因',
        modelVersion: modelResult.versions.modelVersion,
        dataVersion: modelResult.versions.dataVersion,
      },
    })
  }
  return computeRelationshipScenario({
    ...parsedRequest,
    targetPopulation: {
      status: 'available',
      estimate: modelResult.population.estimate,
      range: modelResult.population.range,
      zeroMeaning: modelResult.population.zeroMeaning,
      modelVersion: modelResult.versions.modelVersion,
      dataVersion: modelResult.versions.dataVersion,
    },
  })
}
