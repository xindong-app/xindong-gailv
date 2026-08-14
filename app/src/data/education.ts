import educationRuntimeJson from './education-runtime.json'
import type { EducationId, GenderId } from '../model/schema'

export interface EducationCountsBySex {
  total: number
  male: number
  female: number
}

export interface EducationByAgeRow {
  age: number
  population: EducationCountsBySex
  junior_college: EducationCountsBySex
  bachelor: EducationCountsBySex
  master: EducationCountsBySex
  doctorate: EducationCountsBySex
}

export type EducationRuntimeTuple = readonly [
  age: number,
  populationMale: number,
  populationFemale: number,
  juniorCollegeMale: number,
  juniorCollegeFemale: number,
  bachelorMale: number,
  bachelorFemale: number,
  masterMale: number,
  masterFemale: number,
  doctorateMale: number,
  doctorateFemale: number,
]

export interface EducationRuntimeDataset {
  dataVersion: string
  columns: string[]
  rows: EducationRuntimeTuple[]
}

export const EDUCATION_RUNTIME_DATA = educationRuntimeJson as unknown as EducationRuntimeDataset

const counts = (male: number, female: number): EducationCountsBySex => ({
  total: male + female,
  male,
  female,
})

export const EDUCATION_BY_AGE: readonly EducationByAgeRow[] = EDUCATION_RUNTIME_DATA.rows.map((row) => ({
  age: row[0],
  population: counts(row[1], row[2]),
  junior_college: counts(row[3], row[4]),
  bachelor: counts(row[5], row[6]),
  master: counts(row[7], row[8]),
  doctorate: counts(row[9], row[10]),
}))

const educationByAge = new Map(EDUCATION_BY_AGE.map((row) => [row.age, row]))

export function educationRowAtAge(age: number): EducationByAgeRow {
  const row = educationByAge.get(age)
  if (row == null) throw new Error(`缺少 ${age} 岁学历人口机器表行`)
  return row
}

/**
 * Table 4-1 categories are mutually exclusive highest-attainment categories.
 * A multi-selection is therefore a union (sum), never a nested double count.
 */
export function educationShareAtAge(
  age: number,
  gender: GenderId,
  selectedLevels: readonly EducationId[],
): number {
  if (selectedLevels.length === 0) return 1
  const row = educationRowAtAge(age)
  const denominator = row.population[gender]
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new Error(`${age} 岁 ${gender} 学历分母无效`)
  }
  const numerator = [...new Set(selectedLevels)].reduce(
    (sum, level) => sum + row[level][gender],
    0,
  )
  return Math.min(1, Math.max(0, numerator / denominator))
}
