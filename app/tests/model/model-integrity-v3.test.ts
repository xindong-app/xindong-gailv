import { describe, expect, it } from 'vitest'
import {
  computeModel,
  formatCount,
  tryComputeModel,
  type ModelResult,
} from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

type SelectionMutation = (draft: ModelSelection) => void

function result(...mutations: readonly SelectionMutation[]): ModelResult {
  const draft = structuredClone(DEFAULT_SELECTION)
  for (const mutate of mutations) mutate(draft)
  return computeModel(draft)
}

function setAge(min: number, max: number): SelectionMutation {
  return (draft) => { draft.target.age = { min, max } }
}

function setCities(...cities: string[]): SelectionMutation {
  return (draft) => { draft.target.cities = cities }
}

function expectAdditive(
  union: number,
  disjointParts: readonly number[],
  relativeTolerance = 1e-9,
): void {
  const sum = disjointParts.reduce((total, value) => total + value, 0)
  const tolerance = Math.max(1e-6, Math.abs(sum) * relativeTolerance)
  expect(Math.abs(union - sum)).toBeLessThanOrEqual(tolerance)
}

describe('v3 population-set integrity', () => {
  it.each([
    {
      label: '有住房，再要求最低收入 1 万元',
      looser: [(draft: ModelSelection) => { draft.correlated.housing.required = true }],
      stricter: [
        (draft: ModelSelection) => { draft.correlated.housing.required = true },
        (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 1 },
      ],
    },
    {
      label: '有车，再要求最低收入 1 万元',
      looser: [(draft: ModelSelection) => { draft.correlated.vehicle.required = true }],
      stricter: [
        (draft: ModelSelection) => { draft.correlated.vehicle.required = true },
        (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 1 },
      ],
    },
    {
      label: '最低收入 100 万元，再要求本科学历',
      looser: [(draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 100 }],
      stricter: [
        (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 100 },
        (draft: ModelSelection) => { draft.correlated.educationLevels = ['bachelor'] },
      ],
    },
  ])('adding a hard condition cannot increase people: $label', ({ looser, stricter }) => {
    const looserEstimate = result(...looser).population.estimate
    const stricterEstimate = result(...stricter).population.estimate
    expect(stricterEstimate).toBeLessThanOrEqual(looserEstimate + 1e-6)
  })

  it('expanding an education OR set cannot reduce people, including with an income condition', () => {
    const income = (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 20 }
    const narrower = result(
      income,
      (draft) => { draft.correlated.educationLevels = ['bachelor', 'master', 'doctorate'] },
    ).population.estimate
    const expanded = result(
      income,
      (draft) => {
        draft.correlated.educationLevels = ['junior_college', 'bachelor', 'master', 'doctorate']
      },
    ).population.estimate
    expect(expanded).toBeGreaterThanOrEqual(narrower - 1e-6)
  })

  it('expanding mutually exclusive marital and body-type OR sets cannot reduce people', () => {
    const neverMarried = result(
      (draft) => { draft.target.maritalStatuses = ['never_married'] },
    ).population.estimate
    const neverMarriedOrDivorced = result(
      (draft) => { draft.target.maritalStatuses = ['never_married', 'divorced'] },
    ).population.estimate
    expect(neverMarriedOrDivorced).toBeGreaterThanOrEqual(neverMarried - 1e-6)

    const balanced = result(
      (draft) => { draft.correlated.bodyTypes = ['balanced'] },
    ).population.estimate
    const balancedOrStandard = result(
      (draft) => { draft.correlated.bodyTypes = ['balanced', 'standard'] },
    ).population.estimate
    expect(balancedOrStandard).toBeGreaterThanOrEqual(balanced - 1e-6)
  })

  it.each([
    {
      label: '最低收入 20 万元',
      condition: (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 20 },
    },
    {
      label: '最低家庭资产 500 万元',
      condition: (draft: ModelSelection) => { draft.correlated.minHouseholdWealthWan = 500 },
    },
    {
      label: '匀称体型',
      condition: (draft: ModelSelection) => { draft.correlated.bodyTypes = ['balanced'] },
    },
    {
      label: '无雄激素性脱发',
      condition: (draft: ModelSelection) => { draft.correlated.hairCriteria = ['full_hair'] },
    },
  ])('age partitions conserve population: $label', ({ condition }) => {
    const whole = result(setAge(18, 50), condition).population.estimate
    const parts = [
      result(setAge(18, 29), condition).population.estimate,
      result(setAge(30, 39), condition).population.estimate,
      result(setAge(40, 50), condition).population.estimate,
    ]
    expectAdditive(whole, parts)
  })

  it.each([
    {
      label: '最低收入 20 万元',
      condition: (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 20 },
    },
    {
      label: '最低家庭资产 500 万元',
      condition: (draft: ModelSelection) => { draft.correlated.minHouseholdWealthWan = 500 },
    },
    {
      label: '本科及以上且最低收入 20 万元',
      condition: (draft: ModelSelection) => {
        draft.correlated.educationLevels = ['bachelor', 'master', 'doctorate']
        draft.correlated.minAnnualIncomeWan = 20
      },
    },
  ])('disjoint city unions equal the sum of city estimates: $label', ({ condition }) => {
    const union = result(setCities('上海', '郑州'), condition).population.estimate
    const parts = [
      result(setCities('上海'), condition).population.estimate,
      result(setCities('郑州'), condition).population.estimate,
    ]
    expectAdditive(union, parts)
  })

  it('adding a disjoint city cannot reduce the estimate', () => {
    const wealth = (draft: ModelSelection) => { draft.correlated.minHouseholdWealthWan = 500 }
    const shanghai = result(setCities('上海'), wealth).population.estimate
    const shanghaiAndZhengzhou = result(setCities('上海', '郑州'), wealth).population.estimate
    expect(shanghaiAndZhengzhou).toBeGreaterThanOrEqual(shanghai - 1e-6)
  })

  it('an inclusive one-centimetre integer height selection represents a non-empty band', () => {
    const exactHeight = result(
      (draft) => { draft.target.heightCm = { min: 180, max: 180 } },
    )
    expect(exactHeight.population.estimate).toBeGreaterThan(0)
  })
})

describe('v3 range and result-state integrity', () => {
  it('propagates the registered city structure scenario without clipping it to the reference pool', () => {
    const city = result(setCities('北京')).population
    expect(city.range.conservative / city.estimate).toBeCloseTo(0.7, 10)
    expect(city.range.optimistic / city.estimate).toBeCloseTo(1.3, 10)
    expect(city.range.optimistic).toBeLessThanOrEqual(city.scopeCeiling)
  })

  it('does not mechanically widen the range for an effectively unrestricted height band', () => {
    const smokingOnly = result(
      (draft) => { draft.correlated.smoking = 'non_smoker' },
    ).population
    const withNearUniversalHeight = result(
      (draft) => { draft.correlated.smoking = 'non_smoker' },
      (draft) => { draft.target.heightCm = { min: 130, max: 220 } },
    ).population
    const relativeWidth = (population: ModelResult['population']) =>
      (population.range.optimistic - population.range.conservative) / population.estimate
    expect(Math.abs(relativeWidth(withNearUniversalHeight) - relativeWidth(smokingOnly))).toBeLessThan(1e-4)
  })

  it('propagates the registered all-age-to-target-age smoking sensitivity', () => {
    const smoking = result(
      (draft) => { draft.correlated.smoking = 'non_smoker' },
    ).population
    expect(smoking.range.conservative / smoking.estimate).toBeCloseTo(0.7, 10)
    expect(smoking.range.optimistic / smoking.estimate).toBeCloseTo(1.3, 10)
  })

  it('keeps range bounds additive across age partitions and disjoint supported cities', () => {
    const wholeAge = result(
      setAge(18, 50),
      (draft) => { draft.correlated.drinking = 'none' },
    ).population.range
    const ageParts = [
      result(setAge(18, 29), (draft) => { draft.correlated.drinking = 'none' }).population.range,
      result(setAge(30, 39), (draft) => { draft.correlated.drinking = 'none' }).population.range,
      result(setAge(40, 50), (draft) => { draft.correlated.drinking = 'none' }).population.range,
    ]
    for (const key of ['conservative', 'baseline', 'optimistic'] as const) {
      expectAdditive(wholeAge[key], ageParts.map((part) => part[key]))
    }

    const cityUnion = result(
      setCities('上海', '郑州'),
      (draft) => { draft.correlated.drinking = 'none' },
    ).population.range
    const cityParts = ['上海', '郑州'].map((city) => result(
      setCities(city),
      (draft) => { draft.correlated.drinking = 'none' },
    ).population.range)
    for (const key of ['conservative', 'baseline', 'optimistic'] as const) {
      expectAdditive(cityUnion[key], cityParts.map((part) => part[key]))
    }
  })

  it.each([
    {
      label: 'base',
      mutations: [] as SelectionMutation[],
    },
    {
      label: 'city economic tail',
      mutations: [
        setCities('北京'),
        (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 50 },
        (draft: ModelSelection) => { draft.correlated.minHouseholdWealthWan = 600 },
      ],
    },
    {
      label: 'health and lifestyle group',
      mutations: [
        (draft: ModelSelection) => { draft.correlated.bodyTypes = ['balanced', 'standard'] },
        (draft: ModelSelection) => { draft.correlated.smoking = 'non_smoker' },
        (draft: ModelSelection) => { draft.correlated.drinking = 'none' },
        (draft: ModelSelection) => { draft.correlated.hairCriteria = ['full_hair'] },
      ],
    },
    {
      label: 'extreme supported thresholds',
      mutations: [
        (draft: ModelSelection) => { draft.correlated.minAnnualIncomeWan = 10_000 },
        (draft: ModelSelection) => { draft.correlated.minHouseholdWealthWan = 1_000_000 },
      ],
    },
  ])('keeps estimate and range finite, ordered, and bounded by base: $label', ({ mutations }) => {
    const population = result(...mutations).population
    const values = [
      population.base,
      population.scopeCeiling,
      population.estimate,
      population.range.conservative,
      population.range.baseline,
      population.range.optimistic,
    ]
    expect(values.every(Number.isFinite)).toBe(true)
    expect(population.range.conservative).toBeGreaterThanOrEqual(0)
    expect(population.range.conservative).toBeLessThanOrEqual(population.range.baseline)
    expect(population.range.baseline).toBe(population.estimate)
    expect(population.range.baseline).toBeLessThanOrEqual(population.range.optimistic)
    // A city structural scenario may move the target age/sex share above its
    // reference while remaining below the selected geography's full resident
    // population. `base` is the reference demographic pool, not that ceiling.
    expect(population.range.optimistic).toBeLessThanOrEqual(population.scopeCeiling)
  })

  it('distinguishes a sub-person expectation from an unavailable numeric result', () => {
    expect(formatCount(0.4)).toBe('期望值低于 1 人')
    expect(formatCount(Number.NaN)).toBe('无法估算')
  })

  it('reports unsupported or contradictory input as invalid rather than as zero people', () => {
    const reversedAge = structuredClone(DEFAULT_SELECTION)
    reversedAge.target.age = { min: 40, max: 20 }
    expect(tryComputeModel(reversedAge).success).toBe(false)

    const unsupportedCity = structuredClone(DEFAULT_SELECTION) as ModelSelection
    unsupportedCity.target.cities = ['不存在的城市']
    expect(tryComputeModel(unsupportedCity).success).toBe(false)
  })

  it('does not calculate an unsupported extreme tail or present it as proof of real-world zero', () => {
    const extreme = result(
      (draft) => { draft.correlated.minAnnualIncomeWan = 10_000 },
      (draft) => { draft.correlated.minHouseholdWealthWan = 1_000_000 },
      (draft) => { draft.correlated.educationLevels = ['doctorate'] },
    )
    expect(extreme.population.status).toBe('upper_bound')
    expect(extreme.coverage.unquantifiedHardConditions.map((item) => item.dimensionId)).toEqual(
      expect.arrayContaining(['economy.income', 'economy.wealth', 'education.level']),
    )
    expect(extreme.population.display).toContain('未计入')
    expect(extreme.population.display).not.toMatch(/现实中(?:约|为)?\s*0\s*人/)
  })
})
