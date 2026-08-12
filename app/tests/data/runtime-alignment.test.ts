import { describe, expect, it } from 'vitest'
import { CITIES, NATIONAL_WAGE } from '../../src/data/cities'
import { evidenceById } from '../../src/data/evidence'
import { CAR_RATE, HOUSE_LOCAL_RATE, drinkingRate, nonSmokerRate } from '../../src/data/model'
import { NATIONAL_POPULATION_WAN } from '../../src/data/population'

describe('runtime data anchors match declared evidence', () => {
  it('uses the registered 2025 national population and wage anchors', () => {
    const population = evidenceById('evidence.base.region.population-2025')!
    const wage = evidenceById('evidence.economy.income.wages-2025')!
    expect(NATIONAL_POPULATION_WAN * 10_000).toBe(population.estimate.baseline)
    expect(NATIONAL_WAGE).toBe(wage.estimate.baseline)
  })

  it('uses exact registered 2025 population anchors for the six updated cities', () => {
    const expected = new Map([
      ['北京', 'evidence.base.region.beijing-2025'],
      ['上海', 'evidence.base.region.shanghai-2025'],
      ['深圳', 'evidence.base.region.shenzhen-2025'],
      ['广州', 'evidence.base.region.guangzhou-2025'],
      ['苏州', 'evidence.base.region.suzhou-2025'],
      ['武汉', 'evidence.base.region.wuhan-2025'],
    ])
    for (const [name, evidenceId] of expected) {
      const city = CITIES.find((candidate) => candidate.name === name)!
      const evidence = evidenceById(evidenceId)!
      expect(city.sourceEvidenceId).toBe(evidenceId)
      expect(city.populationYear).toBe(2025)
      expect(city.pop).toBeCloseTo(evidence.estimate.baseline!, 4)
    }
  })

  it('uses registered smoking/drinking complements and C-grade housing/vehicle baselines', () => {
    expect(nonSmokerRate('male')).toBe(0.561)
    expect(nonSmokerRate('female')).toBe(0.982)
    expect(drinkingRate('male', 'notRegular')).toBe(0.657)
    expect(drinkingRate('female', 'notRegular')).toBe(0.941)
    expect(drinkingRate('male', 'none')).toBe(0.555)
    expect(drinkingRate('female', 'none')).toBe(0.898)
    expect(drinkingRate('male', 'notRegular', 22)).toBeCloseTo(1 - 0.343 * 0.143 / 0.203, 12)
    expect(drinkingRate('female', 'none', 47)).toBeCloseTo(1 - 0.102 * 0.273 / 0.276, 12)
    expect(HOUSE_LOCAL_RATE).toBe(evidenceById('evidence.economy.house.local-young-assumption')!.estimate.baseline)
    expect(CAR_RATE).toBe(evidenceById('evidence.economy.car.personal-assumption')!.estimate.baseline)
  })
})
