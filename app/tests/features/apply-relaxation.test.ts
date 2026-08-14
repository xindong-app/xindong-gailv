import { describe, expect, it } from 'vitest'
import { computeModel } from '../../src/engine/modelEngine'
import { applyRelaxation } from '../../src/features/applyRelaxation'
import { DEFAULT_SELECTION } from '../../src/model/schema'

describe('applyRelaxation 与引擎边际复算同语义', () => {
  it('放宽年龄 = 模型全量程 18–50, 且人数与引擎建议一致', () => {
    const selection = structuredClone(DEFAULT_SELECTION) // 默认 26–34
    const result = computeModel(selection)
    const suggestion = result.relaxations.find((item) => item.dimensionId === 'base.age')
    expect(suggestion, '默认 26–34 下引擎应给出放宽年龄的建议').toBeTruthy()

    const relaxed = applyRelaxation(selection, 'base.age')
    expect(relaxed.target.age).toEqual({ min: 18, max: 50 })
    // UI 操作后的人数必须等于引擎建议的放宽估值(共用同一份语义)
    expect(computeModel(relaxed).population.estimate).toBe(suggestion!.relaxedEstimate)
    // 原选择不被改动(不可变更新)
    expect(selection.target.age).toEqual(DEFAULT_SELECTION.target.age)
  })

  it('其余维度委托给移除语义(与引擎 removeDimension 对齐)', () => {
    const selection = structuredClone(DEFAULT_SELECTION)
    selection.correlated.smoking = 'non_smoker'
    selection.target.heightCm = { min: 180, max: null }

    expect(applyRelaxation(selection, 'lifestyle.smoking').correlated.smoking).toBe('any')
    expect(applyRelaxation(selection, 'appearance.height').target.heightCm).toBeNull()
    expect(applyRelaxation(selection, 'base.region').target.cities).toEqual(['全国'])
  })
})
