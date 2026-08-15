// v4 最终接线反例 —— 前端消费契约专属:
// 1) 稀有度/幸存者/漏斗分母 = 后端 initialPool(任何可选条件之前), 不是筛过婚史的 base;
// 2) 漏斗帧 0 优先吃后端 initialPoolEstimate, 不重复重算;
// 3) 放宽卡显示值 = 综合层实际重算值(展示与应用同一份数学)。
import { describe, expect, it } from 'vitest'
import { computeComprehensiveConditionAnalysis, computeModel } from '../../src/engine/modelEngine'
import { applyRelaxation } from '../../src/features/applyRelaxation'
import { buildFunnelFrames } from '../../src/fun/funnelFrames'
import { DEFAULT_SELECTION, type ModelSelection } from '../../src/model/schema'
import { buildShareDto, createDefaultShareSettings } from '../../src/share'

function baseSelection(): ModelSelection {
  return structuredClone(DEFAULT_SELECTION)
}

describe('initialPool 真分母接线', () => {
  it('选了婚史后 initialPool 严格大于 base(婚史在 initialPool 之前)', () => {
    const selection = baseSelection()
    selection.target.maritalStatuses = ['never_married']
    const pool = computeModel(selection).comprehensivePopulation
    expect(pool.numericStatus).toBe('available')
    expect(pool.base).toBeGreaterThan(0)
    expect(pool.initialPool.estimate).toBeGreaterThan(pool.base)
  })

  it('漏斗帧 0 使用后端 initialPoolEstimate: 唯一一关的保留率 = 综合估算 / initialPool', () => {
    const selection = baseSelection()
    selection.correlated.minAnnualIncomeWan = 50
    const result = computeModel(selection)
    const pool = result.comprehensivePopulation
    const frames = buildFunnelFrames(result.input, {
      ...result.computationContext,
      initialPoolEstimate: pool.initialPool.estimate,
    })
    expect(frames).toHaveLength(1)
    expect(frames[0].dimensionId).toBe('economy.income')
    expect(frames[0].factor).toBeCloseTo(pool.estimate / pool.initialPool.estimate, 9)
    // 帧幸存数与引擎综合估算逐位一致
    expect(frames[0].survivors).toBe(pool.estimate)
  })

  it('分享幸存者用公开副本自己的 initialPool 作分母, 不用筛过婚史的 base', () => {
    const selection = baseSelection()
    selection.target.maritalStatuses = ['never_married']
    selection.target.heightCm = { min: 180, max: 220 }
    const result = computeModel(selection)
    // 婚史是敏感维度: 显式公开并授权, 让公开副本保留这一关
    const settings = createDefaultShareSettings(selection)
    settings.includedDimensionIds = [...settings.includedDimensionIds, 'base.marital']
    settings.sensitiveConsentDimensionIds = [...settings.sensitiveConsentDimensionIds, 'base.marital']
    const dto = buildShareDto(selection, result, settings)

    const pool = result.comprehensivePopulation
    expect(pool.numericStatus).toBe('available')
    expect(pool.zeroMeaning).toBe('not_zero')
    // 构造的场景必须真的区分两种口径, 否则本断言失去意义
    expect(pool.initialPool.estimate).toBeGreaterThan(pool.base)
    const expected = Math.min(80, Math.max(0, Math.round((80 * pool.estimate) / pool.initialPool.estimate)))
    const oldDenom = Math.min(80, Math.max(0, Math.round((80 * pool.estimate) / pool.base)))
    expect(dto.fun?.survivors).toBe(expected)
    expect(expected).not.toBe(oldDenom) // 证明分母确实换成了 initialPool
  })
})

describe('综合层放宽建议接线', () => {
  it('放宽卡显示值 = 应用放宽后综合层的实际重算值(非敏感维度: 身高)', () => {
    // 引擎不主动建议放宽敏感维度(收入等), 前端卡片与引擎同一条过滤规则
    const selection = baseSelection()
    selection.target.heightCm = { min: 185, max: 220 }
    const result = computeModel(selection)
    const analysis = computeComprehensiveConditionAnalysis(result)
    const suggestion = analysis.relaxations.find((item) => item.dimensionId === 'appearance.height')
    expect(suggestion, '综合层应对身高条件给出放宽建议').toBeTruthy()
    expect(suggestion!.currentEstimate).toBe(result.comprehensivePopulation.estimate)

    const relaxed = applyRelaxation(selection, 'appearance.height')
    const recomputed = computeModel(relaxed).comprehensivePopulation.estimate
    expect(suggestion!.relaxedEstimate).toBe(recomputed)
  })

  it('影响排行第一名 = 边际损失最大的条件, 且覆盖直接条件(学历)', () => {
    const selection = baseSelection()
    selection.correlated.minAnnualIncomeWan = 200
    selection.correlated.educationLevels = ['master', 'doctorate']
    const result = computeModel(selection)
    const analysis = computeComprehensiveConditionAnalysis(result)
    expect(analysis.impacts.length).toBeGreaterThanOrEqual(2)
    const losses = analysis.impacts.map((impact) => impact.marginalLoss)
    expect([...losses].sort((a, b) => b - a)).toEqual(losses) // 已按边际损失降序
    // 学历是直接条件: 必须出现在合并归因里(旧 result.impacts 之外的直接条件 leave-one-out)
    expect(analysis.impacts.some((impact) => impact.dimensionId === 'education.level')).toBe(true)
    expect(analysis.impacts.some((impact) => impact.dimensionId === 'economy.income')).toBe(true)
  })
})
