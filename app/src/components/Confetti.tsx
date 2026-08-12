// SSR 及以上稀有度触发: emoji 彩带雨
import { useMemo } from 'react'

const EMOJIS = ['🎉', '💖', '✨', '🍬', '🌟', '💘', '🧧']

// 确定性伪随机(由 seed 决定, 渲染纯净, 同一份结果同一场雨)
function seededRnd(seed: string, i: number, salt: number): number {
  let h = 2166136261
  for (let c = 0; c < seed.length; c++) h = (h ^ seed.charCodeAt(c)) * 16777619
  const x = Math.sin((h >>> 0) * 0.001 + i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export default function Confetti({ seed }: { seed: string }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: `${seed}-${i}`,
        left: seededRnd(seed, i, 1) * 100,
        delay: seededRnd(seed, i, 2) * 0.9,
        dur: 2.2 + seededRnd(seed, i, 3) * 1.6,
        size: 16 + seededRnd(seed, i, 4) * 22,
        emoji: EMOJIS[i % EMOJIS.length],
        drift: (seededRnd(seed, i, 5) - 0.5) * 120,
      })),
    [seed],
  )
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece absolute -top-10"
          style={{
            left: `${p.left}%`,
            fontSize: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            ['--drift' as string]: `${p.drift}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
