// 封面循环小剧场 —— 一排小人蹦跶着跳进大爱心, 无限循环
// 纯 CSS 驱动, 无 JS 动画帧; reduced-motion 直接静帧
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3']
const INK = '#3b3050'

function MiniPerson({ color }: { color: string }) {
  return (
    <svg width="30" height="42" viewBox="0 0 34 46" aria-hidden="true">
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
    <div className="cover-show" aria-hidden="true">
      <div className="cover-heart">♡</div>
      {PALETTE.map((color, index) => (
        <div
          key={index}
          className="cover-walker"
          style={{
            ['--walk-delay' as string]: `${index * 1.5}s`,
            ['--static-x' as string]: `${6 + index * 15}%`,
          }}
        >
          <MiniPerson color={color} />
        </div>
      ))}
      <div className="cover-floor" />
    </div>
  )
}