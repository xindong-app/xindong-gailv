import { describe, expect, it } from 'vitest'
import { performance } from 'node:perf_hooks'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, SOFT_PREFERENCE_IDS } from '../../src/model/schema'
import { GOLDEN_SCENARIOS } from '../model/scenarios'

describe('model performance', () => {
  it('keeps p95 representative calculation under 50ms on the test machine', () => {
    const samples: number[] = []
    for (let index = 0; index < 250; index += 1) {
      const input = GOLDEN_SCENARIOS[index % GOLDEN_SCENARIOS.length].input
      const start = performance.now()
      computeModel(input)
      samples.push(performance.now() - start)
    }
    samples.sort((left, right) => left - right)
    const p95 = samples[Math.floor(samples.length * 0.95)]
    expect(p95).toBeLessThan(50)
  })

  it('keeps the all-dimension worst case under a dedicated p95 budget', () => {
    const input = structuredClone(DEFAULT_SELECTION)
    input.target.age = { min: 18, max: 50 }
    input.target.maritalStatuses = ['never_married']
    input.target.heightCm = { min: 150, max: 200 }
    input.correlated.educationLevels = ['junior_college', 'bachelor', 'master', 'doctorate']
    input.correlated.schoolTier = '985'
    input.correlated.bodyTypes = ['balanced']
    input.correlated.minAnnualIncomeWan = 20
    input.correlated.minHouseholdWealthWan = 500
    input.correlated.housing.required = true
    input.correlated.vehicle.required = true
    input.correlated.smoking = 'non_smoker'
    input.correlated.drinking = 'not_regular'
    input.correlated.healthCriteria = ['no_major_chronic', 'no_myopia']
    input.correlated.hairCriteria = ['full_hair']
    input.softPreferenceIds = [...SOFT_PREFERENCE_IDS]
    input.entertainment.zodiacs = ['aries']
    input.entertainment.mbti = ['E', 'S', 'T', 'J']

    // Warm caches before sampling; this is a regression gate, not a cold-start benchmark.
    computeModel(input, { seekerGender: 'male' })
    const samples: number[] = []
    for (let index = 0; index < 40; index += 1) {
      const start = performance.now()
      computeModel(input, { seekerGender: 'male' })
      samples.push(performance.now() - start)
    }
    samples.sort((left, right) => left - right)
    const p95 = samples[Math.floor(samples.length * 0.95)]
    expect(p95).toBeLessThan(150)
  })
})
