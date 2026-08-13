// 职业名册 + 确定性随机 —— 小人淘汰赛的气氛组
import type { ReactNode } from 'react'

const INK = '#3b3050'

// 确定性伪随机(同一小人每轮表现一致)
export function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

// ---------- 职业装扮(viewBox 34x46, 头心 17,13 r7.5) ----------
export interface Prof {
  name: string
  emoji: string
  hat?: ReactNode
  face?: ReactNode
  body?: ReactNode
}

export const ROSTER: Prof[] = [
  {
    name: '程序员', emoji: '👨‍💻',
    face: (
      <g stroke={INK} strokeWidth="1.1" fill="white">
        <circle cx="14" cy="12" r="2.1" />
        <circle cx="20" cy="12" r="2.1" />
        <path d="M16.1 12 h1.8 M11.9 11.5 L9.5 11 M22.1 11.5 L24.5 11" fill="none" />
        <circle cx="14" cy="12" r="0.7" fill={INK} stroke="none" />
        <circle cx="20" cy="12" r="0.7" fill={INK} stroke="none" />
      </g>
    ),
  },
  {
    name: '医生', emoji: '🧑‍⚕️',
    hat: (
      <g>
        <rect x="9.5" y="1.5" width="15" height="6" rx="2.5" fill="white" stroke={INK} strokeWidth="1.3" />
        <path d="M17 2.8 v3.4 M15.3 4.5 h3.4" stroke="#e2547a" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
  },
  {
    name: '厨师', emoji: '👨‍🍳',
    hat: (
      <g fill="white" stroke={INK} strokeWidth="1.2">
        <circle cx="12" cy="4.5" r="3" />
        <circle cx="17" cy="3.2" r="3.4" />
        <circle cx="22" cy="4.5" r="3" />
        <rect x="10.5" y="5" width="13" height="3.5" rx="1.5" />
      </g>
    ),
  },
  {
    name: '工人', emoji: '👷',
    hat: (
      <g>
        <path d="M8 10 A 9 9 0 0 1 26 10 Z" fill="#f5a623" stroke={INK} strokeWidth="1.3" />
        <rect x="6.5" y="9.4" width="21" height="2.2" rx="1.1" fill="#f5a623" stroke={INK} strokeWidth="1.1" />
      </g>
    ),
  },
  {
    name: '警察', emoji: '👮',
    hat: (
      <g>
        <path d="M9 9.5 A 8 8 0 0 1 25 9.5 L25 7 A 8 5 0 0 0 9 7 Z" fill="#5b7fb8" stroke={INK} strokeWidth="1.3" />
        <path d="M9 9.5 Q17 12 25 9.5 L25 11 Q17 13.5 9 11 Z" fill="#41598a" stroke={INK} strokeWidth="1.1" />
        <circle cx="17" cy="6" r="1.2" fill="#f5a623" stroke={INK} strokeWidth="0.8" />
      </g>
    ),
  },
  {
    name: '艺术家', emoji: '🧑‍🎨',
    hat: (
      <g transform="rotate(-14 17 8)">
        <ellipse cx="17" cy="7.5" rx="8.5" ry="3.6" fill="#a03d7a" stroke={INK} strokeWidth="1.3" />
        <circle cx="17" cy="4.4" r="1" fill="#a03d7a" stroke={INK} strokeWidth="0.9" />
      </g>
    ),
  },
  {
    name: '运动员', emoji: '🏃',
    hat: <rect x="9.7" y="7" width="14.6" height="3" rx="1.5" fill="#e2547a" stroke={INK} strokeWidth="1.1" />,
  },
  {
    name: '农民', emoji: '👨‍🌾',
    hat: (
      <g>
        <ellipse cx="17" cy="9" rx="11" ry="2.6" fill="#e8c468" stroke={INK} strokeWidth="1.2" />
        <path d="M11 8.6 A 6 5 0 0 1 23 8.6 Z" fill="#e8c468" stroke={INK} strokeWidth="1.2" />
      </g>
    ),
  },
  {
    name: '白领', emoji: '💼',
    body: <path d="M17 26 L15 30 L17 38 L19 30 Z" fill="#e2547a" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />,
  },
  {
    name: '学生', emoji: '🧢',
    hat: (
      <g>
        <path d="M9.5 9 A 7.5 7.5 0 0 1 24.5 9 Z" fill="#5ba8e2" stroke={INK} strokeWidth="1.3" />
        <ellipse cx="24" cy="9.6" rx="4.5" ry="1.6" fill="#5ba8e2" stroke={INK} strokeWidth="1.1" transform="rotate(12 24 9.6)" />
      </g>
    ),
  },
  {
    name: '科学家', emoji: '🧑‍🔬',
    face: (
      <g>
        <rect x="10.5" y="9.8" width="13" height="4.6" rx="2.3" fill="#cdeafa" opacity="0.85" stroke={INK} strokeWidth="1.2" />
        <circle cx="14" cy="12" r="0.8" fill={INK} />
        <circle cx="20" cy="12" r="0.8" fill={INK} />
      </g>
    ),
  },
  {
    name: '主持人', emoji: '🎤',
    body: (
      <g fill="#e2547a" stroke={INK} strokeWidth="1">
        <path d="M17 27 L13.5 25 L13.5 29 Z" />
        <path d="M17 27 L20.5 25 L20.5 29 Z" />
        <circle cx="17" cy="27" r="1.3" />
      </g>
    ),
  },
]

// 场上「最后下班」的小人(用于分享卡剧本): 与漏斗内的确定性随机一致
export function survivorProf(survivorCount: number): { name: string; emoji: string } | null {
  if (!Number.isFinite(survivorCount) || survivorCount <= 0) return null
  const i = survivorCount - 1
  const p = ROSTER[Math.floor(rnd(i, 9) * ROSTER.length)]
  return { name: p.name, emoji: p.emoji }
}
