import { isDimensionAppliedToMainEstimate } from '../data/population-policy'
import { DIMENSION_BY_ID } from '../model/dimensions'
import { activeConditions } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'

/**
 * 可声明为硬边界的候选维度: 已选、已登记、软偏好类、且当前未量化(do_not_apply)。
 * 结构化字段里的慢性病/近视等也在其中(activeConditions 统一展开);
 * 本就归类为硬筛选/相关硬条件的维度会自动列入未量化清单, 不需要声明入口。
 */
export function declarableHardConditions(selection: ModelSelection): string[] {
  return activeConditions(selection)
    .filter((condition) => {
      const dimension = DIMENSION_BY_ID.get(condition.dimensionId)
      if (!dimension || dimension.classification !== 'soft_preference') return false
      return !isDimensionAppliedToMainEstimate(condition.dimensionId)
    })
    .map((condition) => condition.dimensionId)
}

/** 只保留仍在选中态的声明 id —— 防预设/清空后触发 ModelRequirementError */
export function sanitizeHardRequirementIds(selection: ModelSelection, ids: readonly string[]): string[] {
  const activeIds = new Set(activeConditions(selection).map((condition) => condition.dimensionId))
  return ids.filter((id) => activeIds.has(id))
}
