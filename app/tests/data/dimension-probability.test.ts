import { describe, expect, it } from 'vitest'
import runtimeJson from '../../src/data/dimension-probability-runtime.json'
import { EDUCATION_BY_AGE } from '../../src/data/education'
import {
  estimateDimensionRetention,
  probabilityPolicyForDimension,
  type DimensionRetentionInput,
  type ProbabilityRange,
} from '../../src/data/dimension-probability'
import { validateDimensionProbabilityRegistry } from '../../src/data/dimension-probability-validation'
import { DIMENSION_REGISTRY } from '../../src/model/dimensions'

const modeledRange = (input: DimensionRetentionInput): ProbabilityRange => {
  const result = estimateDimensionRetention(input)
  expect(result.status).toBe('modeled')
  if (result.status !== 'modeled') throw new Error(`Expected modeled result for ${input.dimensionId}`)
  return result.range
}

const expectValidRange = (range: ProbabilityRange): void => {
  expect(Number.isFinite(range.lower)).toBe(true)
  expect(Number.isFinite(range.reference)).toBe(true)
  expect(Number.isFinite(range.upper)).toBe(true)
  expect(range.lower).toBeGreaterThanOrEqual(0)
  expect(range.lower).toBeLessThanOrEqual(range.reference)
  expect(range.reference).toBeLessThanOrEqual(range.upper)
  expect(range.upper).toBeLessThanOrEqual(1)
}

function canonicalInput(dimensionId: string): DimensionRetentionInput {
  const base: DimensionRetentionInput = {
    dimensionId,
    context: { targetGender: 'male', seekerGender: 'female', ageMin: 26, ageMax: 34 },
  }
  switch (dimensionId) {
    case 'appearance.body_type': return { ...base, selectedValues: ['balanced'] }
    case 'education.school': return { ...base, selectedValues: ['211'] }
    case 'economy.income': return { ...base, threshold: 10 }
    case 'economy.wealth': return { ...base, threshold: 100 }
    case 'economy.house': return { ...base, facets: { required: true } }
    case 'economy.vehicle': return { ...base, facets: { required: true }, selectedValues: ['10_20'] }
    case 'entertainment.zodiac': return { ...base, selectedValues: ['aries'] }
    case 'entertainment.mbti': return { ...base, selectedValues: ['E'] }
    default: return base
  }
}

describe('all-dimension probability registry', () => {
  it('covers every dimension, locks the 8 direct paths and synchronizes compact runtime', () => {
    const validation = validateDimensionProbabilityRegistry('2026-08-14')
    expect(validation).toMatchObject({
      valid: true,
      entryCount: 69,
      directCount: 8,
      modeledCount: 61,
      correlationGroupCount: 17,
      maxEntropyCount: 48,
      analystPriorCount: 60,
    })
    expect(validation.issues).toEqual([])
    expect(JSON.stringify(runtimeJson).length).toBeLessThan(10_000)
    for (const dimension of DIMENSION_REGISTRY) {
      expect(dimension.populationUse).toBe(
        probabilityPolicyForDimension(dimension.id)?.method === 'delegated_direct'
          ? 'included'
          : 'scenario',
      )
    }
  })

  it('treats direct education as a conditioning stratum instead of a repeated rho marginal', () => {
    expect(probabilityPolicyForDimension('education.level')).toMatchObject({
      basisType: 'direct',
      correlationGroup: 'education_attainment',
    })
    for (const dimensionId of ['education.school', 'economy.income', 'economy.wealth', 'economy.house', 'economy.vehicle']) {
      expect(probabilityPolicyForDimension(dimensionId).correlationGroup).toBe('economic_resources')
    }
  })

  it('returns a finite ordered range for all 61 modeled dimensions', () => {
    let direct = 0
    let modeled = 0
    for (const dimension of DIMENSION_REGISTRY) {
      expect(probabilityPolicyForDimension(dimension.id)?.dimensionId).toBe(dimension.id)
      const result = estimateDimensionRetention(canonicalInput(dimension.id))
      if (result.status === 'delegated_direct') direct += 1
      if (result.status === 'modeled') {
        modeled += 1
        expectValidRange(result.range)
      }
      expect(result.status).not.toBe('not_applied')
    }
    expect({ direct, modeled }).toEqual({ direct: 8, modeled: 61 })
  })

  it('fails unknown IDs closed and treats explicitly inactive input as unselected', () => {
    expect(estimateDimensionRetention({ dimensionId: 'unknown' })).toEqual({
      status: 'not_applied', reason: 'unknown_dimension',
    })
    expect(estimateDimensionRetention({ dimensionId: 'values.loyalty', active: false })).toEqual({
      status: 'not_applied', reason: 'inactive',
    })
  })

  it('keeps definition-gap inputs honest instead of promoting them to direct evidence', () => {
    expect(probabilityPolicyForDimension('appearance.dental_neatness')).toMatchObject({
      basisType: 'max_entropy', grade: 'NA', correlationGroup: 'health_body',
    })
    expect(probabilityPolicyForDimension('lifestyle.exercise')).toMatchObject({
      basisType: 'proxy', grade: 'C', correlationGroup: 'health_body',
    })
    expect(probabilityPolicyForDimension('career.in_system')).toMatchObject({
      basisType: 'max_entropy', grade: 'D', correlationGroup: 'economic_resources',
    })
    expect(probabilityPolicyForDimension('relationship.currently_single')).toMatchObject({
      basisType: 'analyst_model', grade: 'NA', correlationGroup: 'relationship_availability',
    })
  })
})

describe('probability invariants', () => {
  it('computes extreme lognormal tails without cancellation to a false zero', () => {
    const wealth = modeledRange({
      dimensionId: 'economy.wealth',
      threshold: 1_000_000,
      context: { targetGender: 'male', ageMin: 26, ageMax: 34 },
    })
    expect(wealth.lower).toBeGreaterThan(0)
    expect(wealth.reference).toBeGreaterThan(0)
    expect(wealth.upper).toBeGreaterThan(0)
  })

  it.each(['economy.income', 'economy.wealth'])('%s retention never rises when its threshold tightens', (dimensionId) => {
    const thresholds = [0, 5, 10, 20, 50, 100, 500]
    const scenarios = thresholds.map((threshold) => modeledRange({
      dimensionId,
      threshold,
      context: { targetGender: 'male', ageMin: 26, ageMax: 34 },
    }))
    for (let index = 1; index < scenarios.length; index += 1) {
      expect(scenarios[index].lower).toBeLessThanOrEqual(scenarios[index - 1].lower)
      expect(scenarios[index].reference).toBeLessThanOrEqual(scenarios[index - 1].reference)
      expect(scenarios[index].upper).toBeLessThanOrEqual(scenarios[index - 1].upper)
    }
  })

  it('gates income on official age-sex employment rates before the employed-income tail', () => {
    const nearZeroIncome = (age: number, targetGender: 'male' | 'female') => modeledRange({
      dimensionId: 'economy.income',
      threshold: 1e-9,
      context: { targetGender, ageMin: age, ageMax: age },
    })

    expect(nearZeroIncome(30, 'male').reference).toBeCloseTo(0.910832, 12)
    expect(nearZeroIncome(30, 'female').reference).toBeCloseTo(0.698434, 12)
    expect(nearZeroIncome(30, 'female').reference)
      .toBeLessThan(nearZeroIncome(30, 'male').reference)
  })

  it('uses disclosed census boundary proxies for ages 18-19 and 50', () => {
    const nearZeroIncome = (age: number, targetGender: 'male' | 'female') => modeledRange({
      dimensionId: 'economy.income',
      threshold: 1e-9,
      context: { targetGender, ageMin: age, ageMax: age },
    })

    expect(nearZeroIncome(18, 'male').reference).toBeCloseTo(0.146405, 12)
    expect(nearZeroIncome(19, 'male').reference).toBeCloseTo(0.146405, 12)
    expect(nearZeroIncome(20, 'male').reference).toBeCloseTo(0.584315, 12)
    expect(nearZeroIncome(50, 'male').reference).toBeCloseTo(0.837671, 12)
    expect(nearZeroIncome(50, 'female').reference).toBeCloseTo(0.523187, 12)
  })

  it('weights income by direct age-sex-education counts so widening the education OR cannot remove people', () => {
    const scenarios = [
      ['bachelor'],
      ['junior_college', 'bachelor'],
      ['junior_college', 'bachelor', 'master'],
      ['junior_college', 'bachelor', 'master', 'doctorate'],
    ]
    const retainedCounts = scenarios.map((levels) => {
      const population = EDUCATION_BY_AGE
        .filter((row) => row.age >= 26 && row.age <= 34)
        .reduce((sum, row) => sum + levels.reduce(
          (levelSum, level) => levelSum + row[level as 'junior_college' | 'bachelor' | 'master' | 'doctorate'].male,
          0,
        ), 0)
      const range = modeledRange({
        dimensionId: 'economy.income',
        threshold: 10,
        context: { targetGender: 'male', ageMin: 26, ageMax: 34, educationLevels: levels },
      })
      return population * range.reference
    })
    for (let index = 1; index < retainedCounts.length; index += 1) {
      expect(retainedCounts[index]).toBeGreaterThanOrEqual(retainedCounts[index - 1])
    }
  })

  it('treats body-type OR as a union and all seven labels as no filter', () => {
    const one = modeledRange({
      dimensionId: 'appearance.body_type', selectedValues: ['balanced'],
      context: { targetGender: 'female', ageMid: 30 },
    })
    const two = modeledRange({
      dimensionId: 'appearance.body_type', selectedValues: ['balanced', 'standard'],
      context: { targetGender: 'female', ageMid: 30 },
    })
    const all = modeledRange({
      dimensionId: 'appearance.body_type',
      selectedValues: ['underweight', 'slim', 'balanced', 'standard', 'soft', 'full', 'round'],
      context: { targetGender: 'female', ageMid: 30 },
    })
    expect(two.reference).toBeGreaterThan(one.reference)
    expect(all).toEqual({ lower: 1, reference: 1, upper: 1 })
  })

  it('uses mean-calendar-day zodiac shares and makes all twelve signs neutral', () => {
    const aries = modeledRange({ dimensionId: 'entertainment.zodiac', selectedValues: ['aries'] })
    expect(aries.reference).toBeCloseTo(30 / 365.2425, 12)
    const all = modeledRange({
      dimensionId: 'entertainment.zodiac',
      selectedValues: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
    })
    expect(all).toEqual({ lower: 1, reference: 1, upper: 1 })
  })

  it('uses one half per constrained MBTI axis and treats both poles as an unconstrained axis', () => {
    expect(modeledRange({ dimensionId: 'entertainment.mbti', selectedValues: ['E'] }).reference).toBe(0.5)
    expect(modeledRange({ dimensionId: 'entertainment.mbti', selectedValues: ['E', 'S', 'T', 'J'] }).reference).toBe(1 / 16)
    expect(modeledRange({ dimensionId: 'entertainment.mbti', selectedValues: ['E', 'I'] })).toEqual({
      lower: 1, reference: 1, upper: 1,
    })
  })

  it('reuses the four relationship pairing scenarios and remains explicitly wide without seeker gender', () => {
    expect(modeledRange({
      dimensionId: 'relationship.orientation_compatible',
      context: { seekerGender: 'male', targetGender: 'male' },
    })).toEqual({ lower: 0.016, reference: 0.035, upper: 0.075 })
    expect(modeledRange({
      dimensionId: 'relationship.orientation_compatible',
      context: { targetGender: 'female' },
    })).toEqual({ lower: 0.004, reference: 0.5, upper: 0.995 })
  })

  it('does not ignore nested house or vehicle choices when required=false', () => {
    expect(modeledRange({
      dimensionId: 'economy.house',
      facets: { required: false, location: 'core' },
    }).reference).toBeLessThan(1)
    expect(modeledRange({
      dimensionId: 'economy.vehicle',
      selectedValues: ['over_100'],
      facets: { required: false },
    }).reference).toBeLessThan(1)
  })
})
