import { describe, expect, it } from 'vitest'
import { performance } from 'node:perf_hooks'
import { computeModel } from '../../src/engine/modelEngine'
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
})
