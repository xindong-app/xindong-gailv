import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { DIMENSION_BY_ID } from '../model/dimensions'
import type { ActiveCondition } from '../model/selectionUtils'
import { cardMetaFor } from '../fun/cardpool/cardMeta'
import { recordCollected } from '../fun/cardpool/album'
import { completedCombos, type Combo } from '../fun/cardpool/combos'
import { playCombo, playTear } from '../fun/sound'

const CLASS_LABELS = {
  hard_filter: '硬筛选',
  correlated_hard: '相关硬条件',
  soft_preference: '软偏好',
  entertainment: '娱乐',
} as const

interface TearGhost {
  key: number
  x: number
  y: number
  width: number
  height: number
  cardName: string
  tier: string
}

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
  // 撕卡幽灵层: 状态立即移除(不阻塞模型), 残影在原位演完撕碎动画再消散
  const [ghosts, setGhosts] = useState<readonly TearGhost[]>([])
  const ghostSeq = useRef(0)
  // 梦幻联动: 只在「没集齐 → 集齐」的瞬间庆祝一次, 撤掉再凑齐可以再庆祝
  const [banner, setBanner] = useState<Combo | null>(null)
  const prevCombos = useRef<ReadonlySet<string>>(new Set())

  const activeIdsKey = conditions.map((condition) => condition.dimensionId).join('|')
  useEffect(() => {
    const ids = new Set(activeIdsKey ? activeIdsKey.split('|') : [])
    recordCollected([...ids]) // 图鉴点亮: 任何步骤加的条件都算数
    const now = completedCombos(ids)
    const fresh = now.find((combo) => !prevCombos.current.has(combo.id))
    prevCombos.current = new Set(now.map((combo) => combo.id))
    if (fresh) {
      playCombo()
      setBanner(fresh)
      const timer = setTimeout(() => setBanner(null), 5200)
      return () => clearTimeout(timer)
    }
  }, [activeIdsKey])

  const handleRemove = (event: MouseEvent<HTMLButtonElement>, condition: ActiveCondition) => {
    playTear()
    const pill = event.currentTarget.closest('.selected-pill')
    const entry = DIMENSION_BY_ID.get(condition.dimensionId)
    const meta = entry
      ? cardMetaFor(entry)
      : cardMetaFor({ id: condition.dimensionId, label: condition.label, description: condition.summary, classification: condition.classification })
    if (pill) {
      const rect = pill.getBoundingClientRect()
      const ghost: TearGhost = {
        key: ++ghostSeq.current, x: rect.left, y: rect.top,
        width: rect.width, height: rect.height, cardName: meta.cardName, tier: meta.tier,
      }
      setGhosts((prev) => [...prev, ghost])
      // reduced-motion 下没有 animationend 事件, 用定时器兜底清残影
      setTimeout(() => setGhosts((prev) => prev.filter((item) => item.key !== ghost.key)), 500)
    }
    onRemove(condition.dimensionId)
  }

  return (
    <section aria-labelledby="selected-title" className="selected-summary">
      <div className="section-heading-row">
        <div>
          <span className="eyebrow">我的手牌</span>
          <h2 id="selected-title">已选条件 <span className="count-badge">{conditions.length}</span></h2>
        </div>
        <div className="compact-actions" aria-label="编辑历史">
          <button className="text-button" disabled={!canUndo} type="button" onClick={onUndo}>撤销</button>
          <button className="text-button" disabled={!canRedo} type="button" onClick={onRedo}>重做</button>
          <button className="text-button danger-text" type="button" onClick={onClear}>清空</button>
        </div>
      </div>
      <div className="selected-list">
        {conditions.map((condition) => {
          const entry = DIMENSION_BY_ID.get(condition.dimensionId)
          const meta = entry
            ? cardMetaFor(entry)
            : cardMetaFor({ id: condition.dimensionId, label: condition.label, description: condition.summary, classification: condition.classification })
          return (
            <span className="selected-pill hand-card" data-class={condition.classification} data-tier={meta.tier} key={condition.dimensionId}>
              <span className="visually-hidden">{CLASS_LABELS[condition.classification]}：</span>
              <i className="hand-tier" aria-hidden="true">{meta.tier}</i>
              <b>{meta.cardName}</b>
              <span className="hand-official">{condition.label}</span>
              <span>{condition.summary}</span>
              <button
                aria-label={`移除${condition.label}`}
                className="pill-remove"
                type="button"
                onClick={(event) => handleRemove(event, condition)}
              >×</button>
            </span>
          )
        })}
      </div>
      {banner && (
        <div className="combo-banner" role="status">
          <b>🎉 梦幻联动 ·「{banner.name}」</b>
          <span>{banner.line}</span>
          <button aria-label="收下联动彩蛋" className="combo-close" type="button" onClick={() => setBanner(null)}>收下了</button>
        </div>
      )}
      {ghosts.map((ghost) => (
        <span
          aria-hidden="true"
          className="selected-pill hand-card hand-ghost"
          data-tier={ghost.tier}
          key={ghost.key}
          onAnimationEnd={() => setGhosts((prev) => prev.filter((item) => item.key !== ghost.key))}
          style={{ left: ghost.x, top: ghost.y, width: ghost.width, minHeight: ghost.height }}
        >
          <i className="hand-tier">{ghost.tier}</i>
          <b>{ghost.cardName}</b>
        </span>
      ))}
    </section>
  )
}
