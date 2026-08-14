export const PROBABILITY_BASIS_TYPES = ['direct', 'study', 'proxy', 'analyst_model', 'max_entropy'] as const
export const PROBABILITY_GRADES = ['A', 'B', 'C', 'D', 'NA'] as const
export const PROBABILITY_METHODS = [
  'delegated_direct',
  'fixed',
  'categorical_union',
  'nested_share',
  'lognormal_survival',
  'housing_compound',
  'vehicle_compound',
  'hair_age_sex',
  'contextual_scenario',
  'zodiac_calendar',
  'mbti_axes',
  'bmi_category_union',
] as const

type ProbabilityRange = { lower: number; reference: number; upper: number }

interface FullProbabilityEntry {
  dimensionId: string
  correlationGroup: string
  basisType: (typeof PROBABILITY_BASIS_TYPES)[number]
  evidenceGrade: (typeof PROBABILITY_GRADES)[number]
  sourceIds: string[]
  method: (typeof PROBABILITY_METHODS)[number]
  model: Record<string, unknown>
  limitationCodes: string[]
}

export interface FullDimensionProbabilityRegistry {
  dataVersion: string
  modelVersion: string
  evidenceCatalogDataVersion: string
  evidenceCatalogModelVersion: string
  correlationGroups: Array<{
    id: string
    correlationStrength: ProbabilityRange
  }>
  scenarioPresets: Record<string, ProbabilityRange>
  entries: FullProbabilityEntry[]
}

export type CompactRange = readonly [lower: number, reference: number, upper: number]
export type CompactProbabilityEntry = readonly [
  dimensionId: string,
  groupIndex: number,
  basisIndex: number,
  gradeIndex: number,
  methodIndex: number,
  sourceIndexes: readonly number[],
  model: unknown,
  limitationIndexes: readonly number[],
]

export interface DimensionProbabilityRuntimeProjection {
  v: string
  m: string
  g: ReadonlyArray<readonly [id: string, lower: number, reference: number, upper: number]>
  s: readonly string[]
  l: readonly string[]
  e: readonly CompactProbabilityEntry[]
}

function range(value: unknown): CompactRange {
  const candidate = value as ProbabilityRange
  return [candidate.lower, candidate.reference, candidate.upper]
}

function options(value: unknown): ReadonlyArray<readonly [string, number, number, number]> {
  return Object.entries(value as Record<string, ProbabilityRange>)
    .map(([id, scenario]) => [id, ...range(scenario)] as const)
}

function compactModel(
  entry: FullProbabilityEntry,
  presets: Readonly<Record<string, ProbabilityRange>>,
): unknown {
  const model = entry.model
  switch (entry.method) {
    case 'delegated_direct':
      return null
    case 'fixed':
      return range(presets[model.scenarioPreset as string])
    case 'categorical_union':
      return [model.exhaustive === true ? 1 : 0, options(model.optionShares)]
    case 'nested_share':
      return [options(model.optionShares), range(model.unspecified)]
    case 'lognormal_survival':
      return [
        range(model.medianWan),
        range(model.logSigma),
        ((model.ageFactors ?? []) as Array<{ age: number; factor: number }>)
          .map((point) => [point.age, point.factor]),
        Object.entries((model.educationFactors ?? {}) as Record<string, number>)
          .map(([id, factor]) => [id, factor]),
        ((model.employmentRates ?? []) as Array<{
          maxAge: number
          male: ProbabilityRange
          female: ProbabilityRange
        }>).map((band) => [
          band.maxAge,
          ...range(band.male),
          ...range(band.female),
        ]),
      ]
    case 'housing_compound':
      return [
        range(model.ownership),
        options(model.locationShares),
        options(model.typeShares),
        range(model.areaMedianSqm),
        range(model.areaLogSigma),
      ]
    case 'vehicle_compound':
      return [range(model.ownership), options(model.priceBandShares)]
    case 'hair_age_sex':
      return [
        (model.maleAgeBands as Array<{ maxAge: number; scenario: ProbabilityRange }>).map((band) =>
          [band.maxAge, ...range(band.scenario)]),
        (model.femaleAgeBands as Array<{ maxAge: number; scenario: ProbabilityRange }>).map((band) =>
          [band.maxAge, ...range(band.scenario)]),
        range(model.fallback),
      ]
    case 'contextual_scenario':
      return [options(model.contexts), range(model.fallback)]
    case 'zodiac_calendar':
      return [
        Object.entries(model.dayCounts as Record<string, number>),
        model.daysPerYear,
        range(model.seasonalityMultiplier),
      ]
    case 'mbti_axes':
      return [range(model.axisRetention), model.axes]
    case 'bmi_category_union':
      return [
        (model.bands as Array<{ id: string; min?: number; max?: number }>).map((band) =>
          [band.id, band.min ?? null, band.max ?? null]),
        model.maleMean,
        model.femaleMean,
        (model.ageAdjustments as Array<{ maxAge: number; value: number }>).map((point) =>
          [point.maxAge, point.value]),
        range(model.maleSd),
        range(model.femaleSd),
      ]
  }
}

export function projectDimensionProbabilityRuntime(
  registry: FullDimensionProbabilityRegistry,
): DimensionProbabilityRuntimeProjection {
  const sourceIds = [...new Set(registry.entries.flatMap((entry) => entry.sourceIds))]
  const limitationCodes = [...new Set(registry.entries.flatMap((entry) => entry.limitationCodes))]
  const groupIndex = new Map(registry.correlationGroups.map((group, index) => [group.id, index]))
  const sourceIndex = new Map(sourceIds.map((id, index) => [id, index]))
  const limitationIndex = new Map(limitationCodes.map((id, index) => [id, index]))

  return {
    v: registry.dataVersion,
    m: registry.modelVersion,
    g: registry.correlationGroups.map((group) => [
      group.id,
      group.correlationStrength.lower,
      group.correlationStrength.reference,
      group.correlationStrength.upper,
    ]),
    s: sourceIds,
    l: limitationCodes,
    e: registry.entries.map((entry) => [
      entry.dimensionId,
      groupIndex.get(entry.correlationGroup) ?? -1,
      PROBABILITY_BASIS_TYPES.indexOf(entry.basisType),
      PROBABILITY_GRADES.indexOf(entry.evidenceGrade),
      PROBABILITY_METHODS.indexOf(entry.method),
      entry.sourceIds.map((id) => sourceIndex.get(id) ?? -1),
      compactModel(entry, registry.scenarioPresets),
      entry.limitationCodes.map((id) => limitationIndex.get(id) ?? -1),
    ]),
  }
}
