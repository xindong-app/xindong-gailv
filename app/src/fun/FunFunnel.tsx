// 小人淘汰赛 2.0 —— 帧数据来自趣味层链式分解(buildFunnelFrames),
// 动画只是表演, 每一刀的幸存人数都是引擎公开接口算出来的真实估算。
import { useEffect, useRef, useState } from 'react'
import { formatCount } from '../engine/modelEngine'
import type { FunnelFrame } from './funnelFrames'
import { rnd, type Prof } from './roster'
import { PersonSvg, SoulGhost } from './person'
import { pickProf } from './skins'
import { isSoundOn, playLevelUp, playSlash, setSoundOn } from './sound'

const TOTAL = 80
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#ffeeb0', '#f5c1d4']

// ---------- 各关卡遗言弹幕 ----------
// v3: 只有可量化维度会出现在漏斗里(身高/吸烟/饮酒);
// 不拿收入、身体、疾病、婚史开玩笑。
const LAST_WORDS: Record<string, string[]> = {
  'appearance.height': ['就差 2cm 啊!!', '我去踩个高跷', '尺子今天也很严格'],
  'education.level': ['当年该考研的', '书到用时方恨少', '学历这关, 我认栽'],
  'lifestyle.smoking': ['戒烟第一天打卡', '电子烟算烟吗'],
  'lifestyle.drinking': ['先戒为敬', '只喝亿点点'],
}
const GENERIC_LAST_WORDS = ['我不服!', '下次一定', '先走一步']

interface Ghost { id: number; text: string; x: number; gr: number }
interface Banner { id: number; text: string }

function roast(factor: number): string {
  if (factor < 0.02) return '一回头, 人没了…'
  if (factor < 0.08) return '这一刀下去, 尸横遍野'
  if (factor < 0.2) return '哗啦啦下班一大片'
  if (factor < 0.45) return '刷刷往下掉, 拦都拦不住'
  if (factor < 0.75) return '还行, 只下班了小一半'
  if (factor < 0.99) return '温柔一刀, 问题不大'
  return '全员通过, 气氛组狂喜'
}

function Person({ color, prof, out, delay, fx, fr, hopClass, hopDelay, nervous, seed }: {
  color: string; prof: Prof; out: boolean; delay: number; fx: number; fr: number
  hopClass: string; hopDelay: number; nervous: boolean; seed: number
}) {
  return (
    <div
      className={`person ${out ? 'out' : `alive ${hopClass}`} ${prof.hidden && !out ? 'is-caishen' : ''}`}
      title={prof.name}
      style={{
        transitionDelay: `${delay}ms`,
        animationDelay: `${hopDelay}ms`,
        ['--fx' as string]: `${fx}px`,
        ['--fr' as string]: `${fr}deg`,
        ['--soul-delay' as string]: `${delay}ms`,
      }}
    >
      <PersonSvg color={color} prof={prof} out={out} seed={seed} nervous={nervous && !out} />
      {out && <SoulGhost />}
    </div>
  )
}

export function FunFunnel({ pool, frames, cities }: { pool: number; frames: readonly FunnelFrame[]; cities: readonly string[] }) {
  const safePool = pool > 0 ? pool : 1 // 防 0 池除零
  const stageCounts: number[] = [TOTAL]
  for (const frame of frames) {
    stageCounts.push(Math.max(0, Math.round((TOTAL * frame.survivors) / safePool)))
  }
  const finalCount = stageCounts[stageCounts.length - 1]
  const perPerson = pool > 0 ? pool / TOTAL : 0
  const hopClass = frames.length % 2 === 0 ? 'hop-a' : 'hop-b'
  const [soundOn, setSoundOnState] = useState(() => isSoundOn())

  // ---------- 遗言弹幕 + 刀光 + 震屏 ----------
  const [ghosts, setGhosts] = useState<Ghost[]>([])
  const [slashId, setSlashId] = useState(0)
  const [banner, setBanner] = useState<Banner | null>(null)
  const prevFinal = useRef(finalCount)
  const prevFrames = useRef<Map<string, number>>(new Map())
  const prevFrameCount = useRef(frames.length)

  useEffect(() => {
    // 新关卡开启: 横幅 + 叮
    if (frames.length > prevFrameCount.current) {
      const latest = frames[frames.length - 1]
      const bannerId = Date.now()
      const t0 = setTimeout(() => {
        setBanner({ id: bannerId, text: `⚔️ 第 ${frames.length} 关 · ${latest.label}` })
        playLevelUp()
      }, 0)
      const t1 = setTimeout(() => setBanner((b) => (b?.id === bannerId ? null : b)), 1600)
      prevFrameCount.current = frames.length
      prevFinal.current = finalCount
      prevFrames.current = new Map(frames.map((frame) => [frame.dimensionId, frame.factor]))
      return () => { clearTimeout(t0); clearTimeout(t1) }
    }
    prevFrameCount.current = frames.length

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
        const prof = pickProf(Math.floor(Math.random() * TOTAL), cities)
        // 一半概率说职业遗言, 一半概率说关卡吐槽
        const linePool = prof.bye && Math.random() < 0.55 ? prof.bye : lines
        return {
          id: Date.now() + k,
          text: `${prof.emoji} ${prof.name}: ${linePool[Math.floor(Math.random() * linePool.length)]}`,
          x: 4 + Math.random() * 62,
          gr: (Math.random() - 0.5) * 6,
        }
      })
      const t0 = setTimeout(() => {
        setGhosts((g) => [...g.slice(-4), ...spawned])
        setSlashId((id) => id + 1) // 刀光 + 震屏
        playSlash()
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
  }, [finalCount, frames, cities])

  const toggleSound = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundOnState(next)
    if (next) playLevelUp() // 开启时叮一声确认
  }

  return (
    <div className="fun-funnel">
      <div className="ff-meta">
        <span>小人是气氛组, 别拿我们数人头 · 1 个小人 ≈ {formatCount(perPerson)}</span>
        <button
          aria-pressed={soundOn}
          className="ff-sound-btn"
          title={soundOn ? '关闭音效' : '开启音效'}
          type="button"
          onClick={toggleSound}
        >
          {soundOn ? '🔊 音效开' : '🔇 音效关'}
        </button>
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

      {/* 小人阵列 + 刀光 + 弹幕层 */}
      <div className={`ff-arena ${slashId > 0 ? 'shake' : ''}`}>
        {slashId > 0 && <div key={slashId} aria-hidden="true" className="ff-slash" onAnimationEnd={() => setSlashId(0)} />}
        {banner && <div key={banner.id} className="ff-banner" role="status">{banner.text}</div>}
        <div className="ff-grid">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const out = i >= finalCount
            return (
              <Person
                key={i}
                color={PALETTE[i % PALETTE.length]}
                prof={pickProf(i, cities)}
                out={out}
                delay={rnd(i, 1) * 480}
                fx={(rnd(i, 2) - 0.5) * 56}
                fr={(rnd(i, 3) > 0.5 ? 1 : -1) * (70 + rnd(i, 4) * 50)}
                hopClass={hopClass}
                hopDelay={rnd(i, 5) * 220}
                nervous={slashId > 0}
                seed={i}
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

      {/* 每关真实数量(链式分解, 帧因子相乘 = 最终结果) */}
      {frames.length > 0 && (
        <div className="ff-steps">
          <div className="ff-step ff-step-base">
            <span>🎯 初始目标池</span>
            <b>{formatCount(pool)}</b>
          </div>
          {frames.map((frame, index) => (
            <div key={frame.dimensionId} className="ff-step fade-up">
              <div className="ff-step-row">
                <span><span className="ff-step-no">第{index + 1}关</span>{frame.emoji} {frame.label}</span>
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
