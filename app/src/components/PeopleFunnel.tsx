import { useEffect, useRef, useState } from 'react'
import type { FunnelStep } from '../engine/calc'
import { fmtCount } from '../engine/calc'
import { ROSTER, rnd, type Prof } from '../engine/roster'

const TOTAL = 80
const INK = '#3b3050'
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#ffeeb0', '#f5c1d4']

// ---------- 各关卡遗言弹幕 ----------
const LAST_WORDS: Record<string, string[]> = {
  height: ['就差 2cm 啊!!', '我恨我的基因', '下辈子先长个儿'],
  bmi: ['奶茶害我不轻', '明天就减肥…真的', '身材管理大失败'],
  econ: ['搞钱去了, 勿念', '穷是我的错吗', '我先去加班了'],
  house: ['房价你赔我青春', '六个钱包也不够', '租房也有尊严!'],
  car: ['地铁其实挺好', '驾照白考了', '摇号八年没中'],
  edu: ['当年该考研的', '学历改变命运…吗', '专升本了解一下'],
  smoke: ['戒烟第一天打卡', '电子烟算烟吗'],
  drink: ['为了爱情我戒', '只喝亿点点'],
  hair: ['秃然离场', '假发已经下单', '植发分期中'],
  health: ['这就去体检', '枸杞已泡上', '健身房年卡办了'],
  intimacy: ['…无可奉告', '羞愤离场', '这是能说的吗'],
  bonus: ['连夜报名考公', '爸妈加油养老', '编制是我梦'],
  zodiac: ['星座不合, 告辞', '都怪水逆', '陶白白救我'],
  emotion: ['单身怪我咯', '我这就去相亲', '缘分还没到…吧'],
  mbti: ['I 人当场社死', '我们 NT 人不服', '人格不合, 告辞'],
  tattoo: ['花臂梦碎', '贴纸纹身算吗'],
}
const GENERIC_LAST_WORDS = ['我不服!', '下次一定', '先走一步']

interface Ghost { id: number; text: string; x: number; gr: number }

function roast(factor: number): string {
  if (factor < 0.02) return '一回头, 人没了…'
  if (factor < 0.08) return '这一刀下去, 尸横遍野'
  if (factor < 0.2) return '哗啦啦下班一大片'
  if (factor < 0.45) return '刷刷往下掉, 拦都拦不住'
  if (factor < 0.75) return '还行, 只下班了小一半'
  return '温柔一刀, 问题不大'
}

function Person({ color, prof, out, delay, fx, fr, hopClass, hopDelay }: {
  color: string; prof: Prof; out: boolean; delay: number; fx: number; fr: number;
  hopClass: string; hopDelay: number
}) {
  return (
    <div
      className={`person ${out ? 'out' : `alive ${hopClass}`}`}
      title={prof.name}
      style={{
        transitionDelay: `${delay}ms`,
        animationDelay: `${hopDelay}ms`,
        ['--fx' as string]: `${fx}px`,
        ['--fr' as string]: `${fr}deg`,
      }}
    >
      <svg width="32" height="44" viewBox="0 0 34 46">
        {/* 身体 */}
        <path d="M5 44 Q5 24 17 24 Q29 24 29 44 Z" fill={color} stroke={INK} strokeWidth="1.7" />
        {/* 头 */}
        <circle cx="17" cy="13" r="7.5" fill={color} stroke={INK} strokeWidth="1.7" />
        {/* 职业装扮 */}
        {!out && (
          <>
            {prof.face ?? (
              <>
                <circle cx="14" cy="12" r="1" fill={INK} />
                <circle cx="20" cy="12" r="1" fill={INK} />
              </>
            )}
            <path d="M14 16 Q17 18.2 20 16" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
            {prof.hat}
            {prof.body}
          </>
        )}
        {out && (
          <g stroke={INK} strokeWidth="1.2" strokeLinecap="round">
            <path d="M12.5 10.5 L15.5 13.5 M15.5 10.5 L12.5 13.5" />
            <path d="M18.5 10.5 L21.5 13.5 M21.5 10.5 L18.5 13.5" />
            <path d="M14 17.5 Q17 15.8 20 17.5" fill="none" />
          </g>
        )}
      </svg>
    </div>
  )
}

export default function PeopleFunnel({ pool, steps }: { pool: number; steps: FunnelStep[] }) {
  const safePool = pool > 0 ? pool : 1 // 防 0 池除零
  const stageCounts: number[] = [TOTAL]
  for (const s of steps) {
    stageCounts.push(Math.max(0, Math.round((TOTAL * s.survivors) / safePool)))
  }
  const finalCount = stageCounts[stageCounts.length - 1]
  const perPerson = pool > 0 ? pool / TOTAL : 0
  const hopClass = steps.length % 2 === 0 ? 'hop-a' : 'hop-b'

  // ---------- 遗言弹幕 ----------
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const prevFinal = useRef(finalCount)
  const prevSteps = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    if (finalCount < prevFinal.current && steps.length > 0) {
      // 找出本轮变化最大的关卡配台词(改中间条件也不会张冠李戴)
      let culprit = steps[steps.length - 1]
      let best = -1
      for (const s of steps) {
        const prev = prevSteps.current.get(s.key)
        const change = prev == null ? 1 : Math.abs(Math.log(s.factor / prev))
        if (change > best) {
          best = change
          culprit = s
        }
      }
      const lines = LAST_WORDS[culprit.key] ?? GENERIC_LAST_WORDS
      const spawned: Ghost[] = Array.from({ length: 3 }, (_, k) => {
        const prof = ROSTER[Math.floor(Math.random() * ROSTER.length)]
        return {
          id: Date.now() + k,
          text: `${prof.emoji} ${prof.name}: ${lines[Math.floor(Math.random() * lines.length)]}`,
          x: 4 + Math.random() * 62,
          gr: (Math.random() - 0.5) * 6,
        }
      })
      // 延迟到下一帧再 setState, 避免 effect 内同步级联渲染
      const t0 = setTimeout(() => {
        setGhosts((g) => [...g.slice(-4), ...spawned])
      }, 0)
      const t = setTimeout(() => {
        setGhosts((g) => g.filter((x) => !spawned.some((n) => n.id === x.id)))
      }, 2700)
      prevFinal.current = finalCount
      prevSteps.current = new Map(steps.map((s) => [s.key, s.factor]))
      return () => { clearTimeout(t0); clearTimeout(t) }
    }
    prevFinal.current = finalCount
    prevSteps.current = new Map(steps.map((s) => [s.key, s.factor]))
    return undefined
  }, [finalCount, steps])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-[11px] text-[#3b3050]/55">
        <span>小人是气氛组, 别拿我们数人头</span>
        <span>1 个小人 ≈ {fmtCount(perPerson)}</span>
      </div>

      {/* 幸存者进度条 */}
      <div className="mb-3">
        <div className="h-4 overflow-hidden rounded-full border-2 border-[#3b3050] bg-white/80">
          <div
            className="bar-flow h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(1.5, (finalCount / TOTAL) * 100)}%`,
              background: 'linear-gradient(90deg, #f5a623, #f2979b)',
            }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-[#3b3050]/60">
          <span>场上还剩 {finalCount} / {TOTAL} 个</span>
          <span>{steps.length > 0 ? `已闯过 ${steps.length} 关` : '全员摸鱼中, 等你开筛'}</span>
        </div>
      </div>

      {/* 小人阵列 + 遗言弹幕层 */}
      <div className="relative">
        <div className="grid grid-cols-10 gap-x-1 gap-y-0.5 justify-items-center">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const out = i >= finalCount
            return (
              <Person
                key={i}
                color={PALETTE[i % PALETTE.length]}
                prof={ROSTER[Math.floor(rnd(i, 9) * ROSTER.length)]}
                out={out}
                delay={rnd(i, 1) * 480}
                fx={(rnd(i, 2) - 0.5) * 56}
                fr={(rnd(i, 3) > 0.5 ? 1 : -1) * (70 + rnd(i, 4) * 50)}
                hopClass={hopClass}
                hopDelay={rnd(i, 5) * 220}
              />
            )
          })}
        </div>
        {/* 弹幕 */}
        <div className="pointer-events-none absolute inset-0">
          {ghosts.map((g) => (
            <div
              key={g.id}
              className="ghost-float absolute rounded-full border-2 border-[#3b3050] bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-[#3b3050] shadow-[2px_2px_0_#3b3050]"
              style={{ left: `${g.x}%`, bottom: '18%', ['--gr' as string]: `${g.gr}deg` }}
            >
              {g.text}
            </div>
          ))}
        </div>
      </div>

      {/* 每步真实数量 */}
      {steps.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-1.5 text-xs border border-[#e0d5c3]">
            <span className="text-[#3b3050]/80">🎯 初始目标池</span>
            <span className="font-bold text-[#3b3050]">{fmtCount(pool)}</span>
          </div>
          {steps.map((s) => (
            <div key={s.key} className="fade-up rounded-xl bg-white/70 px-3 py-1.5 text-xs border border-[#e0d5c3]">
              <div className="flex items-center justify-between">
                <span className="text-[#3b3050]">{s.emoji} {s.label} <span className="text-[#3b3050]/50">({s.note})</span></span>
                <span className="font-bold text-[#3b3050]">剩 {fmtCount(s.survivors)}</span>
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[#3b3050]/50">
                <span className="font-hand text-sm text-[#a55a35]">{roast(s.factor)}</span>
                <span>淘汰 {((1 - s.factor) * 100).toFixed(s.factor > 0.1 ? 0 : 1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
