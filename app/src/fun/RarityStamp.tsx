// 稀有度盖戳: 盖章式砸入 + 扫光, SSR 以上由外层触发彩带
import type { Tier } from './rarity'

export function RarityStamp({ tier, rarityText, revealKey }: { tier: Tier; rarityText: string; revealKey?: string | number }) {
  return (
    <div className="rarity-stamp-wrap">
      <div
        key={`${tier.key}:${revealKey ?? ''}`}
        className="rarity-stamp stamp-in tier-shine"
        style={{ background: tier.bg, color: tier.fg }}
      >
        <b>{tier.label}</b>
        <span>{rarityText}</span>
      </div>
      <p className="rarity-comment">{tier.comment}</p>
    </div>
  )
}
