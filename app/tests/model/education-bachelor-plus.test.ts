import { describe, expect, it } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { DEFAULT_SELECTION, type EducationId, type ModelSelection } from '../../src/model/schema'

// 「本科及以上」快捷组合的回归守护: UI 映射为 bachelor+master+doctorate 并集,
// 语义必须严格区别于「本科(精确类别)」, 且人数单调不减。
const BACHELOR_PLUS: readonly EducationId[] = ['bachelor', 'master', 'doctorate']

function withEducation(educationLevels: readonly EducationId[]): ModelSelection {
  const draft = structuredClone(DEFAULT_SELECTION)
  draft.correlated.educationLevels = [...educationLevels]
  return draft
}

describe('学历「本科及以上」快捷组合回归', () => {
  const bachelorOnly = computeModel(withEducation(['bachelor']))
  const bachelorPlus = computeModel(withEducation(BACHELOR_PLUS))

  it('本科(精确类别)与本科及以上人数不同(可靠层与综合层)', () => {
    expect(bachelorPlus.population.estimate).not.toBe(bachelorOnly.population.estimate)
    expect(bachelorPlus.comprehensivePopulation.estimate).not.toBe(bachelorOnly.comprehensivePopulation.estimate)
  })

  it('本科及以上人数一定不小于本科(精确类别)', () => {
    expect(bachelorPlus.population.estimate).toBeGreaterThanOrEqual(bachelorOnly.population.estimate)
    expect(bachelorPlus.comprehensivePopulation.estimate).toBeGreaterThanOrEqual(bachelorOnly.comprehensivePopulation.estimate)
  })

  it('快捷组合与勾选顺序无关(幂等并集)', () => {
    const reordered = computeModel(withEducation(['doctorate', 'master', 'bachelor']))
    expect(reordered.population.estimate).toBe(bachelorPlus.population.estimate)
    expect(reordered.comprehensivePopulation.estimate).toBe(bachelorPlus.comprehensivePopulation.estimate)
  })
})
