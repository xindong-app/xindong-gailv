import { describe, expect, it } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { GOLDEN_SCENARIOS } from './scenarios'

describe('representative golden scenarios', () => {
  it.each(GOLDEN_SCENARIOS)('$id: $label remains finite and explainable', ({ input }) => {
    const result = computeModel(input)
    expect(result.population.base).toBeGreaterThan(0)
    expect(result.population.estimate).toBeGreaterThanOrEqual(0)
    expect(result.population.estimate).toBeLessThanOrEqual(result.population.base)
    expect(result.groups.length).toBeGreaterThan(0)
    expect(result.versions.modelVersion).toMatch(/^\d+\./)
    expect(result.versions.dataVersion).toBeTruthy()
  })

  it('leaves population invariant under the soft-heavy scenario', () => {
    const base = computeModel(GOLDEN_SCENARIOS.find((item) => item.id === 'base')!.input)
    const soft = computeModel(GOLDEN_SCENARIOS.find((item) => item.id === 'soft-heavy')!.input)
    expect(soft.population.estimate).toBe(base.population.estimate)
    expect(soft.population.range).toEqual(base.population.range)
  })
})
