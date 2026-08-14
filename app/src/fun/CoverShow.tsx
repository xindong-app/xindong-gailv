// 封面主场景 —— 海报即预告片: 天鹅绒舞台上, 小人排队穿过"心动筛门",
// 多数掉落淘汰, 偶尔一个穿门发光。玩法 3 秒看懂。
// 纯 CSS 驱动, 零 JS 帧; reduced-motion 给定格剧照。
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#f5c1d4']
const INK = '#241c33'

interface WalkerSpec { color: string; delay: number; passes: boolean; staticX: number }

const WALKERS: readonly WalkerSpec[] = PALETTE.map((color, index) => ({
  color,
  delay: index * 1.25,
  passes: index === 3, // 六进一: 只有他穿过筛门发光
  staticX: 8 + index * 13,
}))

function MiniPerson({ color, glow }: { color: string; glow?: boolean }) {
  return (
    <svg width="34" height="47" viewBox="0 0 34 46" aria-hidden="true" className={glow ? 'walker-glow' : undefined}>
      <path d="M5 44 Q5 24 17 24 Q29 24 29 44 Z" fill={color} stroke={INK} strokeWidth="1.7" />
      <circle cx="17" cy="13" r="7.5" fill={color} stroke={INK} strokeWidth="1.7" />
      <circle cx="14" cy="12" r="1" fill={INK} />
      <circle cx="20" cy="12" r="1" fill={INK} />
      <path d="M14 16 Q17 18.2 20 16" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function CoverShow() {
  return (
    <div className="cover-scene" aria-hidden="true">
      <div className="cover-scene-spotlight" />
      <div className="cover-scene-footlights" />
      <div className="cover-gate">
        <span className="cover-gate-heart">♡</span>
        <i /><i /><i />
      </div>
      <div className="cover-trapdoor" />
      <div className="cover-slash" />
      {WALKERS.map((walker, index) => (
        <div
          key={index}
          className={`cover-walker ${walker.passes ? 'walker-pass' : 'walker-drop'}`}
          style={{
            ['--walk-delay' as string]: `${walker.delay}s`,
            ['--static-x' as string]: `${walker.staticX}%`,
          }}
        >
          <MiniPerson color={walker.color} glow={walker.passes} />
        </div>
      ))}
      <div className="cover-floor" />
    </div>
  )
}
