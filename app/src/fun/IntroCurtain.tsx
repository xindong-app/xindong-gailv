// 幕布开场 —— 每会话只播一次, 可跳过; 动画最后一帧直接衔接主界面(幕布即界面的第一层)
import { useEffect, useMemo, useState } from 'react'
import { playTada } from './sound'
import { rnd } from './roster'

const TITLE = [...'心动概率局']
const RUNNERS = 14
const PALETTE = ['#ffd9e2', '#ffd9b8', '#cdeafa', '#e6dbf7', '#ddefd3', '#ffeeb0']
const INK = '#3b3050'

function Runner({ index }: { index: number }) {
  const fromLeft = index % 2 === 0
  const color = PALETTE[index % PALETTE.length]
  const delay = 120 + index * 70
  const bottom = 18 + rnd(index, 11) * 26
  return (
    <svg
      aria-hidden="true"
      className={`intro-runner ${fromLeft ? 'from-left' : 'from-right'}`}
      style={{ animationDelay: `${delay}ms`, bottom: `${bottom}%`, ['--run-x' as string]: `${8 + rnd(index, 12) * 30}vw` }}
      width="30"
      height="42"
      viewBox="0 0 34 46"
    >
      <path d="M5 44 Q5 24 17 24 Q29 24 29 44 Z" fill={color} stroke={INK} strokeWidth="1.7" />
      <circle cx="17" cy="13" r="7.5" fill={color} stroke={INK} strokeWidth="1.7" />
      <circle cx="14" cy="12" r="1" fill={INK} />
      <circle cx="20" cy="12" r="1" fill={INK} />
      <path d="M14 16 Q17 18.2 20 16" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function IntroCurtain({ onDone }: { onDone: () => void }) {
  const [parting, setParting] = useState(false)
  const reduced = useMemo(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false),
    [],
  )

  useEffect(() => {
    if (reduced) { onDone(); return }
    const tadaTimer = window.setTimeout(() => playTada(), 1500)
    const partTimer = window.setTimeout(() => setParting(true), 2600)
    const doneTimer = window.setTimeout(() => onDone(), 3500)
    return () => { window.clearTimeout(tadaTimer); window.clearTimeout(partTimer); window.clearTimeout(doneTimer) }
  }, [onDone, reduced])

  if (reduced) return null

  return (
    <div className={`intro${parting ? ' intro--parting' : ''}`} role="presentation">
      <div className="intro-curtain intro-curtain-left" aria-hidden="true" />
      <div className="intro-curtain intro-curtain-right" aria-hidden="true" />
      <div className="intro-stage" aria-hidden="true">
        <div className="intro-footlights" />
        {Array.from({ length: RUNNERS }).map((_, index) => <Runner key={index} index={index} />)}
        <h2 className="intro-title">
          {TITLE.map((char, index) => (
            <span key={char} style={{ animationDelay: `${1300 + index * 120}ms` }}>{char}</span>
          ))}
        </h2>
        <p className="intro-subtitle">一场你当导演的小人淘汰赛</p>
      </div>
      <button className="intro-skip" type="button" onClick={onDone}>跳过 ▸</button>
    </div>
  )
}
