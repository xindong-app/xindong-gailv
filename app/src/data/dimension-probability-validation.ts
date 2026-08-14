import registryJson from './dimension-probability-registry.json'
import runtimeJson from './dimension-probability-runtime.json'
import evidenceRegistryJson from './evidence-registry.json'
import { RELATIONSHIP_EVIDENCE_SOURCES } from './relationship'
import { DIMENSION_REGISTRY } from '../model/dimensions'
import {
  DATA_VERSION,
  EVIDENCE_CATALOG_DATA_VERSION,
  EVIDENCE_CATALOG_MODEL_VERSION,
  MODEL_VERSION,
} from '../model/versions'
import {
  PROBABILITY_BASIS_TYPES,
  PROBABILITY_GRADES,
  PROBABILITY_METHODS,
  projectDimensionProbabilityRuntime,
  type FullDimensionProbabilityRegistry,
} from '../../scripts/dimension-probability-runtime-projection'

interface ValidationIssue {
  path: string
  message: string
}

export interface DimensionProbabilityValidationResult {
  valid: boolean
  entryCount: number
  directCount: number
  modeledCount: number
  correlationGroupCount: number
  maxEntropyCount: number
  analystPriorCount: number
  issues: readonly ValidationIssue[]
}

const DIRECT_DIMENSIONS = new Set([
  'base.gender',
  'base.age',
  'base.region',
  'base.marital',
  'appearance.height',
  'education.level',
  'lifestyle.smoking',
  'lifestyle.drinking',
])

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function validRange(value: unknown): boolean {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const lower = candidate.lower
  const reference = candidate.reference
  const upper = candidate.upper
  return typeof lower === 'number' && Number.isFinite(lower) && lower >= 0 && lower <= 1 &&
    typeof reference === 'number' && Number.isFinite(reference) && reference >= lower && reference <= 1 &&
    typeof upper === 'number' && Number.isFinite(upper) && upper >= reference && upper <= 1
}

function validNonnegativeRange(value: unknown): boolean {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const candidate = value as Record<string, unknown>
  const lower = candidate.lower
  const reference = candidate.reference
  const upper = candidate.upper
  return typeof lower === 'number' && Number.isFinite(lower) && lower >= 0 &&
    typeof reference === 'number' && Number.isFinite(reference) && reference >= lower &&
    typeof upper === 'number' && Number.isFinite(upper) && upper >= reference
}

function walkRanges(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkRanges(item, `${path}[${index}]`, issues))
    return
  }
  if (value == null || typeof value !== 'object') return
  const candidate = value as Record<string, unknown>
  if ('lower' in candidate || 'reference' in candidate || 'upper' in candidate) {
    if (!validNonnegativeRange(candidate)) issues.push({ path, message: '数值情境必须满足 0 ≤ lower ≤ reference ≤ upper' })
    return
  }
  for (const [key, nested] of Object.entries(candidate)) walkRanges(nested, `${path}.${key}`, issues)
}

function referenceSum(value: unknown): number {
  return Object.values(value as Record<string, { reference: number }>)
    .reduce((sum, scenario) => sum + scenario.reference, 0)
}

function validateMethodModel(
  entry: FullDimensionProbabilityRegistry['entries'][number],
  index: number,
  registry: FullDimensionProbabilityRegistry,
  issues: ValidationIssue[],
): void {
  const path = `entries[${index}].model`
  const model = entry.model as Record<string, unknown>
  walkRanges(model, path, issues)
  if (entry.method === 'fixed') {
    const preset = model.scenarioPreset
    if (typeof preset !== 'string' || !validRange(registry.scenarioPresets[preset])) {
      issues.push({ path, message: 'fixed 方法必须引用有效 scenarioPreset' })
    }
  }
  if (entry.method === 'nested_share') {
    const optionMap = model.optionShares as Record<string, { lower: number; reference: number; upper: number }>
    const options = ['top2', 'c9', '985', '211'].map((id) => optionMap[id])
    if (options.some((option) => !validRange(option))) {
      issues.push({ path, message: '嵌套院校档位必须提供有效概率情境' })
    } else {
      for (let optionIndex = 1; optionIndex < options.length; optionIndex += 1) {
        const previous = options[optionIndex - 1]
        const current = options[optionIndex]
        if (current.lower < previous.lower || current.reference < previous.reference || current.upper < previous.upper) {
          issues.push({ path, message: '嵌套院校比例必须逐档非递减' })
        }
      }
    }
    if (!validRange(model.unspecified)) issues.push({ path, message: '嵌套方法必须提供未指定档位情境' })
  }
  if (entry.method === 'lognormal_survival') {
    const medians = model.medianWan as Record<string, number>
    const sigmas = model.logSigma as Record<string, number>
    if (Object.values(medians).some((value) => !Number.isFinite(value) || value <= 0) ||
      Object.values(sigmas).some((value) => !Number.isFinite(value) || value <= 0)) {
      issues.push({ path, message: '对数正态尺度与sigma必须为正数' })
    }
    if (entry.dimensionId === 'economy.income') {
      if (!entry.limitationCodes.includes('analyst_prior')) {
        issues.push({
          path: `${path}.educationFactors`,
          message: '收入学历尺度是分析者先验，必须显式声明 analyst_prior',
        })
      }
      const educationFactors = model.educationFactors as Record<string, unknown>
      const expectedEducationFactors = ['junior_college', 'bachelor', 'master', 'doctorate', 'other']
      if (educationFactors == null || typeof educationFactors !== 'object' || Array.isArray(educationFactors) ||
        expectedEducationFactors.some((level) =>
          typeof educationFactors[level] !== 'number' ||
          !Number.isFinite(educationFactors[level]) ||
          (educationFactors[level] as number) <= 0)) {
        issues.push({
          path: `${path}.educationFactors`,
          message: '收入模型必须为四个高等学历单元和其余学历母集提供正的条件尺度',
        })
      }
      const employmentRates = model.employmentRates as Array<{
        maxAge: number
        male: unknown
        female: unknown
      }>
      const expectedMaxAges = [19, 24, 29, 34, 39, 44, 49, 50]
      if (!Array.isArray(employmentRates) ||
        employmentRates.length !== expectedMaxAges.length ||
        employmentRates.some((band, bandIndex) =>
          band.maxAge !== expectedMaxAges[bandIndex] ||
          !validRange(band.male) || !validRange(band.female))) {
        issues.push({
          path: `${path}.employmentRates`,
          message: '收入就业门槛必须以有效三点概率覆盖18—50岁八个年龄组且分性别',
        })
      }
    }
  }
  if (entry.method === 'housing_compound') {
    const locationSum = referenceSum(model.locationShares)
    const typeSum = referenceSum(model.typeShares)
    if (Math.abs(locationSum - 1) > 1e-9 || Math.abs(typeSum - 1) > 1e-9) {
      issues.push({ path, message: '住房位置和类型参考份额必须各自守恒为1' })
    }
  }
  if (entry.method === 'vehicle_compound' && Math.abs(referenceSum(model.priceBandShares) - 1) > 1e-9) {
    issues.push({ path, message: '车辆价位参考份额必须守恒为1' })
  }
  if (entry.method === 'zodiac_calendar') {
    const dayTotal = Object.values(model.dayCounts as Record<string, number>).reduce((sum, value) => sum + value, 0)
    if (dayTotal !== model.daysPerYear) issues.push({ path, message: '十二星座日数必须覆盖完整日历年' })
  }
  if (entry.method === 'mbti_axes') {
    const axes = model.axes as string[][]
    if (axes.length !== 4 || new Set(axes.flat()).size !== 8 || axes.some((axis) => axis.length !== 2)) {
      issues.push({ path, message: 'MBTI必须由四个不重复二元轴组成' })
    }
  }
  if (entry.method === 'bmi_category_union') {
    const bands = model.bands as Array<{ id: string; min?: number; max?: number }>
    if (bands.length !== 7 || bands[0].min != null || bands[bands.length - 1].max != null ||
      bands.some((band, bandIndex) => bandIndex > 0 && band.min !== bands[bandIndex - 1].max)) {
      issues.push({ path, message: 'BMI标签必须形成无缝、互斥、穷尽的七段区间' })
    }
  }
  if (entry.method === 'hair_age_sex') {
    const expectedMaxAges = [29, 39, 49, 50]
    const validAgeBands = (value: unknown): boolean => Array.isArray(value) &&
      value.length === expectedMaxAges.length &&
      value.every((band, bandIndex) => {
        if (band == null || typeof band !== 'object' || Array.isArray(band)) return false
        const candidate = band as Record<string, unknown>
        return candidate.maxAge === expectedMaxAges[bandIndex] && validRange(candidate.scenario)
      })
    if (!validAgeBands(model.maleAgeBands) || !validAgeBands(model.femaleAgeBands) || !validRange(model.fallback)) {
      issues.push({
        path,
        message: 'AGA模型必须为男女分别提供18–29、30–39、40–49、50岁边界的有效三点情景及回退范围',
      })
    }
  }
}

export function validateDimensionProbabilityRegistry(buildDate: string): DimensionProbabilityValidationResult {
  const registry = registryJson as FullDimensionProbabilityRegistry & {
    retrievedAt: string
    methodology: {
      basisTypes: Record<string, string>
      limitationDefinitions: Record<string, string>
    }
  }
  const issues: ValidationIssue[] = []
  const issue = (path: string, message: string): void => { issues.push({ path, message }) }
  if (!isIsoDate(buildDate)) issue('buildDate', '构建日期必须是有效ISO日期')
  if (!isIsoDate(registry.retrievedAt) || registry.retrievedAt > buildDate) {
    issue('retrievedAt', '检索日期必须有效且不晚于构建日期')
  }
  if (registry.dataVersion !== DATA_VERSION || registry.modelVersion !== MODEL_VERSION) {
    issue('version', `概率登记版本必须与运行时一致：${DATA_VERSION}/${MODEL_VERSION}`)
  }
  if (registry.evidenceCatalogDataVersion !== evidenceRegistryJson.dataVersion ||
    registry.evidenceCatalogModelVersion !== evidenceRegistryJson.modelVersion) {
    issue('evidenceCatalogVersion', '概率登记必须显式绑定当前证据目录版本')
  }
  if (registry.evidenceCatalogDataVersion !== EVIDENCE_CATALOG_DATA_VERSION ||
    registry.evidenceCatalogModelVersion !== EVIDENCE_CATALOG_MODEL_VERSION) {
    issue('evidenceCatalogVersion', '概率登记证据目录版本必须与运行时常量一致')
  }
  const declaredBasisTypes = Object.keys(registry.methodology.basisTypes).sort()
  const runtimeBasisTypes = [...PROBABILITY_BASIS_TYPES].sort()
  if (JSON.stringify(declaredBasisTypes) !== JSON.stringify(runtimeBasisTypes)) {
    issue('methodology.basisTypes', '方法说明必须逐一覆盖所有运行时依据类型')
  }

  const dimensionIds = new Set(DIMENSION_REGISTRY.map((dimension) => dimension.id))
  const entryIds = new Set<string>()
  const groupIds = new Set<string>()
  for (const [index, group] of registry.correlationGroups.entries()) {
    if (groupIds.has(group.id)) issue(`correlationGroups[${index}].id`, `重复相关组：${group.id}`)
    groupIds.add(group.id)
    if (!validRange(group.correlationStrength)) issue(`correlationGroups[${index}].correlationStrength`, '相关强度情境无效')
  }

  const knownSources = new Set([
    ...evidenceRegistryJson.entries.map((entry) => entry.id),
    ...RELATIONSHIP_EVIDENCE_SOURCES.map((source) => source.id),
  ])
  const evidenceSources = new Map(evidenceRegistryJson.entries.map((entry) => [entry.id, entry]))
  const relationshipSources = new Map<string, (typeof RELATIONSHIP_EVIDENCE_SOURCES)[number]>(
    RELATIONSHIP_EVIDENCE_SOURCES.map((source) => [source.id, source]),
  )
  const supportsQuantitativeProxy = (sourceId: string): boolean => {
    const evidence = evidenceSources.get(sourceId)
    if (evidence != null) {
      return evidence.modelUse !== 'excluded' &&
        (evidence.directValue != null || evidence.estimate?.baseline != null)
    }
    return relationshipSources.get(sourceId)?.kind === 'study'
  }
  const limitationCodes = new Set(Object.keys(registry.methodology.limitationDefinitions))
  let directCount = 0
  let maxEntropyCount = 0
  let analystPriorCount = 0
  registry.entries.forEach((entry, index) => {
    const path = `entries[${index}]`
    if (entryIds.has(entry.dimensionId)) issue(`${path}.dimensionId`, `重复维度：${entry.dimensionId}`)
    entryIds.add(entry.dimensionId)
    if (!dimensionIds.has(entry.dimensionId)) issue(`${path}.dimensionId`, `未知维度：${entry.dimensionId}`)
    const dimension = DIMENSION_REGISTRY.find((candidate) => candidate.id === entry.dimensionId)
    if (!groupIds.has(entry.correlationGroup)) issue(`${path}.correlationGroup`, '引用了未知相关组')
    if (!PROBABILITY_BASIS_TYPES.includes(entry.basisType)) issue(`${path}.basisType`, '未知依据类型')
    if (!PROBABILITY_GRADES.includes(entry.evidenceGrade)) issue(`${path}.evidenceGrade`, '未知证据等级')
    if (!PROBABILITY_METHODS.includes(entry.method)) issue(`${path}.method`, '未知概率方法')
    if (entry.sourceIds.some((sourceId) => !knownSources.has(sourceId))) issue(`${path}.sourceIds`, '引用了未登记来源')
    if ((entry.basisType === 'direct' || entry.basisType === 'study' || entry.basisType === 'proxy' || entry.basisType === 'analyst_model') && entry.sourceIds.length === 0) {
      issue(`${path}.sourceIds`, `${entry.basisType}必须引用来源`)
    }
    if ((entry.basisType === 'study' || entry.basisType === 'proxy') &&
      !entry.sourceIds.some(supportsQuantitativeProxy)) {
      issue(`${path}.sourceIds`, `${entry.basisType}至少需要一个非excluded的定量来源或关系研究；缺口证据不能支撑中心概率`)
    }
    if (entry.basisType === 'analyst_model') {
      if (!entry.limitationCodes.includes('analyst_prior')) issue(`${path}.limitationCodes`, '分析者模型必须声明分析者先验')
      if (entry.evidenceGrade !== 'C' && entry.evidenceGrade !== 'D' && entry.evidenceGrade !== 'NA') {
        issue(`${path}.evidenceGrade`, '分析者模型不得标A/B')
      }
    }
    if (entry.basisType === 'max_entropy') {
      maxEntropyCount += 1
      if (entry.evidenceGrade !== 'D' && entry.evidenceGrade !== 'NA') issue(`${path}.evidenceGrade`, '最大熵只能标D或NA')
      if (!entry.limitationCodes.includes('analyst_prior')) issue(`${path}.limitationCodes`, '最大熵必须声明分析者先验')
    }
    if (entry.limitationCodes.includes('analyst_prior')) analystPriorCount += 1
    if (entry.limitationCodes.length === 0 || entry.limitationCodes.some((code) => !limitationCodes.has(code))) {
      issue(`${path}.limitationCodes`, '局限代码必须非空且已登记')
    }
    const isDirect = entry.method === 'delegated_direct'
    if (isDirect) directCount += 1
    if (isDirect !== DIRECT_DIMENSIONS.has(entry.dimensionId) || isDirect !== (entry.basisType === 'direct')) {
      issue(path, '可靠层直接维度集合、方法与basisType不一致')
    }
    if (dimension != null) {
      const expectedPopulationUse = isDirect ? 'included' : 'scenario'
      if (dimension.populationUse !== expectedPopulationUse) {
        issue(`${path}.dimensionId`, `维度人口用途必须为 ${expectedPopulationUse}`)
      }
    }
    validateMethodModel(entry, index, registry, issues)
  })

  const educationEntry = registry.entries.find((entry) => entry.dimensionId === 'education.level')
  const educationGroup = registry.correlationGroups.find((group) => group.id === 'education_attainment')
  if (educationEntry?.correlationGroup !== 'education_attainment' ||
    educationGroup == null ||
    Object.values(educationGroup.correlationStrength).some((value) => value !== 0)) {
    issue(
      'correlationGroups.education_attainment',
      '学历必须保持零相关强度的互斥分层母集；院校与收入应在学历单元内条件化，不得把学历作为rho边际重复扣减',
    )
  }
  for (const dimensionId of [
    'education.school',
    'economy.income',
    'economy.wealth',
    'economy.house',
    'economy.vehicle',
    'career.in_system',
    'career.stability',
  ]) {
    if (registry.entries.find((entry) => entry.dimensionId === dimensionId)?.correlationGroup !== 'economic_resources') {
      issue(`entries.${dimensionId}.correlationGroup`, '经济资源情境必须保留在统一相关组内')
    }
  }

  const missing = [...dimensionIds].filter((id) => !entryIds.has(id))
  const extra = [...entryIds].filter((id) => !dimensionIds.has(id))
  if (missing.length > 0 || extra.length > 0 || registry.entries.length !== DIMENSION_REGISTRY.length) {
    issue('entries', `概率政策必须逐一覆盖维度；missing=${missing.join(',')}; extra=${extra.join(',')}`)
  }
  const projected = projectDimensionProbabilityRuntime(registry)
  if (JSON.stringify(runtimeJson) !== JSON.stringify(projected)) {
    issue('runtime', '紧凑运行时投影陈旧，请重新生成')
  }

  return {
    valid: issues.length === 0,
    entryCount: registry.entries.length,
    directCount,
    modeledCount: registry.entries.length - directCount,
    correlationGroupCount: registry.correlationGroups.length,
    maxEntropyCount,
    analystPriorCount,
    issues,
  }
}
