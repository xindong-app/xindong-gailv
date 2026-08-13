// 小人淘汰赛 2.0 —— 帧数据来自引擎的链式分解(result.frames),
// 动画只是表演, 每一刀的幸存人数都是引擎算出来的真实估算。
import { useEffect, useRef, useState } from 'react'
import { formatCount } from '../engine/modelEngine'
import type { FunnelFrame } from './funnelFrames'
import { ROSTER, rnd, type Prof } from './roster'

const TOTAL = 80
const INK = '#3b3050'
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#ffeeb0', '#f5c1d4']

// ---------- 各关卡遗言弹幕 ----------
const LAST_WORDS: Record<string, string[]> = {
  'appearance.height': ['就差 2cm 啊!!', '我恨我的基因', '下辈子先长个儿'],
  'appearance.body_type': ['奶茶害我不轻', '明天就减肥…真的', '身材管理大失败'],
  'economy.income': ['搞钱去了, 勿念', '穷是我的错吗', '我先去加班了'],
  'economy.wealth': ['输在起跑线的存折', '家里没矿, 告辞', '六个钱包都是空的'],
  'economy.house': ['房价你赔我青春', '六个钱包也不够', '租房也有尊严!'],
  'economy.vehicle': ['地铁其实挺好', '驾照白考了', '摇号八年没中'],
  'education.level': ['当年该考研的', '学历改变命运…吗', '专升本了解一下'],
  'lifestyle.smoking': ['戒烟第一天打卡', '电子烟算烟吗'],
  'lifestyle.drinking': ['为了爱情我戒', '只喝亿点点'],
  'appearance.hair_full': ['秃然离场', '假发已经下单', '植发分期中'],
}
const GENERIC_LAST_WORDS = ['我不服!', '下次一定', '先走一步']

interface Ghost { id: number; text: string; x: number; gr: number }

function roast(factor: number): string {
  if (factor < 0.02) return '一回头, 人没了…'
  if (factor < 0.08) return '这一刀下去, 尸横遍野'
  if (factor < 0.2) return '哗啦啦下班一大片'
  if (factor < 0.45) return '刷刷往下掉, 拦都拦不住'
  if (factor < 0.75) return '还行, 只下班了小一半'
  if (factor < 0.99) return '温柔一刀, 问题不大'
  return '全员通过, 气氛组狂喜'
}

function Person({ color, prof, out, delay, fx, fr, hopClass, hopDelay }: {
  color: string; prof: Prof; out: boolean; delay: number; fx: number; fr: number
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
        <path d="M5 44 Q5 24 17 24 Q29 24 29 44 Z" fill={color} stroke={INK} strokeWidth="1.7" />
        <circle cx="17" cy="13" r="7.5" fill={color} stroke={INK} strokeWidth="1.7" />
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

export function FunFunnel({ pool, frames }: { pool: number; frames: readonly FunnelFrame[] }) {
  const safePool = pool > 0 ? pool : 1 // 防 0 池除零
  const stageCounts: number[] = [TOTAL]
  for (const frame of frames) {
    stageCounts.push(Math.max(0, Math.round((TOTAL * frame.survivors) / safePool)))
  }
  const finalCount = stageCounts[stageCounts.length - 1]
  const perPerson = pool > 0 ? pool / TOTAL : 0
  const hopClass = frames.length % 2 === 0 ? 'hop-a' : 'hop-b'

  // ---------- 遗言弹幕 ----------
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const prevFinal = useRef(finalCount)
  const prevFrames = useRef<Map<string, number>>(new Map())
  useEffect(() => {
    if (finalCount < prevFinal.current && frames.length > 0) {
      // 找出本轮变化最大的关卡配台词(改中间条件也不会张冠李戴)
      let culprit = frames[frames.length - 1]
      let best = -1
      for (const frame of frames) {
        const prev = prevFrames.current.get(frame.dimensionId)
        const change = prev == null ? 1 : Math.abs(Math.log(Math.max(1e-9, frame.factor) / Math.max(1e-9, prev)))
        if (change > best) {
          best = change
          culprit = frame
        }
      }
      const lines = LAST_WORDS[culprit.dimensionId] ?? GENERIC_LAST_WORDS
      const spawned: Ghost[] = Array.from({ length: 3 }, (_, k) => {
        const prof = ROSTER[Math.floor(Math.random() * ROSTER.length)]
        return {
          id: Date.now() + k,
          text: `${prof.emoji} ${prof.name}: ${lines[Math.floor(Math.random() * lines.length)]}`,
          x: 4 + Math.random() * 62,
          gr: (Math.random() - 0.5) * 6,
        }
      })
      const t0 = setTimeout(() => {
        setGhosts((g) => [...g.slice(-4), ...spawned])
      }, 0)
      const t = setTimeout(() => {
        setGhosts((g) => g.filter((x) => !spawned.some((n) => n.id === x.id)))
      }, 2700)
      prevFinal.current = finalCount
      prevFrames.current = new Map(frames.map((frame) => [frame.dimensionId, frame.factor]))
      return () => { clearTimeout(t0); clearTimeout(t) }
    }
    prevFinal.current = finalCount
    prevFrames.current = new Map(frames.map((frame) => [frame.dimensionId, frame.factor]))
    return undefined
  }, [finalCount, frames])

  return (
    <div className="fun-funnel">
      <div className="ff-meta">
        <span>小人是气氛组, 别拿我们数人头</span>
        <span>1 个小人 ≈ {formatCount(perPerson)}</span>
      </div>

      {/* 幸存者进度条 */}
      <div className="ff-progress">
        <div className="ff-progress-track">
          <div
            className="ff-progress-bar bar-flow"
            style={{ width: `${Math.max(1.5, (finalCount / TOTAL) * 100)}%` }}
          />
        </div>
        <div className="ff-progress-meta">
          <span>场上还剩 {finalCount} / {TOTAL} 个</span>
          <span>{frames.length > 0 ? `已闯过 ${frames.length} 关` : '全员摸鱼中, 等你开筛'}</span>
        </div>
      </div>

      {/* 小人阵列 + 遗言弹幕层 */}
      <div className="ff-arena">
        <div className="ff-grid">
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
        <div className="ff-ghost-layer">
          {ghosts.map((g) => (
            <div
              key={g.id}
              className="ghost-float"
              style={{ left: `${g.x}%`, ['--gr' as string]: `${g.gr}deg` }}
            >
              {g.text}
            </div>
          ))}
        </div>
      </div>

      {/* 每关真实数量(引擎链式分解, 帧因子相乘 = 最终结果) */}
      {frames.length > 0 && (
        <div className="ff-steps">
          <div className="ff-step ff-step-base">
            <span>🎯 初始目标池</span>
            <b>{formatCount(pool)}</b>
          </div>
          {frames.map((frame) => (
            <div key={frame.dimensionId} className="ff-step fade-up">
              <div className="ff-step-row">
                <span>{frame.emoji} {frame.label}</span>
                <b>剩 {formatCount(frame.survivors)}</b>
              </div>
              <div className="ff-step-sub">
                <span className="ff-roast">{roast(frame.factor)}</span>
                <span>淘汰 {((1 - frame.factor) * 100).toFixed(frame.factor > 0.1 ? 0 : 1)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
