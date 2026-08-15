// 维度图鉴 —— 69 个维度的收集册: 用过的点亮, 没用过的是神秘剪影。
import { useState } from 'react'
import { DIMENSION_REGISTRY } from '../../model/dimensions'
import { playCardFlip } from '../sound'
import { CardArt } from './cardArt'
import { loadCollected } from './album'
import { cardMetaFor } from './cardMeta'

export function CardAlbum() {
  const [open, setOpen] = useState(false)
  const [collected, setCollected] = useState<ReadonlySet<string>>(() => loadCollected())
  const total = DIMENSION_REGISTRY.length
  const got = DIMENSION_REGISTRY.filter((entry) => collected.has(entry.id)).length

  const toggle = () => {
    if (!open) {
      playCardFlip()
      setCollected(loadCollected()) // 打开时刷新, 别的时候不读存储
    }
    setOpen((prev) => !prev)
  }

  return (
    <section className="card-album" aria-label="维度图鉴">
      <button aria-expanded={open} className="album-toggle" onClick={toggle} type="button">
        <span className="album-toggle-left">
          <span className="album-book" aria-hidden="true">📖</span>
          维度图鉴
        </span>
        <span className="album-progress">
          已收集 <b>{got}</b> / {total}
          <span className="album-bar"><i style={{ width: `${Math.max(2, (got / total) * 100)}%` }} /></span>
        </span>
        <span aria-hidden="true" className="album-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="album-grid">
          {DIMENSION_REGISTRY.map((entry) => {
            const unlocked = collected.has(entry.id)
            const meta = cardMetaFor(entry)
            return (
              <div
                className={`album-cell${unlocked ? ' got' : ''}`}
                data-tier={unlocked ? meta.tier : undefined}
                key={entry.id}
                title={unlocked ? `${meta.cardName} · ${entry.label}` : '???'}
              >
                {unlocked ? (
                  <>
                    <span className="album-medal"><CardArt kind={meta.art} size={34} /></span>
                    <b>{meta.cardName}</b>
                    <small>{entry.label}</small>
                  </>
                ) : (
                  <>
                    <span className="album-unknown" aria-hidden="true">?</span>
                    <small>尚未点亮</small>
                  </>
                )}
                <span className="visually-hidden">
                  {unlocked ? `已收集：${meta.cardName}（${entry.label}）` : `未收集：某个${entry.category}维度`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
