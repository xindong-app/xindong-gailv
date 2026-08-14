import { MAX_MODEL_AGE, MIN_MODEL_AGE } from '../data/population'
import { removeSelectionDimension } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'

/**
 * 一键放宽: 与引擎边际复算(removeDimension)共用同一套语义。
 * 关键差异在年龄: 放宽 = 恢复模型全量程(MIN–MAX), 而不是表单默认值 26–34;
 * 其余维度与 selectionUtils 的移除语义一致, 直接委托。
 */
export function applyRelaxation(selection: ModelSelection, dimensionId: string): ModelSelection {
  if (dimensionId === 'base.age') {
    const next = structuredClone(selection)
    next.target.age = { min: MIN_MODEL_AGE, max: MAX_MODEL_AGE }
    return next
  }
  return removeSelectionDimension(selection, dimensionId)
}
