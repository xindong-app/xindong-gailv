import { describe, expect, it } from 'vitest'
import { computeModel, ModelInputError } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'
import { populationWanAtAge, populationWanInRange, validatePopulationTable } from '../../src/data/population'

function selection(patch: Partial<ModelSelection> = {}): ModelSelection {
  return {
    ...DEFAULT_SELECTION,
    ...patch,
    target: { ...DEFAULT_SELECTION.target, ...patch.target },
    correlated: {
      ...DEFAULT_SELECTION.correlated,
      ...patch.correlated,
      housing: { ...DEFAULT_SELECTION.correlated.housing, ...patch.correlated?.housing },
      vehicle: { ...DEFAULT_SELECTION.correlated.vehicle, ...patch.correlated?.vehicle },
    },
    entertainment: { ...DEFAULT_SELECTION.entertainment, ...patch.entertainment },
  }
}

describe('runtime schema boundary', () => {
  it('rejects reversed ages and illegal enum values before calculation', () => {
    expect(() => computeModel(selection({ target: { ...DEFAULT_SELECTION.target, age: { min: 40, max: 20 } } }))).toThrow(ModelInputError)
    expect(() => computeModel({ ...DEFAULT_SELECTION, target: { ...DEFAULT_SELECTION.target, gender: 'other' } })).toThrow(ModelInputError)
    expect(() => computeModel({ ...DEFAULT_SELECTION, entertainment: { zodiacs: ['not-a-zodiac'], mbti: [] } })).toThrow(ModelInputError)
  })

  it('rejects 全国 mixed with a city and accepts both MBTI poles as an unconstrained axis', () => {
    expect(() => computeModel(selection({ target: { ...DEFAULT_SELECTION.target, cities: ['全国', '北京'] } }))).toThrow(ModelInputError)
    const result = computeModel(selection({ entertainment: { zodiacs: [], mbti: ['E', 'I'] } }))
    expect(result.comprehensivePopulation.modeledConditionIds).not.toContain('entertainment.mbti')
  })
})

describe('18–50 population coverage and conservation', () => {
  it('has a non-zero population anchor for every supported single age', () => {
    for (let age = 18; age <= 50; age += 1) expect(populationWanAtAge(age), `age ${age}`).toBeGreaterThan(0)
  })

  it('loads all 33 direct census rows with exact sex-total conservation', () => {
    expect(validatePopulationTable()).toEqual({
      valid: true,
      rowCount: 33,
      missingAges: [],
      duplicateAges: [],
      inconsistentTotals: [],
      totals: { total: 651_601_516, male: 336_846_860, female: 314_754_656 },
    })
  })

  it('makes age 50 calculable instead of silently returning zero', () => {
    const result = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 50, max: 50 }, maritalStatuses: [] },
    }))
    expect(result.population.base).toBeGreaterThan(1_000_000)
    expect(result.population.estimate).toBe(result.population.base)
  })

  it('preserves population under closed-interval partitioning', () => {
    const whole = populationWanInRange(18, 50)
    const partitioned = populationWanInRange(18, 29) + populationWanInRange(30, 39) + populationWanInRange(40, 50)
    expect(partitioned).toBeCloseTo(whole, 9)
  })
})

describe('population semantics', () => {
  it('treats no selected marital status as no marital filter', () => {
    const unrestricted = computeModel(DEFAULT_SELECTION)
    const neverMarried = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, maritalStatuses: ['never_married'] },
    }))
    expect(unrestricted.population.base).toBeGreaterThan(neverMarried.population.base)
    expect(unrestricted.groups[0].note).toContain('不限')
  })

  it('uses OR for mutually exclusive marital categories', () => {
    const neverMarried = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, maritalStatuses: ['never_married'] },
    }))
    const divorced = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, maritalStatuses: ['divorced'] },
    }))
    const union = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, maritalStatuses: ['never_married', 'divorced'] },
    }))
    expect(union.population.base).toBeCloseTo(neverMarried.population.base + divorced.population.base, 6)
  })

  it('grades five-year marital application B and unsupported edge borrowing C', () => {
    const supported = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 25, max: 29 }, maritalStatuses: ['never_married'] },
    }))
    const age18 = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 18, max: 19 }, maritalStatuses: ['never_married'] },
    }))
    const age50 = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 50, max: 50 }, maritalStatuses: ['never_married'] },
    }))
    expect(supported.groups[0].evidenceGrade).toBe('B')
    expect(supported.confidence.grade).toBe('B')
    expect(supported.population.range.conservative).toBeLessThan(supported.population.estimate)
    for (const boundary of [age18, age50]) {
      expect(boundary.groups[0].evidenceGrade).toBe('C')
      expect(boundary.confidence.grade).toBe('C')
      expect(boundary.groups[0].note).toContain('借用')
    }
  })

  it('migrates retired divorce child splits to one official divorced category', () => {
    const legacy = structuredClone(DEFAULT_SELECTION) as unknown as ModelSelection & {
      target: ModelSelection['target'] & { maritalStatuses: string[] }
    }
    legacy.target.maritalStatuses = ['divorced_no_children', 'divorced_with_children']
    const result = computeModel(legacy)
    expect(result.input.target.maritalStatuses).toEqual(['divorced'])
  })

  it('treats all mutually-exclusive body ranges as a union close to no filter', () => {
    const allBodyTypes = computeModel(selection({ correlated: {
      ...DEFAULT_SELECTION.correlated,
      bodyTypes: ['underweight', 'slim', 'balanced', 'standard', 'soft', 'full', 'round'],
    } }))
    expect(allBodyTypes.population.estimate / allBodyTypes.population.base).toBeGreaterThan(0.999)
  })

  it('never returns NaN, Infinity, negative people, or an inverted range', () => {
    const result = computeModel(selection({ correlated: {
      ...DEFAULT_SELECTION.correlated,
      minAnnualIncomeWan: 10_000,
      minHouseholdWealthWan: 1_000_000,
      housing: { required: true, location: 'core', minAreaSqm: 2_000, type: 'courtyard' },
      vehicle: { required: true, priceBands: ['over_100'] },
      educationLevels: ['doctorate'],
      smoking: 'non_smoker',
      drinking: 'none',
      healthCriteria: ['no_major_chronic'],
      hairCriteria: ['full_hair'],
    } }))
    const values = [result.population.base, result.population.estimate, ...Object.values(result.population.range)]
    expect(values.every((value) => Number.isFinite(value) && value >= 0)).toBe(true)
    expect(result.population.range.conservative).toBeLessThanOrEqual(result.population.range.baseline)
    expect(result.population.range.baseline).toBeLessThanOrEqual(result.population.range.optimistic)
    expect(result.population.status).toBe('upper_bound')
    expect(result.coverage.unquantifiedHardConditions.length).toBeGreaterThan(0)
    expect(result.population.display).toContain('未计入')
  })
})

describe('four dimension classes remain separated', () => {
  it('does not let many soft preferences alter population', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const soft = computeModel(selection({
      softPreferenceIds: [
        'lifestyle.exercise', 'lifestyle.sleep_rhythm', 'lifestyle.cooking',
        'family.only_child', 'family.parents_pension', 'career.in_system',
        'relationship.currently_single', 'relationship.orientation_compatible',
        'communication.conflict_repair', 'values.loyalty',
      ],
    }))
    expect(soft.population).toEqual(base.population)
    expect(soft.scoreDetails.selectedSoftPreferences).toBe(10)
  })

  it('does not let zodiac or MBTI alter population', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const entertainment = computeModel(selection({
      entertainment: { zodiacs: ['leo', 'aries', 'scorpio'], mbti: ['E', 'N', 'F', 'J'] },
    }))
    expect(entertainment.population).toEqual(base.population)
    expect(entertainment.scores.entertainment).toBeGreaterThan(0)
  })

  it('labels reciprocal preference overlap as an illustration, not love probability', () => {
    const result = computeModel(selection({
      softPreferenceIds: ['lifestyle.exercise', 'values.loyalty', 'communication.conflict_repair'],
      selfPreferenceIds: ['lifestyle.exercise', 'values.loyalty'],
    }))
    expect(result.scores.bidirectionalIllustration).toBeGreaterThan(0)
    expect(result.scoreDetails.disclaimer).toContain('不预测具体感情结果')
  })

  it('routes structured school, vision, and composite chronic-health selections into soft scoring, never population', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const input = selection({
      correlated: {
        ...DEFAULT_SELECTION.correlated,
        schoolTier: '985',
        healthCriteria: ['no_myopia', 'no_major_chronic'],
      },
      selfPreferenceIds: ['education.school', 'health.myopia', 'health.chronic'],
    })
    const result = computeModel(input)
    expect(result.population.estimate).toBe(base.population.estimate)
    expect(result.population.status).toBe('estimated')
    expect(result.scoreDetails.selectedSoftPreferences).toBe(3)
    expect(result.scoreDetails.overlappingPreferences).toBe(3)
    expect(result.scores.softMatch).toBe(100)

    const asHardRequirements = computeModel(input, {
      hardRequirementIds: ['education.school', 'health.myopia', 'health.chronic'],
    })
    expect(asHardRequirements.population.estimate).toBe(base.population.estimate)
    expect(asHardRequirements.population.status).toBe('upper_bound')
    expect(asHardRequirements.coverage.unquantifiedHardConditions.map((item) => item.dimensionId)).toEqual([
      'education.school',
      'health.chronic',
      'health.myopia',
    ])
  })
})

describe('correlation groups and explanations', () => {
  it('caps model confidence at the weakest active population evidence grade', () => {
    const heightOnly = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, heightCm: { min: 175, max: null } },
    }))
    const bodyOnly = computeModel(selection({
      correlated: { ...DEFAULT_SELECTION.correlated, bodyTypes: ['balanced'] },
    }))
    const smokingOnly = computeModel(selection({
      correlated: { ...DEFAULT_SELECTION.correlated, smoking: 'non_smoker' },
    }))

    expect(heightOnly.confidence.grade).toBe('C')
    expect(smokingOnly.confidence.grade).toBe('C')
    expect(bodyOnly.confidence.grade).toBe('A')
    expect(bodyOnly.population.status).toBe('upper_bound')
    expect(heightOnly.confidence.score).toBe(0.9)
    expect(heightOnly.explanation.join(' ')).toContain('敏感度范围')
    expect(heightOnly.explanation.join(' ')).toContain('不是抽样置信区间')
  })

  it('keeps economic hard requirements explicit but out of the main estimate', () => {
    const income = computeModel(selection({ correlated: { ...DEFAULT_SELECTION.correlated, minAnnualIncomeWan: 50 } }))
    const wealth = computeModel(selection({ correlated: { ...DEFAULT_SELECTION.correlated, minHouseholdWealthWan: 600 } }))
    const both = computeModel(selection({ correlated: {
      ...DEFAULT_SELECTION.correlated, minAnnualIncomeWan: 50, minHouseholdWealthWan: 600,
    } }))
    expect(income.population.estimate).toBe(income.population.base)
    expect(wealth.population.estimate).toBe(wealth.population.base)
    expect(both.population.estimate).toBe(both.population.base)
    expect(both.population.status).toBe('upper_bound')
    expect(both.coverage.unquantifiedHardConditions.map((item) => item.dimensionId))
      .toEqual(expect.arrayContaining(['economy.income', 'economy.wealth']))
  })

  it('does not mix an unquantified hair boundary into the quantified smoking result', () => {
    const smoke = computeModel(selection({ correlated: { ...DEFAULT_SELECTION.correlated, smoking: 'non_smoker' } }))
    const hair = computeModel(selection({ correlated: { ...DEFAULT_SELECTION.correlated, hairCriteria: ['full_hair'] } }))
    const both = computeModel(selection({ correlated: {
      ...DEFAULT_SELECTION.correlated, smoking: 'non_smoker', hairCriteria: ['full_hair'],
    } }))
    const pSmoke = smoke.groups.find((group) => group.id === 'health_body')!.factor
    const pBoth = both.groups.find((group) => group.id === 'health_body')!.factor
    expect(hair.population.estimate).toBe(hair.population.base)
    expect(hair.population.status).toBe('upper_bound')
    expect(pBoth).toBe(pSmoke)
    expect(both.coverage.unquantifiedHardConditions.map((item) => item.dimensionId)).toContain('appearance.hair_full')
  })

  it('weights drinking age bands over the selected single-age population', () => {
    const young = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 18, max: 24 } },
      correlated: { ...DEFAULT_SELECTION.correlated, drinking: 'not_regular' },
    }))
    const older = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 25, max: 44 } },
      correlated: { ...DEFAULT_SELECTION.correlated, drinking: 'not_regular' },
    }))
    const mixed = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, age: { min: 18, max: 44 } },
      correlated: { ...DEFAULT_SELECTION.correlated, drinking: 'not_regular' },
    }))
    const youngFactor = young.groups.find((group) => group.id === 'health_body')!.factor
    const olderFactor = older.groups.find((group) => group.id === 'health_body')!.factor
    const mixedFactor = mixed.groups.find((group) => group.id === 'health_body')!.factor
    expect(youngFactor).toBeGreaterThan(olderFactor)
    expect(mixedFactor).toBeGreaterThan(olderFactor)
    expect(mixedFactor).toBeLessThan(youngFactor)
  })

  it('provides ranked impacts and recomputed relaxation suggestions', () => {
    const result = computeModel(selection({
      target: { ...DEFAULT_SELECTION.target, heightCm: { min: 180, max: null } },
      correlated: {
        ...DEFAULT_SELECTION.correlated,
        minAnnualIncomeWan: 50,
        educationLevels: ['bachelor', 'master', 'doctorate'],
        housing: { required: true, location: null, minAreaSqm: null, type: null },
      },
    }))
    expect(result.impacts.length).toBeGreaterThanOrEqual(1)
    expect(result.impacts[0].marginalLoss).toBeGreaterThanOrEqual(result.impacts.at(-1)!.marginalLoss)
    expect(result.relaxations.every((item) => !['base.marital', 'appearance.body_type', 'economy.income', 'economy.house'].includes(item.dimensionId))).toBe(true)
  })
})
