import { describe, expect, it } from 'vitest'
import {
  EDUCATION_BY_AGE,
  educationRowAtAge,
  educationShareAtAge,
} from '../../src/data/education'
import { EDUCATION_SOURCE_DATA, validateEducationTable } from '../../src/data/education-validation'
import { nonSmokerRate } from '../../src/data/model'
import { populationPolicyForDimension } from '../../src/data/population-policy'
import { computeModel } from '../../src/engine/modelEngine'
import { DIMENSION_BY_ID } from '../../src/model/dimensions'
import {
  DEFAULT_SELECTION,
  EDUCATION_LEVELS,
  type EducationId,
  type GenderId,
  type ModelSelection,
} from '../../src/model/schema'
import { DATA_VERSION, MODEL_VERSION } from '../../src/model/versions'

function withEducation(
  levels: readonly EducationId[],
  mutate?: (selection: ModelSelection) => void,
): ModelSelection {
  const selection = structuredClone(DEFAULT_SELECTION)
  selection.correlated.educationLevels = [...levels]
  mutate?.(selection)
  return selection
}

describe('Seventh Census Table 4-1 education machine table', () => {
  it('keeps all 33 single-age rows, sex totals, population denominators, and six five-year checks exact', () => {
    const validation = validateEducationTable()
    expect(validation).toMatchObject({
      valid: true,
      rowCount: 33,
      fiveYearChecks: 6,
      missingAges: [],
      duplicateAges: [],
      inconsistentSexTotals: [],
      populationMismatches: [],
      invalidCategoryBounds: [],
      fiveYearMismatches: [],
      metadataIssues: [],
      totals: {
        junior_college: { total: 95_537_698, male: 48_639_724, female: 46_897_974 },
        bachelor: { total: 84_811_166, male: 41_664_044, female: 43_147_122 },
        master: { total: 8_876_188, male: 4_276_727, female: 4_599_461 },
        doctorate: { total: 1_141_683, male: 671_146, female: 470_537 },
      },
    })
    expect(EDUCATION_SOURCE_DATA.dataVersion).toBe(DATA_VERSION)
    expect(EDUCATION_SOURCE_DATA.sourceUrl).toBe(
      'https://www.stats.gov.cn/sj/pcsj/rkpc/7rp/zk/html/A0401.xls',
    )
    expect(EDUCATION_SOURCE_DATA.sourceSha256).toBe(
      '89E5B9E95471DB7BD0128BD99DF330CF054A5820C6CB5CDBD46F2C1283B91A95',
    )
    expect(EDUCATION_BY_AGE.map((row) => row.age)).toEqual(
      Array.from({ length: 33 }, (_, index) => index + 18),
    )
  })

  it('uses exact mutually-exclusive categories: empty means no filter and bachelor does not silently include graduate levels', () => {
    const age = 30
    const row = educationRowAtAge(age)
    expect(educationShareAtAge(age, 'male', [])).toBe(1)
    expect(educationShareAtAge(age, 'male', ['bachelor']))
      .toBe(row.bachelor.male / row.population.male)
    expect(educationShareAtAge(age, 'male', ['bachelor', 'master', 'doctorate']))
      .toBe((row.bachelor.male + row.master.male + row.doctorate.male) / row.population.male)
    expect(educationShareAtAge(age, 'male', ['bachelor']))
      .toBeLessThan(educationShareAtAge(age, 'male', ['bachelor', 'master', 'doctorate']))
  })

  it('reproduces every single-age, sex, and non-empty OR combination from the authoritative integers', () => {
    const combinations = Array.from({ length: (1 << EDUCATION_LEVELS.length) - 1 }, (_, index) =>
      EDUCATION_LEVELS.filter((_, bit) => ((index + 1) & (1 << bit)) !== 0),
    )
    for (const row of EDUCATION_BY_AGE) {
      for (const gender of ['male', 'female'] as const satisfies readonly GenderId[]) {
        for (const levels of combinations) {
          const numerator = levels.reduce((sum, level) => sum + row[level][gender], 0)
          expect(educationShareAtAge(row.age, gender, levels))
            .toBeCloseTo(numerator / row.population[gender], 14)
        }
      }
    }
  })
})

describe('education population runtime alignment', () => {
  it('routes education as an A-grade direct population estimate with a locked method', () => {
    const policy = populationPolicyForDimension('education.level')
    const dimension = DIMENSION_BY_ID.get('education.level')
    expect(policy).toMatchObject({
      status: 'included_estimate',
      mainEstimateEffect: 'apply',
      resultSemantics: 'estimate',
      scenarioMethod: 'education_age_sex_direct',
    })
    expect(dimension).toMatchObject({
      population: true,
      populationUse: 'included',
      evidenceGrade: 'A',
    })
  })

  it('reproduces an official single-age sex cell exactly and returns a point range when education is the only filter', () => {
    const row = educationRowAtAge(30)
    const result = computeModel(withEducation(['bachelor'], (selection) => {
      selection.target.gender = 'male'
      selection.target.age = { min: 30, max: 30 }
    }))
    expect(result.versions).toEqual({ modelVersion: MODEL_VERSION, dataVersion: DATA_VERSION })
    expect(result.population.base).toBeCloseTo(row.population.male, 6)
    expect(result.population.estimate).toBeCloseTo(row.bachelor.male, 6)
    expect(result.population.range).toMatchObject({
      conservative: expect.closeTo(row.bachelor.male, 6),
      baseline: expect.closeTo(row.bachelor.male, 6),
      optimistic: expect.closeTo(row.bachelor.male, 6),
    })
    expect(result.population.status).toBe('estimated')
    expect(result.coverage.includedHardConditions).toContain('education.level')
    expect(result.coverage.unquantifiedHardConditions).toEqual([])
    expect(result.groups.find((group) => group.dimensions.includes('education.level')))
      .toMatchObject({ id: 'socioeconomic', evidenceGrade: 'A' })
  })

  it('preserves OR monotonicity, age additivity, and sex-specific 18–50 totals', () => {
    const levels: EducationId[] = ['junior_college', 'bachelor', 'master', 'doctorate']
    const bachelor = computeModel(withEducation(['bachelor'], (selection) => {
      selection.target.age = { min: 18, max: 50 }
      selection.target.gender = 'male'
    })).population.estimate
    const expanded = computeModel(withEducation(levels, (selection) => {
      selection.target.age = { min: 18, max: 50 }
      selection.target.gender = 'male'
    })).population.estimate
    expect(expanded).toBeGreaterThan(bachelor)
    expect(expanded).toBeCloseTo(95_251_641, 5)

    const female = computeModel(withEducation(levels, (selection) => {
      selection.target.age = { min: 18, max: 50 }
      selection.target.gender = 'female'
    })).population.estimate
    expect(female).toBeCloseTo(95_115_094, 5)

    const whole = computeModel(withEducation(['bachelor', 'master', 'doctorate'], (selection) => {
      selection.target.age = { min: 18, max: 50 }
    })).population.estimate
    const parts = [[18, 29], [30, 39], [40, 50]].map(([min, max]) =>
      computeModel(withEducation(['bachelor', 'master', 'doctorate'], (selection) => {
        selection.target.age = { min, max }
      })).population.estimate,
    )
    expect(parts.reduce((sum, value) => sum + value, 0)).toBeCloseTo(whole, 5)
  })

  it('puts education into the same Frechet chain as another unjoined population margin', () => {
    const selection = withEducation(['bachelor'], (draft) => {
      draft.target.gender = 'male'
      draft.target.age = { min: 30, max: 30 }
      draft.correlated.smoking = 'non_smoker'
    })
    const population = educationRowAtAge(30).population.male
    const education = educationShareAtAge(30, 'male', ['bachelor'])
    const smoking = nonSmokerRate('male')
    const result = computeModel(selection)

    expect(result.population.estimate).toBeCloseTo(population * education * smoking, 5)
    expect(result.population.range.conservative)
      .toBeCloseTo(population * Math.max(0, education + smoking * 0.7 - 1), 5)
    expect(result.population.range.optimistic)
      .toBeCloseTo(population * Math.min(education, smoking * 1.3), 5)
  })

  it('applies education while keeping unsupported income out of the estimate and the result marked as an upper bound', () => {
    const educationOnly = computeModel(withEducation(['doctorate']))
    const withIncome = computeModel(withEducation(['doctorate'], (selection) => {
      selection.correlated.minAnnualIncomeWan = 100
    }))
    expect(withIncome.population.estimate).toBeCloseTo(educationOnly.population.estimate, 6)
    expect(withIncome.population.estimate).toBeLessThan(withIncome.population.base)
    expect(withIncome.population.status).toBe('upper_bound')
    expect(withIncome.coverage.includedHardConditions).toContain('education.level')
    expect(withIncome.coverage.unquantifiedHardConditions.map((item) => item.dimensionId)).toEqual([
      'economy.income',
    ])
  })
})
