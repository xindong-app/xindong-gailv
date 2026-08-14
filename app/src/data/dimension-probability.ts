import runtimeJson from './dimension-probability-runtime.json'
import { EDUCATION_BY_AGE } from './education'
import populationByAgeJson from './population-by-age.json'

export type ProbabilityEvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'NA'
export type ProbabilityBasisType = 'direct' | 'study' | 'proxy' | 'analyst_model' | 'max_entropy'
export type ProbabilityMethod =
  | 'delegated_direct'
  | 'fixed'
  | 'categorical_union'
  | 'nested_share'
  | 'lognormal_survival'
  | 'housing_compound'
  | 'vehicle_compound'
  | 'hair_age_sex'
  | 'contextual_scenario'
  | 'zodiac_calendar'
  | 'mbti_axes'
  | 'bmi_category_union'

export interface ProbabilityRange {
  lower: number
  reference: number
  upper: number
}

export interface DimensionProbabilityPolicy {
  dimensionId: string
  correlationGroup: string
  correlationStrength: ProbabilityRange
  basisType: ProbabilityBasisType
  grade: ProbabilityEvidenceGrade
  sourceIds: readonly string[]
  method: ProbabilityMethod
  /** Compact audit codes; full Chinese definitions live outside the browser bundle. */
  limitations: readonly string[]
}

export interface DimensionRetentionContext {
  targetGender?: 'male' | 'female'
  seekerGender?: 'male' | 'female'
  ageMin?: number
  ageMax?: number
  ageMid?: number
  cities?: readonly string[]
  cityKey?: string
  educationLevels?: readonly string[]
  maritalStatuses?: readonly string[]
}

export interface DimensionRetentionInput {
  dimensionId: string
  active?: boolean
  selectedValues?: readonly string[]
  threshold?: number
  contextKey?: string
  seekerGender?: 'male' | 'female'
  context?: DimensionRetentionContext
  /** Backward-compatible flat transport used by the comprehensive engine. */
  facets?: Readonly<Record<string, string | number | boolean | readonly string[] | null>>
}

export type DimensionRetentionResult =
  | { status: 'delegated_direct'; policy: DimensionProbabilityPolicy }
  | { status: 'modeled'; range: ProbabilityRange; policy: DimensionProbabilityPolicy }
  | { status: 'not_applied'; reason: 'inactive' | 'unknown_dimension' | 'invalid_input' }

type CompactEntry = readonly [string, number, number, number, number, readonly number[], unknown, readonly number[]]
interface CompactRuntime {
  v: string
  m: string
  g: ReadonlyArray<readonly [string, number, number, number]>
  s: readonly string[]
  l: readonly string[]
  e: readonly CompactEntry[]
}

const runtime = runtimeJson as unknown as CompactRuntime
const BASIS_TYPES = ['direct', 'study', 'proxy', 'analyst_model', 'max_entropy'] as const
const GRADES = ['A', 'B', 'C', 'D', 'NA'] as const
const METHODS = [
  'delegated_direct', 'fixed', 'categorical_union', 'nested_share',
  'lognormal_survival', 'housing_compound', 'vehicle_compound', 'hair_age_sex',
  'contextual_scenario', 'zodiac_calendar', 'mbti_axes', 'bmi_category_union',
] as const
const entries = new Map(runtime.e.map((entry) => [entry[0], entry]))

export const DIMENSION_PROBABILITY_DATA_VERSION = runtime.v
export const DIMENSION_PROBABILITY_MODEL_VERSION = runtime.m

const clamp = (value: number): number => Math.min(1, Math.max(0, value))
const scenario = (tuple: readonly number[]): ProbabilityRange => ({
  lower: clamp(tuple[0]),
  reference: clamp(tuple[1]),
  upper: clamp(tuple[2]),
})
const neutral = (): ProbabilityRange => ({ lower: 1, reference: 1, upper: 1 })

function ordered(values: readonly number[], reference: number): ProbabilityRange {
  return {
    lower: clamp(Math.min(reference, ...values)),
    reference: clamp(reference),
    upper: clamp(Math.max(reference, ...values)),
  }
}

export function probabilityPolicyForDimension(dimensionId: string): DimensionProbabilityPolicy | null {
  const entry = entries.get(dimensionId)
  if (entry == null) return null
  const group = runtime.g[entry[1]]
  return {
    dimensionId,
    correlationGroup: group[0],
    correlationStrength: scenario([group[1], group[2], group[3]]),
    basisType: BASIS_TYPES[entry[2]],
    grade: GRADES[entry[3]],
    sourceIds: entry[5].map((index) => runtime.s[index]),
    method: METHODS[entry[4]],
    limitations: entry[7].map((index) => runtime.l[index]),
  }
}

function textFacet(input: DimensionRetentionInput, key: string): string | undefined {
  const value = input.facets?.[key]
  return typeof value === 'string' ? value : undefined
}

function numberFacet(input: DimensionRetentionInput, key: string): number | undefined {
  const value = input.facets?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanFacet(input: DimensionRetentionInput, key: string): boolean | undefined {
  const value = input.facets?.[key]
  return typeof value === 'boolean' ? value : undefined
}

function listFacet(input: DimensionRetentionInput, key: string): readonly string[] {
  const value = input.facets?.[key]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') return value.length === 0 ? [] : value.split('|')
  return []
}

function contextGender(input: DimensionRetentionInput, key: 'targetGender' | 'seekerGender') {
  const value = input.context?.[key] ?? (key === 'seekerGender' ? input.seekerGender : undefined) ?? textFacet(input, key)
  return value === 'male' || value === 'female' ? value : undefined
}

function contextAge(input: DimensionRetentionInput): number | undefined {
  const explicit = input.context?.ageMid ?? numberFacet(input, 'ageMid')
  if (explicit != null) return explicit
  const minimum = input.context?.ageMin ?? numberFacet(input, 'ageMin')
  const maximum = input.context?.ageMax ?? numberFacet(input, 'ageMax')
  return minimum == null || maximum == null ? undefined : (minimum + maximum) / 2
}

function averageAgeFactor(input: DimensionRetentionInput, points: ReadonlyArray<readonly [number, number]>): number {
  const minimum = Math.round(input.context?.ageMin ?? numberFacet(input, 'ageMin') ?? contextAge(input) ?? 34)
  const maximum = Math.round(input.context?.ageMax ?? numberFacet(input, 'ageMax') ?? minimum)
  const low = Math.max(18, Math.min(minimum, maximum))
  const high = Math.min(50, Math.max(minimum, maximum))
  let sum = 0
  for (let age = low; age <= high; age += 1) sum += interpolate(points, age)
  return sum / Math.max(1, high - low + 1)
}

function interpolate(points: ReadonlyArray<readonly [number, number]>, value: number): number {
  if (value <= points[0][0]) return points[0][1]
  if (value >= points[points.length - 1][0]) return points[points.length - 1][1]
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x0, y0] = points[index]
    const [x1, y1] = points[index + 1]
    if (value <= x1) return y0 + ((value - x0) * (y1 - y0)) / (x1 - x0)
  }
  return 1
}

function erf(value: number): number {
  const sign = value < 0 ? -1 : 1
  const x = Math.abs(value)
  const t = 1 / (1 + 0.3275911 * x)
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  return sign * (1 - polynomial * Math.exp(-x * x))
}

const normalCdf = (value: number): number => 0.5 * (1 + erf(value / Math.SQRT2))

/** Stable Gaussian upper tail; avoids cancelling 1 - CDF for large z. */
function normalSurvival(value: number): number {
  const x = Math.abs(value) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const polynomial = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t
  const positiveTail = 0.5 * polynomial * Math.exp(-x * x)
  return clamp(value >= 0 ? positiveTail : 1 - positiveTail)
}

function normalInterval(minimum: number | null, maximum: number | null, mean: number, sd: number): number {
  const lowerZ = minimum == null ? null : (minimum - mean) / sd
  const upperZ = maximum == null ? null : (maximum - mean) / sd
  if (lowerZ == null) return upperZ == null ? 1 : normalCdf(upperZ)
  if (upperZ == null) return normalSurvival(lowerZ)
  if (lowerZ >= 0) return clamp(normalSurvival(lowerZ) - normalSurvival(upperZ))
  return clamp(normalCdf(upperZ) - normalCdf(lowerZ))
}

function lognormalSurvival(threshold: number, median: number, sigma: number): number {
  if (threshold <= 0) return 1
  if (median <= 0 || sigma <= 0) return 0
  return normalSurvival((Math.log(threshold) - Math.log(median)) / sigma)
}

function optionMap(model: unknown): Map<string, ProbabilityRange> {
  return new Map((model as ReadonlyArray<readonly [string, number, number, number]>).map(
    ([id, lower, reference, upper]) => [id, { lower, reference, upper }],
  ))
}

function categoricalUnion(
  selected: readonly string[] | undefined,
  optionTuples: ReadonlyArray<readonly [string, number, number, number]>,
  exhaustive: boolean,
): ProbabilityRange | null {
  if (selected == null || selected.length === 0) return neutral()
  const options = optionMap(optionTuples)
  const accepted = [...new Set(selected)]
  if (accepted.some((id) => !options.has(id))) return null
  if (exhaustive && accepted.length === options.size) return neutral()
  const ranges = accepted.map((id) => options.get(id) as ProbabilityRange)
  return {
    lower: clamp(ranges.reduce((sum, item) => sum + item.lower, 0)),
    reference: clamp(ranges.reduce((sum, item) => sum + item.reference, 0)),
    upper: clamp(ranges.reduce((sum, item) => sum + item.upper, 0)),
  }
}

function lognormalRange(input: DimensionRetentionInput, model: unknown): ProbabilityRange | null {
  if (input.threshold == null || !Number.isFinite(input.threshold)) return null
  if (input.threshold <= 0) return neutral()
  const [medianTuple, sigmaTuple, ageTuples, educationTuples, employmentTuples = []] = model as [
    readonly number[], readonly number[], ReadonlyArray<readonly [number, number]>,
    ReadonlyArray<readonly [string, number]>,
    ReadonlyArray<readonly [number, number, number, number, number, number, number]>,
  ]
  const educationFactors = new Map(educationTuples)
  const selectedEducation = input.context?.educationLevels ?? listFacet(input, 'educationLevels')
  const minimumAge = Math.max(18, Math.round(input.context?.ageMin ?? numberFacet(input, 'ageMin') ?? contextAge(input) ?? 34))
  const maximumAge = Math.min(50, Math.round(input.context?.ageMax ?? numberFacet(input, 'ageMax') ?? minimumAge))
  const gender = contextGender(input, 'targetGender')
  const employmentAt = (age: number, cellGender: 'male' | 'female'): readonly [number, number, number] => {
    const band = employmentTuples.find(([maxAge]) => age <= maxAge) ?? employmentTuples.at(-1)
    if (band == null) return [1, 1, 1]
    return cellGender === 'male'
      ? [band[1], band[2], band[3]]
      : [band[4], band[5], band[6]]
  }
  const cells: Array<{
    weight: number
    scale: number
    employment: readonly [number, number, number]
  }> = []
  const pushCell = (weight: number, scale: number, age: number, cellGender: 'male' | 'female'): void => {
    if (weight > 0) cells.push({ weight, scale, employment: employmentAt(age, cellGender) })
  }
  if (selectedEducation.length > 0 && educationTuples.length > 0) {
    for (const row of EDUCATION_BY_AGE) {
      if (row.age < minimumAge || row.age > maximumAge) continue
      const ageFactor = interpolate(ageTuples, row.age)
      for (const level of selectedEducation) {
        const educationFactor = educationFactors.get(level)
        if (educationFactor == null || !(level in row)) continue
        const counts = row[level as keyof typeof row]
        if (typeof counts !== 'object') continue
        const scale = ageFactor * educationFactor
        if (gender == null) {
          pushCell(counts.male, scale, row.age, 'male')
          pushCell(counts.female, scale, row.age, 'female')
        } else {
          pushCell(counts[gender], scale, row.age, gender)
        }
      }
    }
  }
  if (selectedEducation.length === 0 && educationTuples.length > 0) {
    const explicitEducationLevels = educationTuples
      .map(([level]) => level)
      .filter((level) => level !== 'other')
    const otherEducationFactor = educationFactors.get('other') ?? 1
    for (const row of EDUCATION_BY_AGE) {
      if (row.age < minimumAge || row.age > maximumAge) continue
      const ageFactor = interpolate(ageTuples, row.age)
      const pushGenderCells = (cellGender: 'male' | 'female'): void => {
        let represented = 0
        for (const level of explicitEducationLevels) {
          const educationFactor = educationFactors.get(level)
          if (educationFactor == null || !(level in row)) continue
          const counts = row[level as keyof typeof row]
          if (typeof counts !== 'object' || !(cellGender in counts)) continue
          const weight = counts[cellGender as keyof typeof counts]
          if (typeof weight !== 'number') continue
          represented += weight
          pushCell(weight, ageFactor * educationFactor, row.age, cellGender)
        }
        const residual = Math.max(0, row.population[cellGender] - represented)
        pushCell(residual, ageFactor * otherEducationFactor, row.age, cellGender)
      }
      if (gender == null) {
        pushGenderCells('male')
        pushGenderCells('female')
      } else {
        pushGenderCells(gender)
      }
    }
  }
  if (cells.length === 0) {
    // Compatibility fallback for lognormal models without an education table.
    const ageFactor = ageTuples.length === 0 ? 1 : averageAgeFactor(input, ageTuples)
    for (const row of populationByAgeJson.rows) {
      if (row.age < minimumAge || row.age > maximumAge) continue
      if (gender == null) {
        pushCell(row.male, ageFactor, row.age, 'male')
        pushCell(row.female, ageFactor, row.age, 'female')
      } else {
        pushCell(row[gender], ageFactor, row.age, gender)
      }
    }
  }
  if (cells.length === 0) return null
  const totalWeight = cells.reduce((sum, cell) => sum + cell.weight, 0)
  const retention = (median: number, sigma: number, employmentScenario: number) => cells.reduce(
    (sum, cell) => sum + cell.weight * cell.employment[employmentScenario] * lognormalSurvival(
      input.threshold as number,
      median * cell.scale,
      sigma,
    ),
    0,
  ) / totalWeight
  const values = medianTuple.flatMap((median) => sigmaTuple.flatMap((sigma) =>
    [0, 1, 2].map((employmentScenario) => retention(median, sigma, employmentScenario))))
  return ordered(values, retention(medianTuple[1], sigmaTuple[1], 1))
}

function bmiRange(input: DimensionRetentionInput, model: unknown): ProbabilityRange | null {
  const [bands, maleMean, femaleMean, ageAdjustments, maleSd, femaleSd] = model as [
    ReadonlyArray<readonly [string, number | null, number | null]>, number, number,
    ReadonlyArray<readonly [number, number]>, readonly number[], readonly number[],
  ]
  const selected = [...new Set(input.selectedValues ?? [])]
  if (selected.length === 0) return neutral()
  if (selected.some((id) => !bands.some((band) => band[0] === id))) return null
  if (selected.length === bands.length) return neutral()
  const age = contextAge(input) ?? 34
  const adjustment = ageAdjustments.find(([maximum]) => age <= maximum)?.[1] ?? 0
  const gender = contextGender(input, 'targetGender')
  const mean = (gender === 'female' ? femaleMean : maleMean) + adjustment
  const sds = gender === 'female' ? femaleSd : gender === 'male' ? maleSd : [...maleSd, ...femaleSd]
  const acceptedBands = bands.filter(([id]) => selected.includes(id))
  const probability = (sd: number) => acceptedBands.reduce(
    (sum, [, minimum, maximum]) => sum + normalInterval(minimum, maximum, mean, sd),
    0,
  )
  const referenceSd = gender === 'female' ? femaleSd[1] : maleSd[1]
  const reference = probability(referenceSd)
  return ordered(sds.map(probability), reference)
}

function multiplyRanges(ranges: readonly ProbabilityRange[]): ProbabilityRange {
  return {
    lower: clamp(ranges.reduce((value, item) => value * item.lower, 1)),
    reference: clamp(ranges.reduce((value, item) => value * item.reference, 1)),
    upper: clamp(ranges.reduce((value, item) => value * item.upper, 1)),
  }
}

function compoundRange(input: DimensionRetentionInput, model: unknown, vehicle: boolean): ProbabilityRange | null {
  const required = booleanFacet(input, 'required')
  const hasVehicleConstraint = vehicle && (input.selectedValues?.length ?? 0) > 0
  const hasHousingConstraint = !vehicle && (
    textFacet(input, 'location') != null ||
    textFacet(input, 'type') != null ||
    (numberFacet(input, 'minAreaSqm') ?? 0) > 0
  )
  if (required === false && !hasVehicleConstraint && !hasHousingConstraint) return neutral()
  const parts = model as unknown[]
  const ranges: ProbabilityRange[] = [scenario(parts[0] as readonly number[])]
  if (vehicle) {
    const selected = input.selectedValues ?? []
    if (selected.length > 0) {
      const priceShare = categoricalUnion(selected, parts[1] as ReadonlyArray<readonly [string, number, number, number]>, true)
      if (priceShare == null) return null
      ranges.push(priceShare)
    }
    return multiplyRanges(ranges)
  }
  const location = textFacet(input, 'location')
  const type = textFacet(input, 'type')
  const locationOptions = optionMap(parts[1])
  const typeOptions = optionMap(parts[2])
  if (location != null) {
    const value = locationOptions.get(location)
    if (value == null) return null
    ranges.push(value)
  }
  if (type != null) {
    const value = typeOptions.get(type)
    if (value == null) return null
    ranges.push(value)
  }
  const minimumArea = numberFacet(input, 'minAreaSqm')
  if (minimumArea != null && minimumArea > 0) {
    const medians = parts[3] as readonly number[]
    const sigmas = parts[4] as readonly number[]
    const values = medians.flatMap((median) => sigmas.map((sigma) =>
      lognormalSurvival(minimumArea, median, sigma)))
    ranges.push(ordered(values, lognormalSurvival(minimumArea, medians[1], sigmas[1])))
  }
  return multiplyRanges(ranges)
}

function hairRange(input: DimensionRetentionInput, model: unknown): ProbabilityRange {
  const [maleBands, femaleBands, fallback] = model as [
    ReadonlyArray<readonly [number, number, number, number]>,
    ReadonlyArray<readonly [number, number, number, number]>,
    readonly number[],
  ]
  const gender = contextGender(input, 'targetGender')
  const age = contextAge(input)
  if (gender == null || age == null) return scenario(fallback)
  const bands = gender === 'female' ? femaleBands : maleBands
  const band = bands.find(([maximum]) => age <= maximum) ?? bands[bands.length - 1]
  return scenario([band[1], band[2], band[3]])
}

function contextualRange(input: DimensionRetentionInput, model: unknown): ProbabilityRange {
  const [contexts, fallback] = model as [
    ReadonlyArray<readonly [string, number, number, number]>, readonly number[],
  ]
  const seeker = contextGender(input, 'seekerGender')
  const target = contextGender(input, 'targetGender')
  const key = input.contextKey ?? (seeker != null && target != null ? `${seeker}_${target}` : undefined)
  const selected = key == null ? undefined : contexts.find(([id]) => id === key)
  return scenario(selected == null ? fallback : [selected[1], selected[2], selected[3]])
}

function zodiacRange(selectedValues: readonly string[] | undefined, model: unknown): ProbabilityRange | null {
  const [dayEntries, daysPerYear, multiplier] = model as [
    ReadonlyArray<readonly [string, number]>, number, readonly number[],
  ]
  const selected = [...new Set(selectedValues ?? [])]
  if (selected.length === 0 || selected.length === dayEntries.length) return neutral()
  const days = new Map(dayEntries)
  if (selected.some((id) => !days.has(id))) return null
  const reference = selected.reduce((sum, id) => sum + (days.get(id) ?? 0), 0) / daysPerYear
  return ordered([reference * multiplier[0], reference * multiplier[2]], reference)
}

function mbtiRange(selectedValues: readonly string[] | undefined, model: unknown): ProbabilityRange | null {
  const [axisRetention, axes] = model as [readonly number[], ReadonlyArray<readonly [string, string]>]
  const selected = new Set(selectedValues ?? [])
  const valid = new Set(axes.flat())
  if ([...selected].some((value) => !valid.has(value))) return null
  const constrainedAxes = axes.filter(([left, right]) => selected.has(left) !== selected.has(right)).length
  return {
    lower: axisRetention[0] ** constrainedAxes,
    reference: axisRetention[1] ** constrainedAxes,
    upper: axisRetention[2] ** constrainedAxes,
  }
}

export function estimateDimensionRetention(input: DimensionRetentionInput): DimensionRetentionResult {
  if (input.active === false) return { status: 'not_applied', reason: 'inactive' }
  const entry = entries.get(input.dimensionId)
  const policy = probabilityPolicyForDimension(input.dimensionId)
  if (entry == null || policy == null) return { status: 'not_applied', reason: 'unknown_dimension' }
  if (policy.method === 'delegated_direct') return { status: 'delegated_direct', policy }

  const model = entry[6]
  let range: ProbabilityRange | null
  switch (policy.method) {
    case 'fixed':
      range = scenario(model as readonly number[])
      break
    case 'categorical_union': {
      const [exhaustive, optionTuples] = model as [number, ReadonlyArray<readonly [string, number, number, number]>]
      range = categoricalUnion(input.selectedValues, optionTuples, exhaustive === 1)
      break
    }
    case 'nested_share': {
      const selected = [...new Set(input.selectedValues ?? [])]
      const [optionTuples, unspecified] = model as [
        ReadonlyArray<readonly [string, number, number, number]>, readonly number[],
      ]
      const options = optionMap(optionTuples)
      if (selected.length === 0) range = scenario(unspecified)
      else if (selected.some((id) => !options.has(id))) range = null
      else range = selected.map((id) => options.get(id) as ProbabilityRange)
        .reduce((widest, value) => value.reference > widest.reference ? value : widest)
      break
    }
    case 'lognormal_survival':
      range = lognormalRange(input, model)
      break
    case 'housing_compound':
      range = compoundRange(input, model, false)
      break
    case 'vehicle_compound':
      range = compoundRange(input, model, true)
      break
    case 'hair_age_sex':
      range = hairRange(input, model)
      break
    case 'contextual_scenario':
      range = contextualRange(input, model)
      break
    case 'zodiac_calendar':
      range = zodiacRange(input.selectedValues, model)
      break
    case 'mbti_axes':
      range = mbtiRange(input.selectedValues, model)
      break
    case 'bmi_category_union':
      range = bmiRange(input, model)
      break
    default:
      range = null
  }
  return range == null
    ? { status: 'not_applied', reason: 'invalid_input' }
    : { status: 'modeled', range, policy }
}
