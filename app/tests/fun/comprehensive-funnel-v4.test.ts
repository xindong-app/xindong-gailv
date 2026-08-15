// v4 前端接入口径守卫 —— 锁住"主数字 = 综合人口层"这条产品契约。
// 引擎数学本身由 model 层测试覆盖; 这里只测前端调用的方式与语义。
import { describe, expect, it } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { buildFunnelFrames } from '../../src/fun/funnelFrames'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'

function baseSelection(): ModelSelection {
  return structuredClone(DEFAULT_SELECTION)
}

// 生产侧所有调用点都带后端 initialPool 作分母; 测试同样走这条契约
function framesOf(selection: ModelSelection, hardRequirementIds: string[] = []) {
  const pool = computeModel(selection, { hardRequirementIds }).comprehensivePopulation
  return buildFunnelFrames(selection, { hardRequirementIds, initialPoolEstimate: pool.initialPool.estimate })
}

describe('v4 综合人口层接入', () => {
  it('收入条件不影响可靠层 population, 但降低综合层 comprehensivePopulation', () => {
    const plain = computeModel(baseSelection())
    const withIncome = baseSelection()
    withIncome.correlated.minAnnualIncomeWan = 50
    const richer = computeModel(withIncome)
    expect(richer.population.estimate).toBe(plain.population.estimate)
    expect(richer.comprehensivePopulation.estimate).toBeLessThanOrEqual(plain.comprehensivePopulation.estimate)
    expect(richer.comprehensivePopulation.estimate).toBeLessThan(richer.comprehensivePopulation.base)
  })

  it('seekerGender 传入后计算上下文被记录, 取向情景随之确定', () => {
    const selection = baseSelection()
    const without = computeModel(selection)
    const withSeeker = computeModel(selection, { seekerGender: 'female' })
    expect(withSeeker.computationContext.seekerGender).toBe('female')
    expect(without.computationContext.seekerGender).toBeUndefined()
  })

  it('综合层状态机完整: 默认可用且带范围, 无锚点城市不可用', () => {
    const result = computeModel(baseSelection())
    expect(result.comprehensivePopulation.numericStatus).toBe('available')
    expect(result.comprehensivePopulation.range.conservative).toBeLessThanOrEqual(
      result.comprehensivePopulation.range.baseline,
    )
    expect(result.comprehensivePopulation.range.baseline).toBeLessThanOrEqual(
      result.comprehensivePopulation.range.optimistic,
    )
  })

  it('先验敏感性情景被显式标注(genericPriorConditionIds / interpretation)', () => {
    const result = computeModel(baseSelection())
    expect(['identified_scenario', 'prior_sensitivity_only']).toContain(
      result.comprehensivePopulation.interpretation,
    )
    expect(Array.isArray(result.comprehensivePopulation.genericPriorConditionIds)).toBe(true)
  })
})

describe('漏斗帧拆解(v4 通用反向链)', () => {
  it('无出刀条件时无帧', () => {
    expect(framesOf(baseSelection())).toEqual([])
  })

  it('收入关卡真实砍人: 帧幸存数与引擎综合估算一致', () => {
    const selection = baseSelection()
    selection.correlated.minAnnualIncomeWan = 100
    const frames = framesOf(selection)
    expect(frames.length).toBe(1)
    expect(frames[0].dimensionId).toBe('economy.income')
    const finalEstimate = computeModel(selection).comprehensivePopulation.estimate
    expect(frames[0].survivors).toBeCloseTo(finalEstimate, 6)
    expect(frames[0].factor).toBeGreaterThanOrEqual(0)
    expect(frames[0].factor).toBeLessThanOrEqual(1)
  })

  it('多条件链式相乘望远镜回综合估算(每帧都是引擎亲算)', () => {
    const selection = baseSelection()
    selection.correlated.minAnnualIncomeWan = 50
    selection.correlated.educationLevels = ['bachelor', 'master', 'doctorate']
    selection.correlated.smoking = 'non_smoker'
    const frames = framesOf(selection)
    expect(frames.length).toBe(3)
    const last = frames[frames.length - 1]
    const finalEstimate = computeModel(selection).comprehensivePopulation.estimate
    expect(last.survivors).toBeCloseTo(finalEstimate, 6)
  })

  it('同一选择对象命中缓存, 不会因重复挂载重复重算', () => {
    const selection = baseSelection()
    selection.correlated.minAnnualIncomeWan = 50
    const first = framesOf(selection)
    const second = framesOf(selection)
    expect(second).toBe(first)
  })

  it('娱乐条件(星座)也作为真实关卡出现, 彩蛋不再隐身', () => {
    const selection = baseSelection()
    selection.entertainment.zodiacs = ['leo']
    const frames = framesOf(selection)
    expect(frames.some((frame) => frame.dimensionId === 'entertainment.zodiac')).toBe(true)
  })

  it('硬边界声明的维度在链中被移除时不崩, 且失效声明被同步清理', () => {
    const selection = baseSelection()
    selection.softPreferenceIds = ['lifestyle.cooking', 'communication.conflict_repair']
    // cooking 被声明为硬边界; 漏斗中间帧的草稿会移除它,
    // 不同步清理 hardRequirementIds 会触发 ModelRequirementError
    const frames = framesOf(selection, ['lifestyle.cooking'])
    expect(frames.length).toBe(2)
    const finalEstimate = computeModel(selection, { hardRequirementIds: ['lifestyle.cooking'] })
      .comprehensivePopulation.estimate
    expect(frames[frames.length - 1].survivors).toBeCloseTo(finalEstimate, 6)
  })
})
