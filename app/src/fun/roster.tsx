// 职业名册 + 确定性随机 —— 小人淘汰赛的气氛组
// 每个职业: 帽子认脸, 衣服认剪影, 遗言认梗。服装画在身体安全区(x9-25, y26-44)。
import type { ReactNode } from 'react'

const INK = '#3b3050'
const GOLD = '#f5c542'

// 确定性伪随机(同一小人每轮表现一致)
export function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export type BodyType = 'std' | 'round' | 'slim'

/** 体型三档: 圆润/纤细/标准, 确定性随机, 人群不再克隆 */
export function bodyTypeOf(seed: number): BodyType {
  const r = rnd(seed, 21)
  if (r < 0.22) return 'round'
  if (r < 0.42) return 'slim'
  return 'std'
}

// ---------- 职业装扮(viewBox 34x46, 头心 17,13 r7.5) ----------
export interface Prof {
  name: string
  emoji: string
  hat?: ReactNode
  face?: ReactNode
  body?: ReactNode
  /** 职业服装(身体区) */
  outfit?: ReactNode
  /** 自定义嘴型(默认微笑/开口笑) */
  mouth?: ReactNode
  /** 被淘汰时的职业遗言 */
  bye?: readonly string[]
  /** 隐藏款标记(金光特效) */
  hidden?: boolean
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
    outfit: (
      <g stroke={INK} strokeWidth="0.7" opacity="0.4">
        <path d="M13 26.5 V44 M21 26.5 V44 M9.5 33 H24.5" fill="none" />
      </g>
    ),
    bye: ['需求还没改完…', '这个 bug 是我写的, 我带走', '电脑帮我关一下'],
  },
  {
    name: '医生', emoji: '🧑‍⚕️',
    hat: (
      <g>
        <rect x="9.5" y="1.5" width="15" height="6" rx="2.5" fill="white" stroke={INK} strokeWidth="1.3" />
        <path d="M17 2.8 v3.4 M15.3 4.5 h3.4" stroke="#e2547a" strokeWidth="1.4" strokeLinecap="round" />
      </g>
    ),
    outfit: (
      <g>
        <path d="M10 26 L24 26 L24 44 L10 44 Z" fill="white" opacity="0.92" stroke={INK} strokeWidth="1" />
        <path d="M17 26 L14.6 30.5 M17 26 L19.4 30.5" stroke={INK} strokeWidth="1" fill="none" />
        <path d="M12.6 29.4 v3.4 M10.9 31.1 h3.4" stroke="#e2547a" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    ),
    bye: ['号还没挂完…', '先给自己挂个急诊'],
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
    outfit: (
      <g fill="white" stroke={INK} strokeWidth="1">
        <path d="M12 27.5 L22 27.5 L23.2 44 L10.8 44 Z" />
        <path d="M12 27.5 L17 25.2 L22 27.5" fill="none" />
      </g>
    ),
    bye: ['菜还在锅里!', '这勺我先放下了'],
  },
  {
    name: '工人', emoji: '👷',
    hat: (
      <g>
        <path d="M8 10 A 9 9 0 0 1 26 10 Z" fill="#f5a623" stroke={INK} strokeWidth="1.3" />
        <rect x="6.5" y="9.4" width="21" height="2.2" rx="1.1" fill="#f5a623" stroke={INK} strokeWidth="1.1" />
      </g>
    ),
    outfit: (
      <g stroke={INK} strokeWidth="1.6" fill="none">
        <path d="M12.6 25.8 L13.4 44 M21.4 25.8 L20.6 44" />
        <circle cx="13" cy="29" r="0.9" fill={INK} stroke="none" />
        <circle cx="21" cy="29" r="0.9" fill={INK} stroke="none" />
      </g>
    ),
    bye: ['安全帽留给下一位', '今天的砖搬到这'],
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
    outfit: (
      <g>
        <path d="M9.5 26 L24.5 26 L24.5 44 L9.5 44 Z" fill="#5b7fb8" opacity="0.85" stroke={INK} strokeWidth="1" />
        <circle cx="13" cy="30" r="1.3" fill={GOLD} stroke={INK} strokeWidth="0.8" />
      </g>
    ),
    bye: ['我先去值勤了', '维持秩序失败'],
  },
  {
    name: '艺术家', emoji: '🧑‍🎨',
    hat: (
      <g transform="rotate(-14 17 8)">
        <ellipse cx="17" cy="7.5" rx="8.5" ry="3.6" fill="#a03d7a" stroke={INK} strokeWidth="1.3" />
        <circle cx="17" cy="4.4" r="1" fill="#a03d7a" stroke={INK} strokeWidth="0.9" />
      </g>
    ),
    outfit: (
      <g>
        <path d="M10.5 26.5 L23.5 26.5 L23.5 44 L10.5 44 Z" fill="#f6f1e7" opacity="0.9" stroke={INK} strokeWidth="1" />
        <circle cx="13.5" cy="31" r="1.1" fill="#e2547a" />
        <circle cx="17.5" cy="34.5" r="1.1" fill="#5ba8e2" />
        <circle cx="21" cy="30" r="1.1" fill="#f5a623" />
      </g>
    ),
    bye: ['灵感先走一步', '这刀法很有表现主义'],
  },
  {
    name: '运动员', emoji: '🏃',
    hat: <rect x="9.7" y="7" width="14.6" height="3" rx="1.5" fill="#e2547a" stroke={INK} strokeWidth="1.1" />,
    outfit: (
      <g stroke={INK} strokeWidth="1">
        <path d="M11 26 L23 26 L23 44 L11 44 Z" fill="white" opacity="0.85" />
        <path d="M11 31 H23 M11 34.5 H23" stroke="#e2547a" strokeWidth="1.4" fill="none" />
      </g>
    ),
    bye: ['下半场替我跑', '体力条空了'],
  },
  {
    name: '农民', emoji: '👨‍🌾',
    hat: (
      <g>
        <ellipse cx="17" cy="9" rx="11" ry="2.6" fill="#e8c468" stroke={INK} strokeWidth="1.2" />
        <path d="M11 8.6 A 6 5 0 0 1 23 8.6 Z" fill="#e8c468" stroke={INK} strokeWidth="1.2" />
      </g>
    ),
    outfit: (
      <path d="M11 25.6 Q17 29.4 23 25.6 L23 28.6 Q17 32.4 11 28.6 Z" fill="white" stroke={INK} strokeWidth="1" />
    ),
    bye: ['地里还长着呢', '今年收成看你们的了'],
  },
  {
    name: '白领', emoji: '💼',
    body: <path d="M17 26 L15 30 L17 38 L19 30 Z" fill="#e2547a" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />,
    outfit: (
      <path d="M13.6 25.4 L17 28.4 L20.4 25.4 L19.4 24.6 L17 26.6 L14.6 24.6 Z" fill="white" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
    ),
    bye: ['周报还没写!', '这个会我开不了了'],
  },
  {
    name: '学生', emoji: '🧢',
    hat: (
      <g>
        <path d="M9.5 9 A 7.5 7.5 0 0 1 24.5 9 Z" fill="#5ba8e2" stroke={INK} strokeWidth="1.3" />
        <ellipse cx="24" cy="9.6" rx="4.5" ry="1.6" fill="#5ba8e2" stroke={INK} strokeWidth="1.1" transform="rotate(12 24 9.6)" />
      </g>
    ),
    outfit: (
      <g stroke="#a55a35" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M11.5 25.6 L12.2 44 M22.5 25.6 L21.8 44" />
      </g>
    ),
    bye: ['作业借你抄', '这届我先毕业了'],
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
    outfit: (
      <g>
        <path d="M10 26 L24 26 L24 44 L10 44 Z" fill="white" opacity="0.92" stroke={INK} strokeWidth="1" />
        <rect x="20" y="31" width="2.6" height="4" rx="0.8" fill="#cdeafa" stroke={INK} strokeWidth="0.8" />
      </g>
    ),
    bye: ['实验数据别删', '论文还差一作'],
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
    outfit: (
      <path d="M14 25.4 L17 30.5 L20 25.4 L22 26.5 L17 34 L12 26.5 Z" fill={INK} opacity="0.85" />
    ),
    bye: ['话筒交给你们', '广告之后…没有下文了'],
  },
]

// ---------- 隐藏款: 财神爷 ----------
export const CAISHEN: Prof = {
  name: '财神爷·隐藏款', emoji: '🧧', hidden: true,
  hat: (
    <g>
      <path d="M9.5 9 A 7.5 7.5 0 0 1 24.5 9 L24.5 5.5 A 7.5 6 0 0 0 9.5 5.5 Z" fill="#2c2438" stroke={INK} strokeWidth="1.2" />
      <rect x="4.6" y="6.6" width="5.4" height="1.8" rx="0.9" fill="#2c2438" stroke={INK} strokeWidth="0.9" />
      <rect x="24" y="6.6" width="5.4" height="1.8" rx="0.9" fill="#2c2438" stroke={INK} strokeWidth="0.9" />
      <circle cx="17" cy="4.6" r="1.6" fill={GOLD} stroke={INK} strokeWidth="0.8" />
    </g>
  ),
  face: (
    <g stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round">
      <path d="M11.8 12.2 Q14 10.2 16.2 12.2" />
      <path d="M17.8 12.2 Q20 10.2 22.2 12.2" />
    </g>
  ),
  mouth: <path d="M13.6 15.6 Q17 19.8 20.4 15.6 Q17 17.4 13.6 15.6 Z" fill={INK} />,
  outfit: (
    <g>
      <path d="M9 26 L25 26 L25 44 L9 44 Z" fill="#c23b3b" opacity="0.95" stroke={INK} strokeWidth="1" />
      <rect x="9" y="32.6" width="16" height="2.6" fill={GOLD} stroke={INK} strokeWidth="0.8" />
      {/* 怀里的金元宝 */}
      <path d="M13.4 30.2 Q13.4 27.8 15.4 28.4 Q17 26.4 18.6 28.4 Q20.6 27.8 20.6 30.2 Q20.6 32.2 17 32.2 Q13.4 32.2 13.4 30.2 Z" fill={GOLD} stroke={INK} strokeWidth="0.9" />
    </g>
  ),
  bye: ['财运已到账, 勿念', '我去别家送钱了', '红包已发完'],
}

/** 完整版: 稀有度图鉴卡要让幸存者本人登场(带帽子和衣服) */
export function survivorProfFull(survivorCount: number): Prof | null {
  if (!Number.isFinite(survivorCount) || survivorCount <= 0) return null
  const i = survivorCount - 1
  return ROSTER[Math.floor(rnd(i, 9) * ROSTER.length)]
}
