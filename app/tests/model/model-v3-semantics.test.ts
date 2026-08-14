import { describe, expect, it } from 'vitest'
import {
  computeModel,
  ModelOptionsError,
  ModelRequirementError,
  tryComputeModel,
} from '../../src/engine/modelEngine'
import {
  computeRelationshipScenario,
  computeRelationshipScenarioFromModel,
} from '../../src/engine/relationshipScenario'
import { CITIES } from '../../src/data/cities'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

function selection(mutator?: (draft: ModelSelection) => void): ModelSelection {
  const draft = structuredClone(DEFAULT_SELECTION)
  mutator?.(draft)
  return draft
}

function expectAdditive(union: number, parts: readonly number[]): void {
  const sum = parts.reduce((total, value) => total + value, 0)
  const tolerance = Math.max(1e-6, Math.abs(sum) * 1e-10)
  expect(Math.abs(union - sum)).toBeLessThanOrEqual(tolerance)
}

describe('v3 availability and zero semantics', () => {
  it('has an official resident anchor for every selectable city', () => {
    for (const city of CITIES) {
      const result = computeModel(selection((draft) => {
        draft.target.cities = [city.name]
      }))
      expect(result.population.status, city.name).not.toBe('unavailable')
      expect(result.population.estimate, city.name).toBeGreaterThan(0)
      expect(result.coverage.unsupportedCities, city.name).toEqual([])
    }
  })

  it('keeps a selected multi-city union additive instead of returning a partial estimate', () => {
    const names = ['杭州', '绍兴', '宁波']
    const union = computeModel(selection((draft) => {
      draft.target.cities = names
    }))
    const parts = names.map((name) => computeModel(selection((draft) => {
      draft.target.cities = [name]
    })).population.estimate)

    expect(union.population.status).not.toBe('unavailable')
    expect(union.coverage.unsupportedCities).toEqual([])
    expectAdditive(union.population.estimate, parts)
  })

  it('distinguishes positive below one and numeric underflow to zero', () => {
    const belowOne = computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.heightCm = { min: 193, max: 193 }
    }))
    const underflow = computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.heightCm = { min: 220, max: 220 }
    }))
    expect(belowOne.population.estimate).toBeGreaterThan(0)
    expect(belowOne.population.estimate).toBeLessThan(1)
    expect(belowOne.population.zeroMeaning).toBe('positive_below_resolution')
    expect(belowOne.population.display).toContain('期望值低于 1 人')

    expect(underflow.population.estimate).toBe(0)
    expect(underflow.population.zeroMeaning).toBe('model_underflow')
    expect(underflow.population.display).toContain('不能解释为现实中恰好 0 人')

  })
})

describe('v3 explicit hard-requirement semantics', () => {
  it('runtime-validates computation options instead of leaking TypeError or iterating strings', () => {
    expect(() => computeModel(DEFAULT_SELECTION, { hardRequirementIds: 42 })).toThrow(ModelOptionsError)
    expect(() => computeModel(DEFAULT_SELECTION, { hardRequirementIds: 'health.chronic' })).toThrow(ModelOptionsError)
    expect(() => computeModel(DEFAULT_SELECTION, { hardRequirementIds: ['health.chronic', 'health.chronic'] }))
      .toThrow(ModelOptionsError)
    expect(tryComputeModel(DEFAULT_SELECTION, { hardRequirementIds: 42 })).toMatchObject({
      success: false,
      error: { name: 'ModelOptionsError' },
    })
  })

  const structuredSoftInput = selection((draft) => {
    draft.correlated.schoolTier = '985'
    draft.correlated.healthCriteria = ['no_myopia', 'no_major_chronic']
  })

  it('keeps structured soft selections out of population by default', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const result = computeModel(structuredSoftInput)

    expect(result.population.estimate).toBe(base.population.estimate)
    expect(result.population.status).toBe('estimated')
    expect(result.coverage.unquantifiedHardConditions).toEqual([])
    expect(result.scoreDetails.selectedSoftPreferences).toBe(3)
  })

  it('marks explicitly declared but unquantifiable selected dimensions as an upper bound', () => {
    const base = computeModel(DEFAULT_SELECTION)
    const result = computeModel(structuredSoftInput, {
      hardRequirementIds: ['education.school', 'health.myopia', 'health.chronic'],
    })

    expect(result.population.estimate).toBe(base.population.estimate)
    expect(result.population.status).toBe('upper_bound')
    expect(result.population.interpretation).toBe('quantified_conditions_only')
    expect(result.population.displayShort).toMatch(/^≤ /)
    expect(result.coverage.unquantifiedHardConditions.map((item) => item.dimensionId)).toEqual([
      'education.school',
      'health.chronic',
      'health.myopia',
    ])
  })

  it.each([
    ['registered but unselected ID', ['health.myopia']],
    ['entertainment dimension', ['entertainment.zodiac']],
  ])('rejects an inactive hardRequirementIds request: %s', (_label, hardRequirementIds) => {
    expect(() => computeModel(DEFAULT_SELECTION, { hardRequirementIds })).toThrow(ModelRequirementError)
    const attempt = tryComputeModel(DEFAULT_SELECTION, { hardRequirementIds })
    expect(attempt.success).toBe(false)
    if (attempt.success) throw new Error('expected a rejected hard-requirement request')
    expect(attempt.error).toBeInstanceOf(ModelRequirementError)
    expect(attempt.error.invalidDimensionIds).toEqual(hardRequirementIds)
  })

  it('rejects an unknown hard requirement at the options-schema boundary', () => {
    const attempt = tryComputeModel(DEFAULT_SELECTION, { hardRequirementIds: ['not.registered'] })
    expect(attempt.success).toBe(false)
    if (attempt.success) throw new Error('expected an invalid options request')
    expect(attempt.error).toBeInstanceOf(ModelOptionsError)
  })
})

describe('v3 set properties for quantified hard conditions', () => {
  it('a stricter age or height condition cannot increase the estimate', () => {
    const wideAge = computeModel(selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
    }))
    const narrowAge = computeModel(selection((draft) => {
      draft.target.age = { min: 25, max: 35 }
    }))
    const height = computeModel(selection((draft) => {
      draft.target.age = { min: 25, max: 35 }
      draft.target.heightCm = { min: 175, max: 185 }
    }))

    expect(narrowAge.population.estimate).toBeLessThanOrEqual(wideAge.population.estimate)
    expect(height.population.estimate).toBeLessThanOrEqual(narrowAge.population.estimate)
  })

  it('age partitions and supported disjoint city unions are additive', () => {
    const allAges = computeModel(selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
      draft.target.heightCm = { min: 170, max: 185 }
      draft.correlated.smoking = 'non_smoker'
    })).population.estimate
    const ageParts = [[18, 29], [30, 39], [40, 50]].map(([min, max]) =>
      computeModel(selection((draft) => {
        draft.target.age = { min, max }
        draft.target.heightCm = { min: 170, max: 185 }
        draft.correlated.smoking = 'non_smoker'
      })).population.estimate,
    )
    expectAdditive(allAges, ageParts)

    const union = computeModel(selection((draft) => {
      draft.target.age = { min: 18, max: 50 }
      draft.target.cities = ['北京', '上海']
      draft.target.heightCm = { min: 170, max: 185 }
      draft.correlated.smoking = 'non_smoker'
    })).population.estimate
    const cityParts = ['北京', '上海'].map((city) =>
      computeModel(selection((draft) => {
        draft.target.age = { min: 18, max: 50 }
        draft.target.cities = [city]
        draft.target.heightCm = { min: 170, max: 185 }
        draft.correlated.smoking = 'non_smoker'
      })).population.estimate,
    )
    expectAdditive(union, cityParts)
  })
})

describe('relationship scenarios remain a separate second layer', () => {
  it.each([
    ['male', 'female', 'male_female'],
    ['female', 'male', 'female_male'],
    ['male', 'male', 'male_male'],
    ['female', 'female', 'female_female'],
  ] as const)('keeps %s→%s outside the main population result', (seekerGender, targetGender, pairing) => {
    const model = computeModel(selection((draft) => {
      draft.target.gender = targetGender
      draft.softPreferenceIds = [
        'relationship.orientation_compatible',
        'relationship.currently_single',
      ]
      draft.selfPreferenceIds = [...draft.softPreferenceIds]
    }))
    const scenario = computeRelationshipScenarioFromModel(model, { seekerGender, targetGender })

    expect(model.population.status).toBe('estimated')
    expect(model.coverage.unquantifiedHardConditions).toEqual([])
    expect(scenario.pairing).toBe(pairing)
    expect(scenario.mainLayer.range?.reference).toBe(model.population.estimate)
    expect(scenario.mainLayer.role).toBe('statistical_upper_bound')
    expect(scenario.combined.status).toBe('scenario')
    expect(scenario.combined.isObservedPopulationEstimate).toBe(false)
  })

  it('propagates an unavailable low-level main-population input without multiplying a placeholder', () => {
    const scenario = computeRelationshipScenario({
      seekerGender: 'male',
      targetGender: 'female',
      targetPopulation: { status: 'unavailable', reason: '外部调用没有可核人口锚点' },
    })

    expect(scenario.mainLayer).toMatchObject({ status: 'unavailable', range: null })
    expect(scenario.combined).toMatchObject({ status: 'unavailable', range: null })
    expect(scenario.explanation.join(' ')).toContain('不是 0 人')
  })

  it('propagates main-model numeric underflow as unavailable, not a logical zero', () => {
    const model = computeModel(selection((draft) => {
      draft.target.gender = 'female'
      draft.target.heightCm = { min: 220, max: 220 }
    }))
    expect(model.population.zeroMeaning).toBe('model_underflow')
    const scenario = computeRelationshipScenarioFromModel(model, {
      seekerGender: 'female',
      targetGender: 'female',
    })
    expect(scenario.mainLayer.status).toBe('unavailable')
    expect(scenario.combined).toMatchObject({
      status: 'unavailable',
      zeroMeaning: { lower: 'none', reference: 'none', upper: 'none' },
    })
    expect(scenario.mainLayer.reason).toContain('数值下溢')
  })

  it('does not reuse relationship factors as main-layer hard-condition multipliers', () => {
    const model = computeModel(DEFAULT_SELECTION)
    const scenario = computeRelationshipScenario({
      seekerGender: 'female',
      targetGender: 'male',
      targetPopulation: {
        status: 'available',
        estimate: model.population.estimate,
        range: model.population.range,
        modelVersion: model.versions.modelVersion,
        dataVersion: model.versions.dataVersion,
      },
      overrides: {
        orientationCompatibility: {
          status: 'scenario',
          range: { lower: 0.1, reference: 0.2, upper: 0.3 },
        },
      },
    })

    expect(scenario.mainLayer.range?.reference).toBe(model.population.estimate)
    expect(scenario.combined.range?.reference).toBeLessThan(model.population.estimate)
    expect(model.coverage.includedHardConditions).not.toContain('relationship.orientation_compatible')
  })
})
