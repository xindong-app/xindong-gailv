// 今日卡包 UI —— 三张背朝下的卡, 逐张拆开, 拆完可直接收进卡组。
import { useMemo, useState } from 'react'
import { Chip } from '../../components/ui'
import { playCardFlip } from '../sound'
import { CardArt } from './cardArt'
import { CARD_TIER_NAMES, cardMetaFor } from './cardMeta'
import { dailyPicks, loadOpened, saveOpened } from './dailyPack'

export function DailyPack({ isActive, onToggle }: {
  isActive: (id: string) => boolean
  onToggle: (id: string) => void
}) {
  const picks = useMemo(() => dailyPicks(), [])
  const [opened, setOpened] = useState<ReadonlySet<string>>(() => loadOpened())

  const openCard = (id: string) => {
    playCardFlip()
    setOpened((prev) => {
      const next = new Set(prev).add(id)
      saveOpened(next)
      return next
    })
  }
  const openAll = () => {
    playCardFlip()
    setOpened(() => {
      const next = new Set(picks.map((entry) => entry.id))
      saveOpened(next)
      return next
    })
  }

  return (
    <section className="daily-pack" aria-label="今日卡包">
      <div className="daily-pack-head">
        <span className="eyebrow">今日卡包</span>
        <h3>今日缘分关键词，三张全给你</h3>
        <p>每天 0 点换一批。拆开看看今天宜挑什么——看上直接收进卡组。</p>
      </div>
      <div className="daily-pack-row">
        {picks.map((entry, index) => {
          const meta = cardMetaFor(entry)
          const isOpen = opened.has(entry.id)
          if (!isOpen) {
            return (
              <button
                aria-label={`拆开第 ${index + 1} 张卡`}
                className="pack-card pack-back"
                key={entry.id}
                onClick={() => openCard(entry.id)}
                type="button"
              >
                <span className="pack-back-q" aria-hidden="true">?</span>
                <span className="pack-back-hint">点我拆卡</span>
              </button>
            )
          }
          const active = isActive(entry.id)
          return (
            <div className="pack-card pack-open" data-tier={meta.tier} key={entry.id}>
              <span className="dc-rays" aria-hidden="true" />
              <span className="dc-ribbon">{meta.cardName}</span>
              <span className="dc-medal pack-medal"><CardArt kind={meta.art} size={64} /></span>
              <span className="dc-flavor">{meta.flavor}</span>
              <span className="dc-tierline">✦ {meta.tier} · {CARD_TIER_NAMES[meta.tier]} ✦</span>
              <div className="dc-actions">
                <Chip active={active} tone="mint" onClick={() => onToggle(entry.id)}>{active ? '已加入' : '加入条件'}</Chip>
              </div>
            </div>
          )
        })}
      </div>
      {opened.size < picks.length && (
        <button className="text-button pack-openall" type="button" onClick={openAll}>性子急？一次性全拆开 →</button>
      )}
    </section>
  )
}
