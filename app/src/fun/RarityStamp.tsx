// 稀有度图鉴卡: 卡框分级(N 素框 → M 烫金流光) + 最后幸存者小人登场 + 盖戳砸入
import { PersonSvg } from './person'
import { survivorProfFull } from './roster'
import type { Tier } from './rarity'

const SURVIVOR_COLORS = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#ffeeb0']

export function RarityStamp({ tier, rarityText, revealKey, survivorCount }: {
  tier: Tier
  rarityText: string
  revealKey?: string | number
  survivorCount?: number
}) {
  const survivor = survivorProfFull(survivorCount ?? 0)
  const color = SURVIVOR_COLORS[(survivorCount ?? 0) % SURVIVOR_COLORS.length]
  return (
    <div className="rarity-stamp-wrap">
      <div
        key={`${tier.key}:${revealKey ?? ''}`}
        className={`rarity-stamp rarity-card stamp-in tier-shine tier-${tier.key}`}
        style={{ background: tier.bg, color: tier.fg }}
      >
        <b className="rarity-card-label">{tier.label}</b>
        {survivor && (
          <span className="rarity-card-survivor" title={`压轴下班的是: ${survivor.name}`}>
            <PersonSvg color={color} seed={survivorCount ?? 0} prof={survivor} width={44} height={60} />
          </span>
        )}
        <span className="rarity-card-text">{rarityText}</span>
      </div>
      <p className="rarity-comment">{tier.comment}</p>
    </div>
  )
}
