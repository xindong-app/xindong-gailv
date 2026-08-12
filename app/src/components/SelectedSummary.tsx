import type { ActiveCondition } from '../model/selectionUtils'

const CLASS_LABELS = {
  hard_filter: '硬筛选',
  correlated_hard: '相关硬条件',
  soft_preference: '软偏好',
  entertainment: '娱乐',
} as const

export function SelectedSummary({
  conditions,
  canUndo,
  canRedo,
  onRemove,
  onUndo,
  onRedo,
  onClear,
}: {
  conditions: readonly ActiveCondition[]
  canUndo: boolean
  canRedo: boolean
  onRemove: (dimensionId: string) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
}) {
  return (
    <section aria-labelledby="selected-title" className="selected-summary">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">当前组合</span>
          <h2 id="selected-title">已选条件 <span className="count-badge">{conditions.length}</span></h2>
        </div>
        <div className="compact-actions" aria-label="编辑历史">
          <button className="text-button" disabled={!canUndo} type="button" onClick={onUndo}>撤销</button>
          <button className="text-button" disabled={!canRedo} type="button" onClick={onRedo}>重做</button>
          <button className="text-button danger-text" type="button" onClick={onClear}>清空</button>
        </div>
      </div>
      <div className="selected-list">
        {conditions.map((condition) => (
          <span className="selected-pill" data-class={condition.classification} key={condition.dimensionId}>
            <span className="visually-hidden">{CLASS_LABELS[condition.classification]}：</span>
            <b>{condition.label}</b>
            <span>{condition.summary}</span>
            <button
              aria-label={`移除${condition.label}`}
              className="pill-remove"
              type="button"
              onClick={() => onRemove(condition.dimensionId)}
            >×</button>
          </span>
        ))}
      </div>
    </section>
  )
}
