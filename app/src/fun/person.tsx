// 共享小人渲染器 3.0 —— 淘汰赛 / 封面 / 片头幕布 / 稀有度戳都用同一个小人。
// 画法契约: viewBox 0 0 34 46, 头心 (17,13) r7.5, 职业装扮画在头顶/身体安全区。
// 槽位架构(方案一定稿): 发型 × 眼型 × 眉毛 × 嘴型 × 配饰 × 衣服 × 鞋, 全部确定性随机。
// 精修十则: 单轮廓线 / 统一左上光源 / 柔焦腮红 / 微椭圆双高光眼睛 / 圆润扇贝刘海 /
// 发丝+光泽弧 / 细手臂小手掌 / 开口笑舌头 / 鞋底+接地阴影 / 随机镜像。
import type { CSSProperties, ReactNode } from 'react'
import type { BodyType, Prof } from './roster'
import { bodyTypeOf, rnd } from './roster'

interface BodySpec {
  /** 身体主轮廓 */
  d: string
  /** 身体两侧 x（左缘） */
  x1: number
  /** 身体两侧 x（右缘） */
  x2: number
  /** 肩线 y */
  top: number
}

const BODIES: Record<BodyType, BodySpec> = {
  std: { d: 'M5 44 Q5 24 17 24 Q29 24 29 44 Z', x1: 5, x2: 29, top: 24 },
  round: { d: 'M2.8 44 Q2.8 23 17 23 Q31.2 23 31.2 44 Z', x1: 2.8, x2: 31.2, top: 23 },
  slim: { d: 'M8 44 Q8 25.5 17 25.5 Q26 25.5 26 44 Z', x1: 8, x2: 26, top: 25.5 },
}

/** 马卡龙色板: 衣服(深半度) / 发色 / 鞋 / 配饰点缀色 */
const CLOTHC = ['#e87a9a', '#f0a35e', '#7ab8e8', '#97b87c', '#b5659a', '#7d9cc9', '#e8c468', '#6bb8ad']
const HAIRC = ['#4a3f5c', '#6b5137', '#8c5a3b', '#2c2438', '#7a6a8c', '#b5764a']
const SHOEC = ['#ffffff', '#e87a9a', '#7ab8e8', '#f0a35e', '#97b87c']
const ACCC = ['#e2547a', '#f5c542', '#5ba8e2']

/** 方案一槽位池 */
const HAIR_POOL = [1, 2, 3, 4, 6, 8, 9, 10, 11, 12] as const
const EYE_POOL = [0, 0, 2, 6] as const
const ACC_POOL = [0, 4, 5, 8, 1] as const
const CLOTH_POOL = [1, 2, 4, 5, 8] as const

function darker(hex: string, f = 0.8): string {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * f)
  const g = Math.round(((n >> 8) & 255) * f)
  const b = Math.round((n & 255) * f)
  return `rgb(${r},${g},${b})`
}

// ---------- 发型库(画在头顶区, 有职业帽时整槽跳过) ----------
function hair(id: number, hc: string, ink: string): ReactNode {
  const sw = 1.2
  const s = { stroke: ink, strokeWidth: sw, strokeLinejoin: 'round' as const }
  const dk = darker(hc, 0.72)
  const strand = <path d="M12.3 7.9 Q15 6.6 18.5 6.9" fill="none" stroke={dk} strokeWidth="0.75" strokeLinecap="round" opacity="0.65" />
  const shine = <path d="M11.8 7.4 Q14.2 6 16.8 6.3" fill="none" stroke="#fff" strokeWidth="0.85" strokeLinecap="round" opacity="0.3" />
  switch (id) {
    case 1: // 齐刘海(扇贝边)
      return (<>
        <path d="M9.7 11.2 A7.6 7.6 0 0 1 24.3 11.2 Q23.4 9.7 22.3 10.9 Q21.4 9.6 20.3 10.9 Q19.3 9.6 18.2 10.9 Q17.1 9.6 16 10.9 Q14.9 9.6 13.8 10.9 Q12.8 9.6 11.7 10.9 Q10.6 9.7 9.7 11.2 Z" fill={hc} {...s} />
        {strand}{shine}
      </>)
    case 2: // 侧分
      return (<>
        <path d="M9.7 10.8 A7.6 7.6 0 0 1 24.3 10.8 Q21.5 6.2 16.2 7.4 Q11.3 8.4 9.7 10.8 Z" fill={hc} {...s} />
        <path d="M15.6 7.8 Q14.4 9.4 13.6 10.6 M18.6 7.4 Q20.6 8.2 22 9.6" fill="none" stroke={dk} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
        {shine}
      </>)
    case 3: // 丸子头
      return (<>
        <path d="M10.2 10 A7.4 7.4 0 0 1 23.8 10 L23 8.2 Q17 6 11 8.2 Z" fill={hc} {...s} />
        <circle cx="17" cy="4.1" r="2.4" fill={hc} {...s} />
        <path d="M15 5.6 Q17 6.7 19 5.6" fill="none" stroke={ink} strokeWidth="0.8" strokeLinecap="round" />
        <path d="M15.4 3 Q16.8 2.4 18.2 2.8" fill="none" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" opacity="0.35" />
        {strand}
      </>)
    case 4: // 呆毛
      return (<>
        <path d="M10.4 9.8 A7.2 7.2 0 0 1 23.6 9.8 Q17 7.7 10.4 9.8 Z" fill={hc} {...s} />
        <path d="M17 5.9 Q17.7 2.9 20.6 2.7" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M17 5.9 Q17.7 2.9 20.6 2.7" fill="none" stroke={hc} strokeWidth="1" strokeLinecap="round" />
        {shine}
      </>)
    case 6: // 中分垂发
      return (<>
        <path d="M9.8 10.8 A7.5 7.5 0 0 1 17 5.5 L17 8.6 Q13 9.2 11.5 11.7 Z" fill={hc} {...s} />
        <path d="M24.2 10.8 A7.5 7.5 0 0 0 17 5.5 L17 8.6 Q21 9.2 22.5 11.7 Z" fill={hc} {...s} />
        <path d="M13.2 7.4 Q14.8 6.6 16.4 6.7 M17.6 6.7 Q19.2 6.6 20.8 7.4" fill="none" stroke={dk} strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
      </>)
    case 8: // 双马尾
      return (<>
        <path d="M10.4 9.8 A7.2 7.2 0 0 1 23.6 9.8 Q17 7.7 10.4 9.8 Z" fill={hc} {...s} />
        <path d="M10.2 10.3 Q6.4 11.8 6.9 16.4 Q7.2 19.2 9.6 19.7 Q8.1 15 10.9 12.4 Z" fill={hc} {...s} />
        <path d="M23.8 10.3 Q27.6 11.8 27.1 16.4 Q26.8 19.2 24.4 19.7 Q25.9 15 23.1 12.4 Z" fill={hc} {...s} />
        <circle cx="10" cy="10.8" r="0.95" fill="#e2547a" stroke={ink} strokeWidth="0.6" />
        <circle cx="24" cy="10.8" r="0.95" fill="#e2547a" stroke={ink} strokeWidth="0.6" />
        <path d="M8.4 13.5 Q7.9 15.5 8.5 17.2 M25.6 13.5 Q26.1 15.5 25.5 17.2" fill="none" stroke={dk} strokeWidth="0.65" strokeLinecap="round" opacity="0.6" />
      </>)
    case 9: // 波波头
      return (<>
        <path d="M9.5 13 A7.5 7.5 0 0 1 24.5 13 L24.5 15.4 Q23.1 16.6 21.4 15.5 Q19.6 16.8 17.9 15.6 Q16.1 16.7 14.3 15.6 Q12.5 16.6 10.9 15.5 Q9.9 15.9 9.5 15.4 Z" fill={hc} {...s} />
        {strand}{shine}
      </>)
    case 10: // 高马尾
      return (<>
        <path d="M10.4 9.8 A7.2 7.2 0 0 1 23.6 9.8 Q17 7.7 10.4 9.8 Z" fill={hc} {...s} />
        <path d="M22.4 7.6 Q27.2 5.8 26.6 11 Q26.1 14.6 23.4 15.1 Q25.1 10.2 21.8 9.4 Z" fill={hc} {...s} />
        <circle cx="22.9" cy="8" r="0.95" fill="#f5c542" stroke={ink} strokeWidth="0.6" />
        <path d="M24.6 8.6 Q25.9 10.4 25.6 12.4" fill="none" stroke={dk} strokeWidth="0.65" strokeLinecap="round" opacity="0.6" />
        {shine}
      </>)
    case 11: // 卷发
      return (<>
        <path d="M9.9 10 A7.5 7.5 0 0 1 24.1 10 Q23.7 11.4 22.6 10.9 Q22 12.1 20.7 11.4 Q20 12.3 18.8 11.5 Q18 12.4 17 11.5 Q16 12.4 15.2 11.5 Q14 12.3 13.3 11.4 Q12 12.1 11.4 10.9 Q10.3 11.4 9.9 10 Z" fill={hc} {...s} />
        <circle cx="9.7" cy="13.2" r="1.25" fill={hc} {...s} />
        <circle cx="24.3" cy="13.2" r="1.25" fill={hc} {...s} />
        <path d="M9.4 12.8 Q9 13.4 9.5 13.9 M24.6 12.8 Q25 13.4 24.5 13.9" fill="none" stroke={dk} strokeWidth="0.6" strokeLinecap="round" opacity="0.7" />
      </>)
    case 12: // 蘑菇头
      return (<>
        <path d="M9.4 12.5 A7.7 7.7 0 0 1 24.6 12.5 Q17 10.6 9.4 12.5 Z" fill={hc} {...s} />
        {strand}{shine}
      </>)
    default:
      return null
  }
}

// ---------- 眼型库(微椭圆瞳孔 + 双高光) ----------
function eyes(id: number, ink: string): ReactNode {
  switch (id) {
    case 2: // 开心眯眯眼 ^^
      return (<>
        <path d="M12.7 12.7 Q14 10.8 15.3 12.7" fill="none" stroke={ink} strokeWidth="1.15" strokeLinecap="round" />
        <path d="M18.7 12.7 Q20 10.8 21.3 12.7" fill="none" stroke={ink} strokeWidth="1.15" strokeLinecap="round" />
      </>)
    case 6: // 睫毛笑眼
      return (<>
        <path d="M12.7 12.7 Q14 10.8 15.3 12.7 M12.8 12.4 L12.2 13.2 M15.2 12.4 L15.8 13.2" fill="none" stroke={ink} strokeWidth="1.05" strokeLinecap="round" />
        <path d="M18.7 12.7 Q20 10.8 21.3 12.7 M18.8 12.4 L18.1 13.2 M21.2 12.4 L21.9 13.2" fill="none" stroke={ink} strokeWidth="1.05" strokeLinecap="round" />
      </>)
    default: // 0 墨点+双高光(池里出现两次, 是主力眼型)
      return (<>
        <ellipse cx="14" cy="12.05" rx="0.95" ry="1.12" fill={ink} />
        <circle cx="13.62" cy="11.5" r="0.42" fill="#fff" />
        <circle cx="14.42" cy="12.72" r="0.15" fill="#fff" opacity="0.9" />
        <ellipse cx="20" cy="12.05" rx="0.95" ry="1.12" fill={ink} />
        <circle cx="19.62" cy="11.5" r="0.42" fill="#fff" />
        <circle cx="20.42" cy="12.72" r="0.15" fill="#fff" opacity="0.9" />
      </>)
  }
}

function brows(id: number, ink: string): ReactNode {
  if (id !== 1) return null
  return <path d="M12.5 9.5 Q14 9.1 15.5 9.5 M18.5 9.5 Q20 9.1 21.5 9.5" fill="none" stroke={ink} strokeWidth="0.75" strokeLinecap="round" opacity="0.85" />
}

// ---------- 嘴型(开口笑带舌头) ----------
function mouth(id: number, ink: string): ReactNode {
  switch (id) {
    case 1:
      return (<>
        <path d="M14.2 15.9 Q17 19.4 19.8 15.9 Q17 17.6 14.2 15.9 Z" fill={ink} />
        <path d="M15.1 17.3 Q17 18.7 18.9 17.3 Q17 17.9 15.1 17.3 Z" fill="#f2979b" />
      </>)
    case 2:
      return <path d="M14.8 15.9 Q15.9 17.1 17 16.1 M17 16.1 Q18.1 17.1 19.2 15.9" fill="none" stroke={ink} strokeWidth="0.95" strokeLinecap="round" />
    case 3:
      return <circle cx="17" cy="16.5" r="0.8" fill={ink} />
    default:
      return <path d="M14 16 Q17 18.1 20 16" fill="none" stroke={ink} strokeWidth="1" strokeLinecap="round" />
  }
}

// ---------- 配饰库(方案一: 圆眼镜/蝴蝶结/发夹/创可贴) ----------
function accessory(id: number, ac: string, ink: string): ReactNode {
  switch (id) {
    case 1: // 圆眼镜
      return (
        <g fill="rgba(255,255,255,0.22)" stroke={ink} strokeWidth="1">
          <circle cx="14" cy="12" r="2.25" /><circle cx="20" cy="12" r="2.25" />
          <path d="M16.2 12 h1.5 M11.8 11.5 L9.5 10.9 M22.2 11.5 L24.5 10.9" fill="none" />
        </g>
      )
    case 4: // 蝴蝶结
      return (
        <g transform="rotate(-18 11 5.2)" stroke={ink} strokeWidth="0.8" strokeLinejoin="round">
          <path d="M11 5.2 L7.5 3 L7.5 7.4 Z" fill={ac} />
          <path d="M11 5.2 L14.5 3 L14.5 7.4 Z" fill={ac} />
          <circle cx="11" cy="5.2" r="1" fill={darker(ac, 0.85)} />
        </g>
      )
    case 5: // 发夹
      return <path d="M22 6.7 L25.2 9.1 M25.2 6.7 L22 9.1" fill="none" stroke="#f5c542" strokeWidth="1.3" strokeLinecap="round" />
    case 8: // 脸颊创可贴
      return (
        <g transform="rotate(-24 12.8 16.8)">
          <rect x="10.9" y="16.1" width="3.9" height="1.5" rx="0.75" fill="#f9e3a1" stroke={ink} strokeWidth="0.6" />
          <rect x="12.05" y="16.4" width="1.6" height="0.9" rx="0.4" fill="#f2979b" />
        </g>
      )
    default:
      return null
  }
}

// ---------- 衣服库(填充不描边, 外轮廓交给身体 = 单轮廓线) ----------
function clothes(id: number, cc: string, spec: BodySpec, ink: string): ReactNode {
  const { x1, x2, top: t } = spec
  const dk = darker(cc, 0.78)
  const base = <path d={`M${x1 + 0.15} 44 L${x1 + 0.15} ${t + 2.6} Q17 ${t - 1.1} ${x2 - 0.15} ${t + 2.6} L${x2 - 0.15} 44 Z`} fill={cc} />
  const collar = <path d={`M14.2 ${t + 1.5} Q17 ${t + 3.5} 19.8 ${t + 1.5}`} fill="none" stroke={ink} strokeWidth="0.8" strokeLinecap="round" opacity="0.85" />
  const sleeve = <path d={`M${x1 + 1} ${t + 3.2} Q${x1 + 2.4} ${t + 4.8} ${x1 + 3.6} ${t + 7} M${x2 - 1} ${t + 3.2} Q${x2 - 2.4} ${t + 4.8} ${x2 - 3.6} ${t + 7}`} fill="none" stroke={ink} strokeWidth="0.75" strokeLinecap="round" opacity="0.7" />
  switch (id) {
    case 1: // T恤 + 胸前小爱心
      return (<>{base}{collar}{sleeve}
        <path d={`M17 ${t + 11.2} Q14.6 ${t + 9} 16.2 ${t + 7.6} Q17 ${t + 6.8} 17 ${t + 7.9} Q17 ${t + 6.8} 17.8 ${t + 7.6} Q19.4 ${t + 9} 17 ${t + 11.2} Z`} fill="#fff" opacity="0.9" />
      </>)
    case 2: // 卫衣: 帽兜 + 抽绳 + 袋鼠兜
      return (<>{base}
        <path d={`M12.7 ${t + 2} Q17 ${t + 5.4} 21.3 ${t + 2} Q17 ${t + 3.2} 12.7 ${t + 2} Z`} fill={dk} />
        <path d={`M12.7 ${t + 2} Q17 ${t + 5.4} 21.3 ${t + 2}`} fill="none" stroke={ink} strokeWidth="0.7" opacity="0.7" />
        <path d={`M15.5 ${t + 4.4} v2.4 M18.5 ${t + 4.4} v2.4`} fill="none" stroke={ink} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
        <circle cx="15.5" cy={t + 7.1} r="0.4" fill={ink} /><circle cx="18.5" cy={t + 7.1} r="0.4" fill={ink} />
        <path d={`M13.1 ${t + 10.5} L20.9 ${t + 10.5} L20 ${t + 14.3} L14 ${t + 14.3} Z`} fill="none" stroke={ink} strokeWidth="0.8" strokeLinejoin="round" opacity="0.8" />
      </>)
    case 4: // 背带裤
      return (<>{base}
        <path d={`M13.4 ${t + 1} L14.2 ${t + 9.8} M20.6 ${t + 1} L19.8 ${t + 9.8}`} fill="none" stroke={dk} strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M${x1 + 0.15} ${t + 10.2} Q17 ${t + 11.8} ${x2 - 0.15} ${t + 10.2} L${x2 - 0.15} 44 L${x1 + 0.15} 44 Z`} fill={dk} />
        <path d={`M${x1 + 0.15} ${t + 10.2} Q17 ${t + 11.8} ${x2 - 0.15} ${t + 10.2}`} fill="none" stroke={ink} strokeWidth="0.8" opacity="0.7" />
        <circle cx="13.9" cy={t + 9.5} r="0.6" fill="#f5c542" stroke={ink} strokeWidth="0.45" />
        <circle cx="20.1" cy={t + 9.5} r="0.6" fill="#f5c542" stroke={ink} strokeWidth="0.45" />
      </>)
    case 5: // 连衣裙: 腰线 + 波点
      return (<>{base}{collar}
        <path d={`M12.9 ${t + 9} Q17 ${t + 10.6} 21.1 ${t + 9}`} fill="none" stroke={dk} strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="13.6" cy={t + 13.5} r="0.7" fill="#fff" opacity="0.9" />
        <circle cx="17.8" cy={t + 15.5} r="0.7" fill="#fff" opacity="0.9" />
        <circle cx="20.6" cy={t + 12.8} r="0.7" fill="#fff" opacity="0.9" />
      </>)
    case 8: // 条纹衫
      return (<>{base}{collar}{sleeve}
        <path d={`M${x1 + 1.2} ${t + 6.5} Q17 ${t + 5.3} ${x2 - 1.2} ${t + 6.5}`} fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.95" />
        <path d={`M${x1 + 1.1} ${t + 10.5} Q17 ${t + 9.3} ${x2 - 1.1} ${t + 10.5}`} fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.95" />
        <path d={`M${x1 + 1} ${t + 14.5} Q17 ${t + 13.3} ${x2 - 1} ${t + 14.5}`} fill="none" stroke="#fff" strokeWidth="1.3" opacity="0.95" />
      </>)
    default:
      return null
  }
}

/** 小短手: 减细墨线 + 体色内芯 + 小手掌, 欢呼时由 CSS 接管旋转 */
function Arms({ spec, color, palm, ink }: { spec: BodySpec; color: string; palm?: string; ink: string }) {
  const y = spec.top + 4.4
  const left = `M${spec.x1 + 0.8} ${y} q -3 2.4 -2.7 6.4`
  const right = `M${spec.x2 - 0.8} ${y} q 3 2.4 2.7 6.4`
  return (
    <g fill="none" strokeLinecap="round">
      <g className="p-arm p-arm-l">
        <path d={left} stroke={ink} strokeWidth="3" />
        <path d={left} stroke={color} strokeWidth="1.7" />
        <circle cx={spec.x1 - 1.9} cy={y + 6.4} r="1.05" fill={palm ?? color} stroke={ink} strokeWidth="0.8" />
      </g>
      <g className="p-arm p-arm-r">
        <path d={right} stroke={ink} strokeWidth="3" />
        <path d={right} stroke={color} strokeWidth="1.7" />
        <circle cx={spec.x2 + 1.9} cy={y + 6.4} r="1.05" fill={palm ?? color} stroke={ink} strokeWidth="0.8" />
      </g>
    </g>
  )
}

function Shoes({ spec, sc, ink }: { spec: BodySpec; sc: string; ink: string }) {
  const mx = (spec.x2 - spec.x1) * 0.22
  const sole = sc === '#ffffff' ? ink : '#fff'
  return (<>
    <ellipse cx={17 - mx} cy="44.3" rx="2.3" ry="1.45" fill={sc} stroke={ink} strokeWidth="0.9" />
    <ellipse cx={17 + mx} cy="44.3" rx="2.3" ry="1.45" fill={sc} stroke={ink} strokeWidth="0.9" />
    <path d={`M${17 - mx - 1.7} 44.7 Q${17 - mx} 45.4 ${17 - mx + 1.7} 44.7 M${17 + mx - 1.7} 44.7 Q${17 + mx} 45.4 ${17 + mx + 1.7} 44.7`} fill="none" stroke={sole} strokeWidth="0.8" strokeLinecap="round" opacity="0.9" />
  </>)
}

/** 淘汰脸: X 眼 + 失落嘴 */
function OutFace({ ink }: { ink: string }) {
  return (
    <g stroke={ink} strokeWidth="1.2" strokeLinecap="round">
      <path d="M12.5 10.5 L15.5 13.5 M15.5 10.5 L12.5 13.5" />
      <path d="M18.5 10.5 L21.5 13.5 M21.5 10.5 L18.5 13.5" />
      <path d="M14 17.5 Q17 15.8 20 17.5" fill="none" />
    </g>
  )
}

export interface PersonSvgProps {
  color: string
  ink?: string
  prof?: Prof | null
  out?: boolean
  seed?: number
  blink?: boolean
  nervous?: boolean
  width?: number
  height?: number
}

export function PersonSvg({ color, ink = '#3b3050', prof, out = false, seed = 0, blink = true, nervous = false, width, height }: PersonSvgProps) {
  // 隐藏款财神爷走专属渲染(见底部)
  if (prof?.hidden && !out) {
    return <CaishenSvg ink={ink} width={width} height={height} blink={blink} nervous={nervous} />
  }

  const spec = BODIES[bodyTypeOf(seed)]
  const hasHat = Boolean(prof?.hat)
  const hairId = hasHat ? 0 : HAIR_POOL[Math.floor(rnd(seed, 11) * HAIR_POOL.length)]
  const eyeId = EYE_POOL[Math.floor(rnd(seed, 12) * EYE_POOL.length)]
  const browId = Math.floor(rnd(seed, 13) * 2)
  const mouthId = Math.floor(rnd(seed, 14) * 4)
  let accId = ACC_POOL[Math.floor(rnd(seed, 15) * ACC_POOL.length)]
  if (hasHat && (accId === 4 || accId === 5)) accId = 0 // 蝴蝶结/发夹和帽子打架, 让位
  if (prof?.face && accId === 1) accId = 0 // 职业眼镜和配饰眼镜不叠戴
  const clothId = CLOTH_POOL[Math.floor(rnd(seed, 16) * CLOTH_POOL.length)]
  const cc = CLOTHC[Math.floor(rnd(seed, 5) * CLOTHC.length)]
  const hc = HAIRC[Math.floor(rnd(seed, 4) * HAIRC.length)]
  const sc = SHOEC[Math.floor(rnd(seed, 6) * SHOEC.length)]
  const ac = ACCC[Math.floor(rnd(seed, 7) * ACCC.length)]
  const mirror = rnd(seed, 17) > 0.5 // 一半小人镜像, 人群不再全对称
  const shy = rnd(seed, 18) > 0.66
  const blinkStyle: CSSProperties = {
    ['--blink-delay' as string]: `${(rnd(seed, 23) * 5.6).toFixed(2)}s`,
    ['--blink-dur' as string]: `${(3.4 + rnd(seed, 24) * 2.8).toFixed(2)}s`,
  }
  const bobStyle: CSSProperties = { ['--bob-del' as string]: `${(rnd(seed, 31) * 2.2).toFixed(2)}s` }
  const svgClass = nervous && !out ? 'p-nervous' : !out ? 'p-bob' : undefined

  return (
    <svg className={svgClass} style={bobStyle} width={width ?? '100%'} height={height ?? '100%'} viewBox="0 0 34 46" aria-hidden="true">
      {/* 接地软阴影: 小人站在地上而不是悬浮 */}
      <ellipse cx="17" cy="44.9" rx={(spec.x2 - spec.x1) * 0.35} ry="1.05" fill={ink} opacity="0.07" />
      {/* 身体: 先填色, 衣服覆盖, 最后统一描边 */}
      <path d={spec.d} fill={color} />
      {!out && (prof?.outfit ?? clothes(clothId, cc, spec, ink))}
      {/* 下缘赛璐璐阴影 + 左侧受光边 + 下巴投影(统一左上光源) */}
      <path d={`M${spec.x1} 37.5 Q17 42.5 ${spec.x2} 37.5 L${spec.x2} 44 L${spec.x1} 44 Z`} fill={ink} opacity="0.08" />
      <path d={`M${spec.x1 + 1.6} ${spec.top + 6.5} Q${spec.x1 + 1.1} 34 ${spec.x1 + 1.9} 39.5`} fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <ellipse cx="17" cy={spec.top + 0.9} rx="3.5" ry="1.05" fill={ink} opacity="0.08" />
      <path d={spec.d} fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      <Arms spec={spec} color={color} ink={ink} />
      <Shoes spec={spec} sc={sc} ink={ink} />
      {/* 头: 填色 → 右下暗影月牙 → 描边 → 左上高光 */}
      <circle cx="17" cy="13" r="7.5" fill={color} />
      <path d="M23.8 10.6 A7.5 7.5 0 0 1 14.2 20 Q22.4 18.4 23.8 10.6 Z" fill={ink} opacity="0.06" />
      <circle cx="17" cy="13" r="7.5" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M12.2 7.8 Q14.5 6.1 17.2 6.5" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      {!out && hairId > 0 && (
        <>
          {/* 刘海在额头的投影 */}
          <path d="M10.8 10.6 Q17 8.7 23.2 10.6" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" opacity="0.07" />
          <g transform={mirror ? 'matrix(-1 0 0 1 34 0)' : undefined}>{hair(hairId, hc, ink)}</g>
        </>
      )}
      {!out && (
        <>
          {/* 柔焦腮红(高斯模糊软边) + 部分小人害羞短线 */}
          <defs>
            <filter id="p-blush" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          <g filter="url(#p-blush)">
            <ellipse cx="11.5" cy="15.8" rx="1.85" ry="1.05" fill="#f2979b" opacity="0.5" />
            <ellipse cx="22.5" cy="15.8" rx="1.85" ry="1.05" fill="#f2979b" opacity="0.5" />
          </g>
          {shy && (
            <path d="M10.6 15.1 l1.2 0.65 M10.6 16.2 l1.2 0.65 M23.4 15.1 l-1.2 0.65 M23.4 16.2 l-1.2 0.65" stroke="#f2979b" strokeWidth="0.55" strokeLinecap="round" fill="none" />
          )}
          {brows(browId, ink)}
        </>
      )}
      {/* 眼睛: 戴眼镜的角色不眨眼(镜片挡着看不见, 合理) */}
      {!out && (
        <g className={blink && !prof?.face ? 'p-eyes p-blink' : 'p-eyes'} style={blinkStyle}>
          {prof?.face ?? eyes(eyeId, ink)}
        </g>
      )}
      {!out && (prof?.mouth ?? mouth(mouthId, ink))}
      {!out && accId > 0 && <g transform={mirror ? 'matrix(-1 0 0 1 34 0)' : undefined}>{accessory(accId, ac, ink)}</g>}
      {prof?.hat}
      {prof?.body}
      {/* 刀落下时幸存者冒汗 */}
      {nervous && !out && (
        <g className="p-sweat">
          <path d="M24.8 8.6 Q26.4 11.4 24.8 12.6 Q23.2 11.4 24.8 8.6 Z" fill="#8ecdf5" stroke={ink} strokeWidth="0.7" />
        </g>
      )}
      {out && <OutFace ink={ink} />}
    </svg>
  )
}

// ---------- 隐藏款: 财神爷(专属精修渲染) ----------
const GOD_GOLD = '#f5c542'
const GOD_ROBE = '#c23b3b'
const GOD_SKIN = '#f9cfae'

function CaishenSvg({ ink, width, height, blink, nervous }: { ink: string; width?: number; height?: number; blink: boolean; nervous: boolean }) {
  const spec = BODIES.round // 福相圆润体型
  const t = spec.top
  const mx = (spec.x2 - spec.x1) * 0.22
  const blinkStyle: CSSProperties = { ['--blink-dur' as string]: '5.2s', ['--blink-delay' as string]: '1.1s' }
  return (
    <svg className={nervous ? 'p-nervous' : 'p-bob'} style={{ ['--bob-del' as string]: '0.4s' }} width={width ?? '100%'} height={height ?? '100%'} viewBox="0 0 34 46" aria-hidden="true">
      <ellipse cx="17" cy="44.9" rx="9.2" ry="1.1" fill={ink} opacity="0.08" />
      {/* 身体 + 红袍(单轮廓) */}
      <path d={spec.d} fill={GOD_SKIN} />
      <path d={`M${spec.x1 + 0.15} 44 L${spec.x1 + 0.15} ${t + 2.6} Q17 ${t - 1.1} ${spec.x2 - 0.15} ${t + 2.6} L${spec.x2 - 0.15} 44 Z`} fill={GOD_ROBE} />
      {/* 金色云肩(扇贝领) */}
      <path d={`M${spec.x1 + 1.4} ${t + 2.2} Q${spec.x1 + 3.4} ${t + 5} ${spec.x1 + 5.4} ${t + 3} Q${spec.x1 + 7.2} ${t + 5.6} 14 ${t + 2.8} Q15.6 ${t + 5} 17 ${t + 3} Q18.4 ${t + 5} 20 ${t + 2.8} Q${spec.x2 - 7.2} ${t + 5.6} ${spec.x2 - 5.4} ${t + 3} Q${spec.x2 - 3.4} ${t + 5} ${spec.x2 - 1.4} ${t + 2.2} Q17 ${t - 0.9} ${spec.x1 + 1.4} ${t + 2.2} Z`}
        fill={GOD_GOLD} stroke={ink} strokeWidth="0.8" strokeLinejoin="round" />
      {/* 袍面祥云纹 */}
      <path d={`M${spec.x1 + 4} 36.4 q1 -1.1 2.1 -0.1 q1.1 -0.9 2 0.2 M${spec.x2 - 8.1} 36.5 q1 -1.1 2.1 -0.1 q1.1 -0.9 2 0.2`} fill="none" stroke="#fff" strokeWidth="0.65" strokeLinecap="round" opacity="0.5" />
      {/* 腰玉带 + 带扣 */}
      <rect x={spec.x1 + 0.3} y="38.4" width={spec.x2 - spec.x1 - 0.6} height="2.7" fill={GOD_GOLD} stroke={ink} strokeWidth="0.8" />
      <rect x="15.8" y="37.9" width="2.4" height="3.7" rx="0.5" fill={darker(GOD_GOLD, 0.82)} stroke={ink} strokeWidth="0.7" />
      {/* 下摆金边 */}
      <path d={`M${spec.x1 + 0.6} 42.6 Q17 44.6 ${spec.x2 - 0.6} 42.6`} fill="none" stroke={GOD_GOLD} strokeWidth="1.1" strokeLinecap="round" />
      <path d={`M${spec.x1} 37.5 Q17 42.5 ${spec.x2} 37.5 L${spec.x2} 44 L${spec.x1} 44 Z`} fill={ink} opacity="0.07" />
      <ellipse cx="17" cy={t + 0.9} rx="3.5" ry="1.05" fill={ink} opacity="0.08" />
      <path d={spec.d} fill="none" stroke={ink} strokeWidth="1.5" strokeLinejoin="round" />
      {/* 袖子色手臂 + 皮肤手掌(欢呼时也能举起来) */}
      <Arms spec={spec} color={GOD_ROBE} palm={GOD_SKIN} ink={ink} />
      {/* 黑靴金底 */}
      <ellipse cx={17 - mx} cy="44.3" rx="2.3" ry="1.45" fill="#2c2438" stroke={ink} strokeWidth="0.9" />
      <ellipse cx={17 + mx} cy="44.3" rx="2.3" ry="1.45" fill="#2c2438" stroke={ink} strokeWidth="0.9" />
      <path d={`M${17 - mx - 1.7} 44.7 Q${17 - mx} 45.4 ${17 - mx + 1.7} 44.7 M${17 + mx - 1.7} 44.7 Q${17 + mx} 45.4 ${17 + mx + 1.7} 44.7`} fill="none" stroke={GOD_GOLD} strokeWidth="0.8" strokeLinecap="round" />
      {/* 头 */}
      <circle cx="17" cy="13" r="7.5" fill={GOD_SKIN} />
      <path d="M23.8 10.6 A7.5 7.5 0 0 1 14.2 20 Q22.4 18.4 23.8 10.6 Z" fill={ink} opacity="0.06" />
      <circle cx="17" cy="13" r="7.5" fill="none" stroke={ink} strokeWidth="1.5" />
      <path d="M12.2 7.8 Q14.5 6.1 17.2 6.5" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
      {/* 柔焦红脸蛋(财神要比别人更红扑扑) */}
      <defs>
        <filter id="p-blush-god" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>
      <g filter="url(#p-blush-god)">
        <ellipse cx="11.4" cy="15.6" rx="2" ry="1.15" fill="#f2979b" opacity="0.6" />
        <ellipse cx="22.6" cy="15.6" rx="2" ry="1.15" fill="#f2979b" opacity="0.6" />
      </g>
      {/* 眯笑眼 */}
      <g className={blink ? 'p-eyes p-blink' : 'p-eyes'} style={blinkStyle}>
        <path d="M11.8 12.3 Q14 10.3 16.2 12.3" fill="none" stroke={ink} strokeWidth="1.15" strokeLinecap="round" />
        <path d="M17.8 12.3 Q20 10.3 22.2 12.3" fill="none" stroke={ink} strokeWidth="1.15" strokeLinecap="round" />
      </g>
      {/* 八字胡 + 笑口 + 山羊胡 */}
      <path d="M16.8 14.5 Q15 14.7 13.7 16.1 M17.2 14.5 Q19 14.7 20.3 16.1" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M14.4 16.4 Q17 18.6 19.6 16.4" fill="none" stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M15.5 19 Q17 20.6 18.5 19 Q17 19.7 15.5 19 Z" fill={ink} />
      {/* 乌纱帽: 金边 + 帽翅 + 方孔帽正 + 光泽 */}
      <path d="M9.5 9 A7.5 7.5 0 0 1 24.5 9 L24.5 5.6 A7.5 6 0 0 0 9.5 5.6 Z" fill="#2c2438" stroke={ink} strokeWidth="1.2" />
      <path d="M9.8 8.3 Q17 10.5 24.2 8.3 L24.2 7 Q17 9.2 9.8 7 Z" fill={GOD_GOLD} stroke={ink} strokeWidth="0.6" />
      <rect x="4.6" y="6.5" width="5.4" height="1.9" rx="0.95" fill="#2c2438" stroke={ink} strokeWidth="0.9" />
      <rect x="24" y="6.5" width="5.4" height="1.9" rx="0.95" fill="#2c2438" stroke={ink} strokeWidth="0.9" />
      <circle cx="17" cy="4.4" r="1.6" fill={GOD_GOLD} stroke={ink} strokeWidth="0.8" />
      <rect x="16.45" y="3.85" width="1.1" height="1.1" fill="none" stroke={ink} strokeWidth="0.55" />
      <path d="M11.4 4.6 Q13.4 3.3 15.9 3.5" fill="none" stroke="#fff" strokeWidth="0.8" strokeLinecap="round" opacity="0.3" />
      {/* 怀里元宝 + 光泽 */}
      <path d="M13.4 30.4 Q13.4 28 15.4 28.6 Q17 26.6 18.6 28.6 Q20.6 28 20.6 30.4 Q20.6 32.4 17 32.4 Q13.4 32.4 13.4 30.4 Z" fill={GOD_GOLD} stroke={ink} strokeWidth="0.9" />
      <path d="M14.6 29.2 Q15.6 28.4 16.6 28.5" fill="none" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" opacity="0.7" />
      {/* 环绕浮动金币(错相) */}
      <g className="p-coin" style={{ ['--coin-del' as string]: '0s' }}>
        <circle cx="5" cy="12.5" r="1.5" fill={GOD_GOLD} stroke={ink} strokeWidth="0.6" />
        <rect x="4.45" y="11.95" width="1.1" height="1.1" fill="none" stroke={ink} strokeWidth="0.5" />
      </g>
      <g className="p-coin" style={{ ['--coin-del' as string]: '0.9s' }}>
        <circle cx="28.9" cy="6.8" r="1.5" fill={GOD_GOLD} stroke={ink} strokeWidth="0.6" />
        <rect x="28.35" y="6.25" width="1.1" height="1.1" fill="none" stroke={ink} strokeWidth="0.5" />
      </g>
      <g className="p-coin" style={{ ['--coin-del' as string]: '1.7s' }}>
        <circle cx="28.4" cy="17.5" r="1.5" fill={GOD_GOLD} stroke={ink} strokeWidth="0.6" />
        <rect x="27.85" y="16.95" width="1.1" height="1.1" fill="none" stroke={ink} strokeWidth="0.5" />
      </g>
      {/* 双星闪烁(沿用 p-spark 动效, 第二颗错相) */}
      <path className="p-spark" d="M27.5 1.2 L28.3 3.6 L30.8 4.4 L28.3 5.2 L27.5 7.6 L26.7 5.2 L24.2 4.4 L26.7 3.6 Z" fill={GOD_GOLD} stroke={ink} strokeWidth="0.6" />
      <path className="p-spark" style={{ animationDelay: '0.7s' }} d="M5.6 3.4 L6 4.7 L7.4 5.1 L6 5.5 L5.6 6.8 L5.2 5.5 L3.8 5.1 L5.2 4.7 Z" fill="#fff" stroke={ink} strokeWidth="0.5" />
      {/* 刀落下时财神也冒汗 */}
      {nervous && (
        <g className="p-sweat">
          <path d="M24.8 8.6 Q26.4 11.4 24.8 12.6 Q23.2 11.4 24.8 8.6 Z" fill="#8ecdf5" stroke={ink} strokeWidth="0.7" />
        </g>
      )}
    </svg>
  )
}

/** 灵魂出窍小幽灵 —— 渲染为 .person 的兄弟节点, 不被淘汰者的灰化/淡出牵连 */
export function SoulGhost({ ink = '#3b3050' }: { ink?: string }) {
  return (
    <svg className="p-soul-svg" viewBox="0 0 14 12" aria-hidden="true">
      <path d="M3 11 L3 5.2 A4 4 0 0 1 11 5.2 L11 11 L9 9.6 L7 11 L5 9.6 Z" fill="white" stroke={ink} strokeWidth="1" opacity="0.95" />
      <circle cx="5.6" cy="5.4" r="0.6" fill={ink} />
      <circle cx="8.4" cy="5.4" r="0.6" fill={ink} />
    </svg>
  )
}
