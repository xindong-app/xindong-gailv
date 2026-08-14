import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { computeModel, ModelOptionsError } from '../../src/engine/modelEngine'
import {
  BODY_TYPES,
  DEFAULT_SELECTION,
  SOFT_PREFERENCE_IDS,
  ZODIACS,
  type ModelSelection,
  type SoftPreferenceId,
} from '../../src/model/schema'

function selection(mutator?: (draft: ModelSelection) => void): ModelSelection {
  const draft = structuredClone(DEFAULT_SELECTION)
  mutator?.(draft)
  return draft
}

function expectAdditive(union: number, parts: readonly number[]): void {
  const sum = parts.reduce((total, value) => total + value, 0)
  const tolerance = Math.max(1e-8, Math.abs(sum) * 1e-10)
  expect(Math.abs(union - sum)).toBeLessThanOrEqual(tolerance)
}

function activateWeakDimension(dimensionId: string): ModelSelection {
  return selection((draft) => {
    switch (dimensionId) {
      case 'appearance.body_type': draft.correlated.bodyTypes = ['balanced']; break
      case 'education.school': draft.correlated.schoolTier = '985'; break
      case 'economy.income': draft.correlated.minAnnualIncomeWan = 20; break
      case 'economy.wealth': draft.correlated.minHouseholdWealthWan = 500; break
      case 'economy.house': draft.correlated.housing.required = true; break
      case 'economy.vehicle': draft.correlated.vehicle.required = true; break
      case 'health.chronic': draft.correlated.healthCriteria = ['no_major_chronic']; break
      case 'health.myopia': draft.correlated.healthCriteria = ['no_myopia']; break
      case 'appearance.hair_full': draft.correlated.hairCriteria = ['full_hair']; break
      case 'entertainment.zodiac': draft.entertainment.zodiacs = ['aries']; break
      case 'entertainment.mbti': draft.entertainment.mbti = ['E']; break
      default: draft.softPreferenceIds = [dimensionId as SoftPreferenceId]
    }
  })
}

const structuredWeakIds = [
  'appearance.body_type',
  'economy.income',
  'economy.wealth',
  'economy.house',
  'economy.vehicle',
  'appearance.hair_full',
  'entertainment.zodiac',
  'entertainment.mbti',
] as const

const allWeakIds = [...new Set<string>([
  ...structuredWeakIds,
  ...SOFT_PREFERENCE_IDS,
])]

describe('v4 comprehensive population coverage', () => {
  it('keeps the reliable population unchanged when no scenario-only dimension is selected', () => {
    const result = computeModel(DEFAULT_SELECTION)
    expect(result.comprehensivePopulation.estimate).toBe(result.population.estimate)
    expect(result.comprehensivePopulation.range).toEqual(result.population.range)
    expect(result.comprehensivePopulation.modeledConditionCount).toBe(0)
    expect(result.comprehensivePopulation.directConditionIds).toEqual([
      'base.gender',
      'base.age',
      'base.region',
    ])
  })

  it('delegates all eight evidence-strong dimensions and adjusts a same-group direct joint only once', () => {
    const input = selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
      draft.target.maritalStatuses = ['never_married']
      draft.target.heightCm = { min: 165, max: 195 }
      draft.correlated.educationLevels = ['junior_college', 'bachelor', 'master', 'doctorate']
      draft.correlated.smoking = 'non_smoker'
      draft.correlated.drinking = 'not_regular'
    })
    const result = computeModel(input)
    expect(result.comprehensivePopulation.directConditionIds).toHaveLength(8)
    expect(result.comprehensivePopulation.modeledConditionIds).toEqual([])
    expect(result.comprehensivePopulation.estimate).toBeGreaterThan(result.population.estimate)
    expect(result.comprehensivePopulation.range.conservative).toBe(result.population.range.conservative)
    expect(result.comprehensivePopulation.range.optimistic).toBe(result.population.range.optimistic)
  })

  it.each(allWeakIds)('makes an explicitly selected weak dimension effective: %s', (dimensionId) => {
    const result = computeModel(activateWeakDimension(dimensionId), {
      seekerGender: dimensionId === 'relationship.orientation_compatible' ? 'male' : undefined,
    })
    expect(result.comprehensivePopulation.modeledConditionIds).toContain(dimensionId)
    expect(result.comprehensivePopulation.estimate).toBeLessThan(result.population.estimate)
    const factor = result.comprehensivePopulation.factors.find((item) => item.dimensionId === dimensionId)
    expect(factor).toBeDefined()
    expect(factor?.probability.conservative).toBeLessThanOrEqual(factor?.probability.baseline ?? 0)
    expect(factor?.probability.baseline).toBeLessThanOrEqual(factor?.probability.optimistic ?? 0)
  })

  it('never treats reciprocal self answers as population filters', () => {
    const withoutSelf = computeModel(DEFAULT_SELECTION)
    const withSelf = computeModel(selection((draft) => {
      draft.selfPreferenceIds = [...SOFT_PREFERENCE_IDS]
    }))
    expect(withSelf.comprehensivePopulation).toEqual(withoutSelf.comprehensivePopulation)
  })

  it('does not count semantically neutral legal selections as active filters', () => {
    const result = computeModel(selection((draft) => {
      draft.target.heightCm = { min: null, max: null }
      draft.correlated.bodyTypes = [...BODY_TYPES]
      draft.correlated.minAnnualIncomeWan = 0
      draft.correlated.minHouseholdWealthWan = 0
      draft.entertainment.zodiacs = [...ZODIACS]
      draft.entertainment.mbti = ['E', 'I']
    }))
    expect(result.comprehensivePopulation.estimate).toBe(result.population.estimate)
    expect(result.comprehensivePopulation.activeConditionCount).toBe(3)
    expect(result.comprehensivePopulation.directConditionIds).toEqual([
      'base.gender', 'base.age', 'base.region',
    ])
    expect(result.comprehensivePopulation.modeledConditionIds).toEqual([])
    expect(result.comprehensivePopulation.assumptionCount).toBe(0)
    expect(result.population.status).toBe('estimated')
    expect(result.coverage.unquantifiedHardConditions).toEqual([])
  })

  it('returns every non-selection option needed to reproduce the result', () => {
    const defaultResult = computeModel(DEFAULT_SELECTION)
    expect(computeModel(defaultResult.input, defaultResult.computationContext).population)
      .toEqual(defaultResult.population)

    const result = computeModel(selection((draft) => {
      draft.softPreferenceIds = ['relationship.orientation_compatible']
    }), {
      seekerGender: 'male',
      hardRequirementIds: ['relationship.orientation_compatible'],
    })
    expect(result.computationContext).toEqual({
      seekerGender: 'male',
      hardRequirementIds: ['relationship.orientation_compatible'],
    })
    const replay = computeModel(result.input, result.computationContext)
    expect(replay.comprehensivePopulation).toEqual(result.comprehensivePopulation)
    expect(replay.population).toEqual(result.population)
  })

  it('defines generic toggles as compatibility events rather than observed trait rates', () => {
    const factor = computeModel(selection((draft) => {
      draft.softPreferenceIds = ['values.loyalty']
    })).comprehensivePopulation.factors[0]
    expect(factor.eventDefinition).toContain('自定义要求')
    expect(factor.eventDefinition).toContain('不记录具体方向或阈值')
    expect(factor.basisType).toBe('max_entropy')
    expect(factor.eventStatus).toBe('generic_binary_prior')
    expect(computeModel(selection((draft) => {
      draft.softPreferenceIds = ['values.loyalty']
    })).comprehensivePopulation).toMatchObject({
      interpretation: 'prior_sensitivity_only',
      genericPriorConditionIds: ['values.loyalty'],
      identifiedConditionCount: 3,
    })
  })

  it('keeps structured toggle events identifiable and binds the evidence-catalog lineage', () => {
    const result = computeModel(selection((draft) => {
      draft.correlated.hairCriteria = ['full_hair']
    })).comprehensivePopulation
    expect(result.interpretation).toBe('identified_scenario')
    expect(result.factors[0].eventStatus).toBe('identified')
    expect(result.factors[0].eventDefinition).toContain('无雄激素性脱发')
    expect(result.evidenceCatalog).toEqual({
      modelVersion: '3.1.0',
      dataVersion: '2026.08.14.2',
    })
  })

  it('keeps structured soft IDs identified and generic duplicates from creating false logical zeros', () => {
    const structured = computeModel(selection((draft) => {
      draft.correlated.schoolTier = '985'
      draft.softPreferenceIds = ['education.school']
    })).comprehensivePopulation
    expect(structured.factors.find((factor) => factor.dimensionId === 'education.school')?.eventStatus)
      .toBe('identified')
    expect(structured.interpretation).toBe('identified_scenario')

    const generic = computeModel(selection((draft) => {
      draft.correlated.educationLevels = ['junior_college']
      draft.softPreferenceIds = ['education.school']
    })).comprehensivePopulation
    expect(generic.zeroMeaning).not.toBe('logical_zero')
    expect(generic.interpretation).toBe('prior_sensitivity_only')
  })
})

describe('v4 set and monotonicity semantics', () => {
  it('preserves bounded monotonicity for randomized subsets of weak preferences', () => {
    const preference = fc.constantFrom(...SOFT_PREFERENCE_IDS)
    fc.assert(fc.property(
      fc.uniqueArray(preference, { maxLength: 20 }),
      preference,
      (selected, additional) => {
        const base = computeModel(selection((draft) => {
          draft.softPreferenceIds = [...selected]
        }), { seekerGender: 'male' }).comprehensivePopulation
        const stricter = computeModel(selection((draft) => {
          draft.softPreferenceIds = [...new Set([...selected, additional])]
        }), { seekerGender: 'male' }).comprehensivePopulation
        expect(stricter.estimate).toBeLessThanOrEqual(base.estimate + 1e-8)
        expect(stricter.range.conservative).toBeGreaterThanOrEqual(0)
        expect(stricter.range.conservative).toBeLessThanOrEqual(stricter.estimate)
        expect(stricter.range.optimistic).toBeGreaterThanOrEqual(stricter.estimate)
        expect(stricter.range.optimistic).toBeLessThanOrEqual(stricter.scopeCeiling)
      },
    ), { numRuns: 100 })
  })

  it('uses OR within categorical dimensions and returns to neutral for exhaustive selections', () => {
    const body = (values: ModelSelection['correlated']['bodyTypes']) => computeModel(selection((draft) => {
      draft.correlated.bodyTypes = [...values]
    })).comprehensivePopulation.estimate
    expect(body(['balanced', 'standard'])).toBeGreaterThan(body(['balanced']))
    expect(body([...BODY_TYPES])).toBe(computeModel(DEFAULT_SELECTION).population.estimate)

    const zodiac = (values: ModelSelection['entertainment']['zodiacs']) => computeModel(selection((draft) => {
      draft.entertainment.zodiacs = [...values]
    })).comprehensivePopulation.estimate
    expect(zodiac(['aries', 'taurus'])).toBeGreaterThan(zodiac(['aries']))
    expect(zodiac([...ZODIACS])).toBe(computeModel(DEFAULT_SELECTION).population.estimate)

    const mbti = (values: ModelSelection['entertainment']['mbti']) => computeModel(selection((draft) => {
      draft.entertainment.mbti = [...values]
    })).comprehensivePopulation.estimate
    expect(mbti(['E', 'S'])).toBeLessThan(mbti(['E']))
    expect(mbti(['E', 'S', 'T', 'J'])).toBeLessThan(mbti(['E', 'S']))
  })

  it('never increases the estimate when a numeric threshold becomes stricter', () => {
    const income = [5, 10, 20, 50, 100].map((threshold) => computeModel(selection((draft) => {
      draft.correlated.minAnnualIncomeWan = threshold
    })).comprehensivePopulation.estimate)
    const wealth = [50, 100, 500, 1_000, 5_000].map((threshold) => computeModel(selection((draft) => {
      draft.correlated.minHouseholdWealthWan = threshold
    })).comprehensivePopulation.estimate)
    const area = [40, 60, 90, 120, 180].map((threshold) => computeModel(selection((draft) => {
      // A nested constraint itself implies access to a qualifying home.
      draft.correlated.housing.required = false
      draft.correlated.housing.minAreaSqm = threshold
    })).comprehensivePopulation.estimate)
    for (const values of [income, wealth, area]) {
      for (let index = 1; index < values.length; index += 1) {
        expect(values[index]).toBeLessThanOrEqual(values[index - 1])
      }
    }
  })

  it('widens a vehicle OR set even when the generic required switch is off', () => {
    const estimate = (priceBands: ModelSelection['correlated']['vehicle']['priceBands']) => computeModel(selection((draft) => {
      draft.correlated.vehicle.required = false
      draft.correlated.vehicle.priceBands = [...priceBands]
    })).comprehensivePopulation.estimate
    expect(estimate(['under_10'])).toBeLessThan(estimate(['under_10', '10_20']))
    expect(estimate(['under_10'])).toBeLessThan(computeModel(DEFAULT_SELECTION).population.estimate)
  })

  it('is order-independent inside a correlated cluster and does not use naive full multiplication', () => {
    const ids = [
      'communication.frequency',
      'communication.conflict_repair',
      'communication.emotional_expression',
      'communication.alone_time',
    ] as const
    const forward = computeModel(selection((draft) => {
      draft.softPreferenceIds = [...ids]
    })).comprehensivePopulation
    const reverse = computeModel(selection((draft) => {
      draft.softPreferenceIds = [...ids].reverse()
    })).comprehensivePopulation
    expect(reverse.estimate).toBeCloseTo(forward.estimate, 9)
    const retention = forward.estimate / forward.base
    expect(retention).toBeGreaterThan(0.5 ** ids.length)
    expect(retention).toBeLessThan(0.5)
  })

  it('conditions weak health factors on reliable smoking instead of multiplying the layers independently', () => {
    const smoking = computeModel(selection((draft) => {
      draft.correlated.smoking = 'non_smoker'
    })).comprehensivePopulation
    const chronic = computeModel(selection((draft) => {
      draft.correlated.healthCriteria = ['no_major_chronic']
    })).comprehensivePopulation
    const combined = computeModel(selection((draft) => {
      draft.correlated.smoking = 'non_smoker'
      draft.correlated.healthCriteria = ['no_major_chronic']
    })).comprehensivePopulation
    const universe = computeModel(DEFAULT_SELECTION).population.estimate
    const independent = (smoking.estimate / universe) * (chronic.estimate / universe)
    const actual = combined.estimate / universe
    expect(actual).toBeGreaterThan(independent)
    expect(actual).toBeLessThan(Math.min(
      smoking.estimate / universe,
      chronic.estimate / universe,
    ))
  })

  it('does not mechanically multiply reliable smoking and drinking inside the same health group', () => {
    const universe = computeModel(DEFAULT_SELECTION).population.estimate
    const smoking = computeModel(selection((draft) => {
      draft.correlated.smoking = 'non_smoker'
    })).comprehensivePopulation.estimate / universe
    const drinking = computeModel(selection((draft) => {
      draft.correlated.drinking = 'not_regular'
    })).comprehensivePopulation.estimate / universe
    const combined = computeModel(selection((draft) => {
      draft.correlated.smoking = 'non_smoker'
      draft.correlated.drinking = 'not_regular'
    })).comprehensivePopulation
    const retention = combined.estimate / universe
    expect(combined.modeledConditionCount).toBe(0)
    expect(retention).toBeGreaterThan(smoking * drinking)
    expect(retention).toBeLessThan(Math.min(smoking, drinking))
  })

  it('preserves education-union additivity while income is conditioned per education cell', () => {
    const result = (levels: ModelSelection['correlated']['educationLevels']) => computeModel(selection((draft) => {
      draft.correlated.educationLevels = [...levels]
      draft.correlated.minAnnualIncomeWan = 20
    })).comprehensivePopulation
    const junior = result(['junior_college'])
    const bachelor = result(['bachelor'])
    const union = result(['junior_college', 'bachelor'])
    expect(union.estimate).toBeCloseTo(junior.estimate + bachelor.estimate, 6)
    expect(union.range.conservative).toBeCloseTo(
      junior.range.conservative + bachelor.range.conservative,
      6,
    )
    expect(union.range.optimistic).toBeCloseTo(
      junior.range.optimistic + bachelor.range.optimistic,
      6,
    )
  })

  it('conditions an elite-school share inside education cells instead of multiplying the education rate twice', () => {
    const schoolOnly = computeModel(selection((draft) => {
      draft.correlated.schoolTier = '985'
    })).comprehensivePopulation
    const allHigherEducation = computeModel(selection((draft) => {
      draft.correlated.schoolTier = '985'
      draft.correlated.educationLevels = ['junior_college', 'bachelor', 'master', 'doctorate']
    })).comprehensivePopulation
    expect(allHigherEducation.estimate).toBeCloseTo(schoolOnly.estimate, 6)
    expect(allHigherEducation.estimate).not.toBeCloseTo(
      schoolOnly.estimate * (allHigherEducation.base / schoolOnly.base),
      2,
    )
  })

  it('never lets an elite-school subset exceed its higher-education mother set at any age', () => {
    for (const gender of ['male', 'female'] as const) {
      for (let age = 18; age <= 50; age += 1) {
        for (const schoolTier of ['top2', 'c9', '985', '211'] as const) {
          const schoolOnly = computeModel(selection((draft) => {
            draft.target.gender = gender
            draft.target.age = { min: age, max: age }
            draft.correlated.schoolTier = schoolTier
          })).comprehensivePopulation
          const higherMother = computeModel(selection((draft) => {
            draft.target.gender = gender
            draft.target.age = { min: age, max: age }
            draft.correlated.educationLevels = ['bachelor', 'master', 'doctorate']
          })).comprehensivePopulation
          const conditioned = computeModel(selection((draft) => {
            draft.target.gender = gender
            draft.target.age = { min: age, max: age }
            draft.correlated.educationLevels = ['bachelor', 'master', 'doctorate']
            draft.correlated.schoolTier = schoolTier
          })).comprehensivePopulation
          expect(schoolOnly.estimate).toBeLessThanOrEqual(higherMother.estimate + 1e-8)
          expect(schoolOnly.range.optimistic).toBeLessThanOrEqual(higherMother.range.optimistic + 1e-8)
          expect(conditioned.estimate).toBeCloseTo(schoolOnly.estimate, 6)
          expect(conditioned.range.conservative).toBeCloseTo(schoolOnly.range.conservative, 6)
          expect(conditioned.range.optimistic).toBeCloseTo(schoolOnly.range.optimistic, 6)
        }
      }
    }
  })

  it('preserves the elite-school subset relation after income or wealth conditions are added', () => {
    for (const economicDimension of ['income', 'wealth'] as const) {
      const result = (school: boolean) => computeModel(selection((draft) => {
        draft.target.gender = 'male'
        draft.target.age = { min: 50, max: 50 }
        draft.correlated.schoolTier = school ? '211' : null
        draft.correlated.educationLevels = school ? [] : ['bachelor', 'master', 'doctorate']
        if (economicDimension === 'income') draft.correlated.minAnnualIncomeWan = 20
        else draft.correlated.minHouseholdWealthWan = 500
      })).comprehensivePopulation
      const schoolSubset = result(true)
      const higherEducationMother = result(false)
      expect(schoolSubset.estimate).toBeLessThanOrEqual(higherEducationMother.estimate + 1e-8)
      expect(schoolSubset.range.conservative)
        .toBeLessThanOrEqual(higherEducationMother.range.conservative + 1e-8)
      expect(schoolSubset.range.optimistic)
        .toBeLessThanOrEqual(higherEducationMother.range.optimistic + 1e-8)
    }
  })

  it('keeps all three income endpoints monotone when any education subset is added', () => {
    const ageBands = [[18, 19], [20, 24], [25, 29], [30, 34], [35, 39], [40, 44], [45, 49], [50, 50]] as const
    const levels = ['junior_college', 'bachelor', 'master', 'doctorate'] as const
    for (const gender of ['male', 'female'] as const) {
      for (const [min, max] of ageBands) {
        for (const threshold of [1e-9, 5, 20, 100]) {
          const result = (educationLevels: ModelSelection['correlated']['educationLevels']) => computeModel(selection((draft) => {
            draft.target.gender = gender
            draft.target.age = { min, max }
            draft.correlated.minAnnualIncomeWan = threshold
            draft.correlated.educationLevels = [...educationLevels]
          })).comprehensivePopulation
          const incomeOnly = result([])
          for (const level of levels) {
            const subset = result([level])
            expect(subset.range.conservative).toBeLessThanOrEqual(incomeOnly.range.conservative + 1e-8)
            expect(subset.estimate).toBeLessThanOrEqual(incomeOnly.estimate + 1e-8)
            expect(subset.range.optimistic).toBeLessThanOrEqual(incomeOnly.range.optimistic + 1e-8)
          }
        }
      }
    }
  })

  it('preserves the reference estimate across disjoint height ranges when a BMI proxy is active', () => {
    const result = (min: number, max: number) => computeModel(selection((draft) => {
      draft.target.heightCm = { min, max }
      draft.correlated.bodyTypes = ['balanced']
    })).comprehensivePopulation
    const lower = result(160, 169)
    const upper = result(170, 179)
    const union = result(160, 179)
    expect(union.estimate).toBeCloseTo(lower.estimate + upper.estimate, 6)
  })

  it('labels an extreme positive wealth tail as below resolution, never as a logical zero', () => {
    const result = computeModel(selection((draft) => {
      draft.correlated.minHouseholdWealthWan = 1_000_000
    })).comprehensivePopulation
    expect(result.estimate).toBeGreaterThan(0)
    expect(result.range.conservative).toBeGreaterThan(0)
    expect(result.zeroMeaning).toBe('positive_below_resolution')
  })

  it('keeps a positive female height tail numerically positive', () => {
    const result = computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.age = { min: 18, max: 18 }
      draft.target.heightCm = { min: 219, max: 220 }
    }))
    expect(result.population.estimate).toBeGreaterThan(0)
    expect(result.comprehensivePopulation.estimate).toBeGreaterThan(0)
    expect(result.comprehensivePopulation.zeroMeaning).toBe('positive_below_resolution')
  })

  it('treats a missing height endpoint as open rather than clipping it to the slider edge', () => {
    const result = (maximum: number | null) => computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.age = { min: 18, max: 18 }
      draft.target.heightCm = { min: 219, max: maximum }
    })).population
    const openEnded = result(null)
    const through220 = result(220)
    expect(openEnded.estimate).toBeGreaterThanOrEqual(through220.estimate)
    expect(openEnded.range.conservative).toBeGreaterThanOrEqual(through220.range.conservative)
    expect(openEnded.range.optimistic).toBeGreaterThanOrEqual(through220.range.optimistic)
  })

  it('keeps logical-zero fields and display semantics consistent', () => {
    const result = computeModel(selection((draft) => {
      draft.correlated.educationLevels = ['junior_college']
      draft.correlated.schoolTier = '985'
    })).comprehensivePopulation
    expect(result.estimate).toBe(0)
    expect(result.zeroMeaning).toBe('logical_zero')
    expect(result.display).toContain('逻辑空集')
    expect(result.displayShort).toContain('0 人')
  })

  it('uses the published female AGA age bands instead of a fixed all-age rate', () => {
    const hair = (age: number) => computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.age = { min: age, max: age }
      draft.correlated.hairCriteria = ['full_hair']
    })).comprehensivePopulation.factors.find(
      (factor) => factor.dimensionId === 'appearance.hair_full',
    )?.probability
    expect(hair(18)?.baseline).toBeCloseTo(0.987, 12)
    expect(hair(50)?.baseline).toBeCloseTo(0.925, 12)
    expect(hair(18)?.baseline).toBeGreaterThan(hair(50)?.baseline ?? 1)
  })

  it('reports correlation priors and dynamically labels the no-seeker orientation fallback', () => {
    const health = computeModel(selection((draft) => {
      draft.correlated.smoking = 'non_smoker'
      draft.correlated.drinking = 'not_regular'
    })).comprehensivePopulation
    expect(health.correlationScenarios).toContainEqual(expect.objectContaining({
      group: 'health_body',
      activeDimensionIds: ['lifestyle.drinking', 'lifestyle.smoking'],
    }))
    expect(health.assumptionCount).toBeGreaterThanOrEqual(1)

    const fallback = computeModel(selection((draft) => {
      draft.softPreferenceIds = ['relationship.orientation_compatible']
    })).comprehensivePopulation.factors[0]
    expect(fallback.basisType).toBe('max_entropy')
    expect(fallback.evidenceGrade).toBe('NA')
    expect(fallback.evidenceIds).toEqual([])
  })

  it('correlates settlement with relationship goals and shared activities with lifestyle activities', () => {
    const retention = (ids: SoftPreferenceId[]) => {
      const result = computeModel(selection((draft) => {
        draft.softPreferenceIds = ids
      })).comprehensivePopulation
      return result.estimate / result.base
    }
    const goals = retention(['relationship.marriage_timeline', 'relationship.children_plan'])
    const settlement = retention(['future.settlement'])
    expect(retention([
      'relationship.marriage_timeline', 'relationship.children_plan', 'future.settlement',
    ])).toBeGreaterThan(goals * settlement)

    const leisure = retention(['lifestyle.travel', 'lifestyle.gaming'])
    const shared = retention(['interest.shared_activities'])
    expect(retention(['lifestyle.travel', 'lifestyle.gaming', 'interest.shared_activities']))
      .toBeGreaterThan(leisure * shared)
  })
})

describe('v4 stratification, bounds, and pairing context', () => {
  const mutateRichScenario = (draft: ModelSelection): void => {
    draft.target.age = { min: 18, max: 50 }
    draft.correlated.educationLevels = ['bachelor', 'master', 'doctorate']
    draft.correlated.schoolTier = '985'
    draft.correlated.smoking = 'non_smoker'
    draft.correlated.drinking = 'not_regular'
    draft.correlated.bodyTypes = ['balanced', 'standard']
    draft.correlated.minAnnualIncomeWan = 20
    draft.correlated.minHouseholdWealthWan = 500
    draft.correlated.hairCriteria = ['full_hair']
    draft.softPreferenceIds = [
      'lifestyle.exercise',
      'relationship.currently_single',
      'values.loyalty',
    ]
    draft.entertainment.zodiacs = ['aries']
    draft.entertainment.mbti = ['E', 'S']
  }

  it('is additive across age partitions for all three scenario endpoints', () => {
    const whole = computeModel(selection(mutateRichScenario)).comprehensivePopulation
    const parts = [[18, 29], [30, 39], [40, 50]].map(([min, max]) => computeModel(selection((draft) => {
      mutateRichScenario(draft)
      draft.target.age = { min, max }
    })).comprehensivePopulation)
    expectAdditive(whole.estimate, parts.map((item) => item.estimate))
    expectAdditive(whole.range.conservative, parts.map((item) => item.range.conservative))
    expectAdditive(whole.range.optimistic, parts.map((item) => item.range.optimistic))
  })

  it('is additive across disjoint city anchors', () => {
    const names = ['杭州', '绍兴', '宁波']
    const union = computeModel(selection((draft) => {
      mutateRichScenario(draft)
      draft.target.cities = names
    })).comprehensivePopulation
    const parts = names.map((name) => computeModel(selection((draft) => {
      mutateRichScenario(draft)
      draft.target.cities = [name]
    })).comprehensivePopulation)
    expectAdditive(union.estimate, parts.map((item) => item.estimate))
    expectAdditive(union.range.conservative, parts.map((item) => item.range.conservative))
    expectAdditive(union.range.optimistic, parts.map((item) => item.range.optimistic))
  })

  it('uses all four declared pairing contexts and a deliberately wide fallback when seeker gender is absent', () => {
    const orientation = (seekerGender: 'male' | 'female' | undefined, targetGender: 'male' | 'female') => {
      const result = computeModel(selection((draft) => {
        draft.target.gender = targetGender
        draft.softPreferenceIds = ['relationship.orientation_compatible']
      }), seekerGender == null ? {} : { seekerGender })
      return result.comprehensivePopulation.factors.find(
        (factor) => factor.dimensionId === 'relationship.orientation_compatible',
      )?.probability
    }
    expect(orientation('male', 'female')?.baseline).toBeCloseTo(0.95, 12)
    expect(orientation('female', 'male')?.baseline).toBeCloseTo(0.95, 12)
    expect(orientation('male', 'male')?.baseline).toBeCloseTo(0.035, 12)
    expect(orientation('female', 'female')?.baseline).toBeCloseTo(0.02, 12)
    const fallback = orientation(undefined, 'female')
    expect(fallback?.conservative).toBeCloseTo(0.004, 12)
    expect(fallback?.baseline).toBeCloseTo(0.5, 12)
    expect(fallback?.optimistic).toBeCloseTo(0.995, 12)
    expect(() => computeModel(DEFAULT_SELECTION, { seekerGender: 'unknown' })).toThrow(ModelOptionsError)
  })

  it('downgrades marital boundary mapping in comprehensive evidence coverage', () => {
    const interior = computeModel(selection((draft) => {
      draft.target.age = { min: 20, max: 49 }
      draft.target.maritalStatuses = ['never_married']
    })).comprehensivePopulation.evidenceCoverage
    const boundary = computeModel(selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
      draft.target.maritalStatuses = ['never_married']
    })).comprehensivePopulation.evidenceCoverage
    expect(interior.B).toBe(1)
    expect(boundary.B).toBe(0)
    expect(boundary.C).toBeGreaterThan(interior.C)
  })

  it('keeps a 69-dimension stress case finite, bounded, and fully accounted for', () => {
    const result = computeModel(selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
      draft.target.maritalStatuses = ['never_married']
      draft.target.heightCm = { min: 150, max: 200 }
      draft.correlated.educationLevels = ['junior_college', 'bachelor', 'master', 'doctorate']
      draft.correlated.bodyTypes = ['balanced']
      draft.correlated.minAnnualIncomeWan = 20
      draft.correlated.minHouseholdWealthWan = 500
      draft.correlated.housing.required = true
      draft.correlated.vehicle.required = true
      draft.correlated.smoking = 'non_smoker'
      draft.correlated.drinking = 'not_regular'
      draft.correlated.hairCriteria = ['full_hair']
      draft.softPreferenceIds = [...SOFT_PREFERENCE_IDS]
      draft.entertainment.zodiacs = ['aries']
      draft.entertainment.mbti = ['E', 'S', 'T', 'J']
    }), { seekerGender: 'male' })
    const comprehensive = result.comprehensivePopulation
    expect(comprehensive.activeConditionCount).toBe(69)
    expect(comprehensive.directConditionCount).toBe(8)
    expect(comprehensive.modeledConditionCount).toBe(61)
    expect(comprehensive.correlationScenarios).toHaveLength(13)
    expect(comprehensive.assumptionCount).toBe(73)
    expect(comprehensive.interpretation).toBe('prior_sensitivity_only')
    expect(Number.isFinite(comprehensive.estimate)).toBe(true)
    expect(comprehensive.estimate).toBeGreaterThanOrEqual(0)
    expect(comprehensive.estimate).toBeLessThanOrEqual(result.population.estimate)
    expect(comprehensive.range.conservative).toBeLessThanOrEqual(comprehensive.estimate)
    expect(comprehensive.range.optimistic).toBeGreaterThanOrEqual(comprehensive.estimate)
    expect(comprehensive.range.optimistic).toBeLessThanOrEqual(result.population.range.optimistic)
    expect(comprehensive.factors).toHaveLength(61)
    expect(comprehensive.impacts).toHaveLength(61)
    for (const impact of comprehensive.impacts) {
      expect(impact.before).toBeGreaterThanOrEqual(impact.after)
      expect(impact.marginalLoss).toBeGreaterThanOrEqual(0)
    }
  })
})
