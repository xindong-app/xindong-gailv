import { CITIES, NATIONAL_WAGE } from './cities'
import populationByAgeJson from './population-by-age.json'
import maritalByAgeBandJson from './marital-by-age-band.json'

export const MIN_MODEL_AGE = 18
export const MAX_MODEL_AGE = 50

export interface PopulationByAgeRow {
  age: number
  total: number
  male: number
  female: number
}

/**
 * Direct rows from Seventh Census table A0301, not a five-year-band average.
 * 18–50 are all present and each row is checked below for total=male+female.
 */
export const POPULATION_BY_AGE: readonly PopulationByAgeRow[] = populationByAgeJson.rows
const populationByAge = new Map(POPULATION_BY_AGE.map((row) => [row.age, row]))

// 2025 year-end mainland population (evidence.base.region.population-2025).
// It is used only as the same-denominator divisor for selected city resident
// population. The census single-age shape remains 2020 and is not silently
// inflated to 2025 without a published 2025 single-age table.
export const NATIONAL_POPULATION_WAN = 140_489

export function populationWanAtAge(age: number): number {
  if (!Number.isInteger(age) || age < MIN_MODEL_AGE || age > MAX_MODEL_AGE) return 0
  return (populationByAge.get(age)?.total ?? 0) / 10_000
}

export function populationWanInRange(ageMin: number, ageMax: number): number {
  let total = 0
  for (let age = ageMin; age <= ageMax; age += 1) total += populationWanAtAge(age)
  return total
}

export function maleShareAtAge(age: number): number {
  const row = populationByAge.get(age)
  return row == null || row.total <= 0 ? 0.5 : row.male / row.total
}

export function populationAtAgeByGender(age: number, gender: PopulationGender): number {
  const row = populationByAge.get(age)
  return row == null ? 0 : row[gender]
}

export interface PopulationTableValidation {
  valid: boolean
  rowCount: number
  missingAges: number[]
  duplicateAges: number[]
  inconsistentTotals: number[]
  totals: { total: number; male: number; female: number }
}

export function validatePopulationTable(): PopulationTableValidation {
  const counts = new Map<number, number>()
  const inconsistentTotals: number[] = []
  const totals = { total: 0, male: 0, female: 0 }
  for (const row of POPULATION_BY_AGE) {
    counts.set(row.age, (counts.get(row.age) ?? 0) + 1)
    if (row.total !== row.male + row.female) inconsistentTotals.push(row.age)
    totals.total += row.total
    totals.male += row.male
    totals.female += row.female
  }
  const missingAges: number[] = []
  for (let age = MIN_MODEL_AGE; age <= MAX_MODEL_AGE; age += 1) {
    if (!counts.has(age)) missingAges.push(age)
  }
  const duplicateAges = [...counts].filter(([, count]) => count > 1).map(([age]) => age)
  return {
    valid: POPULATION_BY_AGE.length === MAX_MODEL_AGE - MIN_MODEL_AGE + 1 &&
      missingAges.length === 0 && duplicateAges.length === 0 && inconsistentTotals.length === 0 &&
      totals.total === totals.male + totals.female,
    rowCount: POPULATION_BY_AGE.length,
    missingAges,
    duplicateAges,
    inconsistentTotals,
    totals,
  }
}

export type PopulationGender = 'male' | 'female'
export type PopulationMaritalStatus =
  | 'never_married'
  | 'divorced'
  | 'widowed'

export interface MaritalByAgeBandRow {
  gender: PopulationGender
  minAge: number
  maxAge: number
  total: number
  neverMarried: number
  divorced: number
  widowed: number
}

export const MARITAL_BY_AGE_BAND: readonly MaritalByAgeBandRow[] = maritalByAgeBandJson.rows as MaritalByAgeBandRow[]

function maritalBandAtAge(age: number, gender: PopulationGender): MaritalByAgeBandRow | null {
  return MARITAL_BY_AGE_BAND.find((row) => row.gender === gender && age >= row.minAge && age <= row.maxAge) ?? null
}

export function maritalBandShare(
  minAge: number,
  maxAge: number,
  gender: PopulationGender,
  status: PopulationMaritalStatus,
): number {
  const row = MARITAL_BY_AGE_BAND.find((candidate) =>
    candidate.gender === gender && candidate.minAge === minAge && candidate.maxAge === maxAge,
  )
  if (row == null || row.total <= 0) return 0
  const numerator = status === 'never_married' ? row.neverMarried : row[status]
  return numerator / row.total
}

export function neverMarriedShare(age: number, gender: PopulationGender): number {
  const row = maritalBandAtAge(age, gender)
  return row == null ? 0 : row.neverMarried / row.total
}

export function divorcedShare(age: number, gender: PopulationGender): number {
  const row = maritalBandAtAge(age, gender)
  return row == null ? 0 : row.divorced / row.total
}

export function widowedShare(age: number, gender: PopulationGender): number {
  const row = maritalBandAtAge(age, gender)
  return row == null ? 0 : row.widowed / row.total
}

/** Selected statuses are mutually exclusive and therefore combine by union. */
export function maritalShareAtAge(
  age: number,
  gender: PopulationGender,
  statuses: readonly PopulationMaritalStatus[],
): number {
  // Empty is deliberately "no marital filter". The previous engine silently
  // fell back to never-married, making visible state disagree with calculation.
  if (statuses.length === 0) return 1
  let share = 0
  if (statuses.includes('never_married')) share += neverMarriedShare(age, gender)
  if (statuses.includes('divorced')) share += divorcedShare(age, gender)
  if (statuses.includes('widowed')) share += widowedShare(age, gender)
  return Math.min(1, share)
}

export function cityPopulationScale(cities: readonly string[]): number {
  if (cities.length === 0 || cities.includes('全国')) return 1
  const uniqueCities = new Set(cities)
  const selectedPopulationWan = CITIES.reduce(
    (sum, city) => sum + (uniqueCities.has(city.name) ? city.pop : 0),
    0,
  )
  return Math.min(1, selectedPopulationWan / NATIONAL_POPULATION_WAN)
}

export function cityWageScale(cities: readonly string[]): number {
  if (cities.length === 0 || cities.includes('全国')) return 1
  const uniqueCities = new Set(cities)
  let wagePopulationTotal = 0
  let populationTotal = 0
  for (const city of CITIES) {
    if (!uniqueCities.has(city.name)) continue
    wagePopulationTotal += city.wage * city.pop
    populationTotal += city.pop
  }
  // A missing city never becomes probability zero; runtime validation normally
  // catches it, while this fallback keeps the lower-level function total-safe.
  // 106,080 is the registered 2025 scale-enterprise wage anchor. City wages
  // still have mixed vintages, so this relative factor is a C-grade calibration.
  return populationTotal > 0 ? wagePopulationTotal / populationTotal / NATIONAL_WAGE : 1
}
