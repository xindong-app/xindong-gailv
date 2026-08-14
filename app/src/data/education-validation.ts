import { DATA_VERSION } from '../model/versions'
import { EDUCATION_LEVELS, type EducationId } from '../model/schema'
import educationByAgeJson from './education-by-age.json'
import {
  EDUCATION_BY_AGE,
  EDUCATION_RUNTIME_DATA,
  type EducationByAgeRow,
  type EducationCountsBySex,
} from './education'
import { MAX_MODEL_AGE, MIN_MODEL_AGE, POPULATION_BY_AGE } from './population'

const SEX_KEYS = ['total', 'male', 'female'] as const
const COUNT_KEYS = ['population', ...EDUCATION_LEVELS] as const
const EXPECTED_SOURCE_SHA256 = '89E5B9E95471DB7BD0128BD99DF330CF054A5820C6CB5CDBD46F2C1283B91A95'

interface EducationFiveYearCheck extends Omit<EducationByAgeRow, 'age'> {
  minAge: number
  maxAge: number
}

interface EducationSourceDataset {
  dataVersion: string
  publisher: string
  sourceTitle: string
  sourceUrl: string
  companionImageUrl: string
  fillingInstructionsUrl: string
  sourceSha256: string
  retrievedAt: string
  referenceTime: string
  geography: string
  unit: 'people'
  ageRange: { min: number; max: number }
  sourceLayout: {
    worksheetIndex: number
    physicalRowsOneBased: boolean
    ageRows: number[]
    fiveYearSummaryRows: number[]
    columnTriples: Record<'population' | EducationId, number[]>
    columnOrder: string[]
  }
  categoryMapping: Record<EducationId, string>
  notes: string[]
  rows: EducationByAgeRow[]
  fiveYearChecks: EducationFiveYearCheck[]
}

export const EDUCATION_SOURCE_DATA = educationByAgeJson as EducationSourceDataset

export interface EducationTableValidation {
  valid: boolean
  rowCount: number
  fiveYearChecks: number
  missingAges: number[]
  duplicateAges: number[]
  inconsistentSexTotals: string[]
  populationMismatches: number[]
  invalidCategoryBounds: string[]
  fiveYearMismatches: string[]
  metadataIssues: string[]
  totals: Record<EducationId, EducationCountsBySex>
}

const emptyCounts = (): EducationCountsBySex => ({ total: 0, male: 0, female: 0 })
const EXPECTED_RUNTIME_COLUMNS = [
  'age',
  'population_male', 'population_female',
  'junior_college_male', 'junior_college_female',
  'bachelor_male', 'bachelor_female',
  'master_male', 'master_female',
  'doctorate_male', 'doctorate_female',
] as const
const EXPECTED_SOURCE_ROWS = [
  30, 31,
  34, 35, 36, 37, 38,
  41, 42, 43, 44, 45,
  48, 49, 50, 51, 52,
  55, 56, 57, 58, 59,
  62, 63, 64, 65, 66,
  69, 70, 71, 72, 73,
  76,
] as const
const EXPECTED_SUMMARY_ROWS = [33, 40, 47, 54, 61, 68] as const
const EXPECTED_SOURCE_COLUMNS = {
  population: [2, 3, 4],
  junior_college: [20, 21, 22],
  bachelor: [23, 24, 25],
  master: [26, 27, 28],
  doctorate: [29, 30, 31],
} as const

export function validateEducationTable(): EducationTableValidation {
  const countsByAge = new Map<number, number>()
  const inconsistentSexTotals: string[] = []
  const populationMismatches: number[] = []
  const invalidCategoryBounds: string[] = []
  const fiveYearMismatches: string[] = []
  const metadataIssues: string[] = []
  const populationByAge = new Map(POPULATION_BY_AGE.map((row) => [row.age, row]))
  const totals = Object.fromEntries(EDUCATION_LEVELS.map((level) => [level, emptyCounts()])) as Record<
    EducationId,
    EducationCountsBySex
  >

  for (const row of EDUCATION_BY_AGE) {
    countsByAge.set(row.age, (countsByAge.get(row.age) ?? 0) + 1)
    const populationRow = populationByAge.get(row.age)
    if (
      populationRow == null ||
      row.population.total !== populationRow.total ||
      row.population.male !== populationRow.male ||
      row.population.female !== populationRow.female
    ) populationMismatches.push(row.age)

    for (const key of COUNT_KEYS) {
      const counts = row[key]
      if (counts.total !== counts.male + counts.female) {
        inconsistentSexTotals.push(`${row.age}:${key}`)
      }
      if (key === 'population') continue
      for (const sex of SEX_KEYS) {
        if (!Number.isInteger(counts[sex]) || counts[sex] < 0 || counts[sex] > row.population[sex]) {
          invalidCategoryBounds.push(`${row.age}:${key}:${sex}`)
        }
        totals[key][sex] += counts[sex]
      }
    }
    for (const sex of SEX_KEYS) {
      const selectedCategories = EDUCATION_LEVELS.reduce((sum, level) => sum + row[level][sex], 0)
      if (selectedCategories > row.population[sex]) {
        invalidCategoryBounds.push(`${row.age}:selected-union:${sex}`)
      }
    }
  }

  for (const check of EDUCATION_SOURCE_DATA.fiveYearChecks) {
    const rows = EDUCATION_BY_AGE.filter((row) => row.age >= check.minAge && row.age <= check.maxAge)
    if (rows.length !== 5) {
      fiveYearMismatches.push(`${check.minAge}-${check.maxAge}:row-count`)
      continue
    }
    for (const key of COUNT_KEYS) {
      for (const sex of SEX_KEYS) {
        const sum = rows.reduce((total, row) => total + row[key][sex], 0)
        if (sum !== check[key][sex]) {
          fiveYearMismatches.push(`${check.minAge}-${check.maxAge}:${key}:${sex}`)
        }
      }
    }
  }

  const missingAges: number[] = []
  for (let age = MIN_MODEL_AGE; age <= MAX_MODEL_AGE; age += 1) {
    if (!countsByAge.has(age)) missingAges.push(age)
  }
  const duplicateAges = [...countsByAge]
    .filter(([, count]) => count > 1)
    .map(([age]) => age)

  if (EDUCATION_SOURCE_DATA.dataVersion !== DATA_VERSION) metadataIssues.push('dataVersion')
  if (EDUCATION_RUNTIME_DATA.dataVersion !== DATA_VERSION) metadataIssues.push('runtimeDataVersion')
  if (EDUCATION_SOURCE_DATA.unit !== 'people') metadataIssues.push('unit')
  if (EDUCATION_SOURCE_DATA.sourceUrl !== 'https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/zk/html/A0401.xls') {
    metadataIssues.push('sourceUrl')
  }
  if (EDUCATION_SOURCE_DATA.fillingInstructionsUrl !== 'https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/zk/html/fu06.pdf') {
    metadataIssues.push('fillingInstructionsUrl')
  }
  if (EDUCATION_SOURCE_DATA.sourceSha256 !== EXPECTED_SOURCE_SHA256) metadataIssues.push('sourceSha256')
  if (EDUCATION_SOURCE_DATA.ageRange.min !== MIN_MODEL_AGE || EDUCATION_SOURCE_DATA.ageRange.max !== MAX_MODEL_AGE) {
    metadataIssues.push('ageRange')
  }
  if (
    EDUCATION_SOURCE_DATA.sourceLayout.worksheetIndex !== 1 ||
    !EDUCATION_SOURCE_DATA.sourceLayout.physicalRowsOneBased ||
    JSON.stringify(EDUCATION_SOURCE_DATA.sourceLayout.ageRows) !== JSON.stringify(EXPECTED_SOURCE_ROWS) ||
    JSON.stringify(EDUCATION_SOURCE_DATA.sourceLayout.fiveYearSummaryRows) !== JSON.stringify(EXPECTED_SUMMARY_ROWS) ||
    JSON.stringify(EDUCATION_SOURCE_DATA.sourceLayout.columnTriples) !== JSON.stringify(EXPECTED_SOURCE_COLUMNS) ||
    JSON.stringify(EDUCATION_SOURCE_DATA.sourceLayout.columnOrder) !== JSON.stringify(['total', 'male', 'female'])
  ) metadataIssues.push('sourceLayout')
  if (
    Object.keys(EDUCATION_SOURCE_DATA.categoryMapping).sort().join('|') !==
    [...EDUCATION_LEVELS].sort().join('|')
  ) metadataIssues.push('categoryMapping')
  if (JSON.stringify(EDUCATION_SOURCE_DATA.rows) !== JSON.stringify(EDUCATION_BY_AGE)) {
    metadataIssues.push('runtimeProjection')
  }
  if (JSON.stringify(EDUCATION_RUNTIME_DATA.columns) !== JSON.stringify(EXPECTED_RUNTIME_COLUMNS)) {
    metadataIssues.push('runtimeColumns')
  }
  if (
    EDUCATION_RUNTIME_DATA.rows.length !== MAX_MODEL_AGE - MIN_MODEL_AGE + 1 ||
    EDUCATION_RUNTIME_DATA.rows.some((row) =>
      row.length !== EXPECTED_RUNTIME_COLUMNS.length || row.some((value) => !Number.isInteger(value)),
    )
  ) metadataIssues.push('runtimeRows')

  return {
    valid:
      EDUCATION_BY_AGE.length === MAX_MODEL_AGE - MIN_MODEL_AGE + 1 &&
      EDUCATION_SOURCE_DATA.fiveYearChecks.length === 6 &&
      missingAges.length === 0 &&
      duplicateAges.length === 0 &&
      inconsistentSexTotals.length === 0 &&
      populationMismatches.length === 0 &&
      invalidCategoryBounds.length === 0 &&
      fiveYearMismatches.length === 0 &&
      metadataIssues.length === 0,
    rowCount: EDUCATION_BY_AGE.length,
    fiveYearChecks: EDUCATION_SOURCE_DATA.fiveYearChecks.length,
    missingAges,
    duplicateAges,
    inconsistentSexTotals,
    populationMismatches,
    invalidCategoryBounds,
    fiveYearMismatches,
    metadataIssues,
    totals,
  }
}
