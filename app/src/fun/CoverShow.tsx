// 封面主场景 —— 海报即预告片: 天鹅绒舞台上, 小人排队穿过"心动筛门",
// 多数掉落淘汰, 偶尔一个穿门发光。玩法 3 秒看懂。
// 纯 CSS 驱动, 零 JS 帧; reduced-motion 给定格剧照。
import { PersonSvg } from './person'

const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#f5c1d4']
const INK = '#241c33'

interface WalkerSpec { color: string; delay: number; passes: boolean; staticX: number }

const WALKERS: readonly WalkerSpec[] = PALETTE.map((color, index) => ({
  color,
  delay: index * 1.25,
  passes: index === 3, // 六进一: 只有他穿过筛门发光
  staticX: 8 + index * 13,
}))

function MiniPerson({ color, seed }: { color: string; seed: number }) {
  return <PersonSvg color={color} ink={INK} seed={seed} width={34} height={47} />
}

export function CoverShow() {
  return (
    <div className="cover-scene" aria-hidden="true">
      <div className="cover-scene-spotlight" />
      <div className="circus-sign">
        <span className="circus-string circus-string-left" />
        <span className="circus-string circus-string-right" />
        <div className="circus-board">
          <b>心动淘汰赛</b>
          <small>不预测爱情 · 只数人头</small>
        </div>
      </div>
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
          <MiniPerson color={walker.color} seed={index * 7 + 3} />
        </div>
      ))}
      <div className="cover-floor" />
    </div>
  )
}
