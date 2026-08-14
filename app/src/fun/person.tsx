// 共享小人渲染器 —— 淘汰赛 / 封面 / 片头幕布都用同一个小人。
// 画法契约: viewBox 0 0 34 46, 头心 (17,13) r7.5, 头部职业装扮画在头顶区。
// 精致化: Q版体型三档 + 双层赛璐璐阴影 + 小短手 + 腮红 + 眨眼 + 汗珠 + 灵魂出窍。
import type { CSSProperties } from 'react'
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

/** 小短手: 墨线描边 + 体色内芯, 欢呼时由 CSS 接管旋转 */
function Arms({ spec, color, ink }: { spec: BodySpec; color: string; ink: string }) {
  const y = spec.top + 4.6
  const left = `M${spec.x1 + 0.6} ${y} q -3.4 2.6 -3 7`
  const right = `M${spec.x2 - 0.6} ${y} q 3.4 2.6 3 7`
  return (
    <g fill="none" strokeLinecap="round">
      <g className="p-arm p-arm-l">
        <path d={left} stroke={ink} strokeWidth="4" />
        <path d={left} stroke={color} strokeWidth="2.4" />
      </g>
      <g className="p-arm p-arm-r">
        <path d={right} stroke={ink} strokeWidth="4" />
        <path d={right} stroke={color} strokeWidth="2.4" />
      </g>
    </g>
  )
}

export function PersonSvg({ color, ink = '#3b3050', prof, out = false, seed = 0, blink = true, nervous = false, width, height }: PersonSvgProps) {
  const spec = BODIES[bodyTypeOf(seed)]
  const openSmile = rnd(seed, 22) > 0.72
  const blinkStyle: CSSProperties = {
    ['--blink-delay' as string]: `${(rnd(seed, 23) * 5.6).toFixed(2)}s`,
    ['--blink-dur' as string]: `${(3.4 + rnd(seed, 24) * 2.8).toFixed(2)}s`,
  }
  return (
    <svg className={nervous && !out ? 'p-nervous' : undefined} width={width ?? '100%'} height={height ?? '100%'} viewBox="0 0 34 46" aria-hidden="true">
      {/* 身体: 主色 + 下缘赛璐璐阴影 */}
      <path d={spec.d} fill={color} stroke={ink} strokeWidth="1.7" />
      <path
        d={`M${spec.x1} 37.5 Q17 42.5 ${spec.x2} 37.5 L${spec.x2} 44 L${spec.x1} 44 Z`}
        fill={ink}
        opacity="0.1"
      />
      {/* 职业服装(画在安全区 x9-25, 三种体型都不溢出) */}
      {!out && prof?.outfit}
      {/* 领口 V */}
      <path
        d={`M14.4 ${spec.top + 1} L17 ${spec.top + 3.4} L19.6 ${spec.top + 1}`}
        fill="none"
        stroke={ink}
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <Arms spec={spec} color={color} ink={ink} />
      {/* 头 */}
      <circle cx="17" cy="13" r="7.5" fill={color} stroke={ink} strokeWidth="1.7" />
      {!out && (
        <>
          {/* 腮红 */}
          <ellipse cx="11.6" cy="15.6" rx="1.5" ry="0.9" fill="#f2979b" opacity="0.45" />
          <ellipse cx="22.4" cy="15.6" rx="1.5" ry="0.9" fill="#f2979b" opacity="0.45" />
          {/* 眼睛: 戴眼镜的角色不眨眼(镜片挡着看不见, 合理) */}
          <g className={blink && !prof?.face ? 'p-eyes p-blink' : 'p-eyes'} style={blinkStyle}>
            {prof?.face ?? (
              <>
                <circle cx="14" cy="12" r="1" fill={ink} />
                <circle cx="20" cy="12" r="1" fill={ink} />
              </>
            )}
          </g>
          {/* 嘴: 微笑 / 开口笑 */}
          {prof?.mouth ?? (openSmile ? (
            <path d="M14.2 15.9 Q17 19.4 19.8 15.9 Q17 17.6 14.2 15.9 Z" fill={ink} />
          ) : (
            <path d="M14 16 Q17 18.2 20 16" stroke={ink} strokeWidth="1.1" fill="none" strokeLinecap="round" />
          ))}
          {prof?.hat}
          {prof?.body}
          {/* 刀落下时幸存者冒汗 */}
          {nervous && (
            <g className="p-sweat">
              <path d="M24.8 8.6 Q26.4 11.4 24.8 12.6 Q23.2 11.4 24.8 8.6 Z" fill="#8ecdf5" stroke={ink} strokeWidth="0.7" />
            </g>
          )}
        </>
      )}
      {out && (
        <g stroke={ink} strokeWidth="1.2" strokeLinecap="round">
          <path d="M12.5 10.5 L15.5 13.5 M15.5 10.5 L12.5 13.5" />
          <path d="M18.5 10.5 L21.5 13.5 M21.5 10.5 L18.5 13.5" />
          <path d="M14 17.5 Q17 15.8 20 17.5" fill="none" />
        </g>
      )}
      {/* 隐藏款金光星星 */}
      {prof?.hidden && !out && (
        <path className="p-spark" d="M27.5 2 L28.4 4.6 L31 5.5 L28.4 6.4 L27.5 9 L26.6 6.4 L24 5.5 L26.6 4.6 Z" fill="#f5c542" stroke={ink} strokeWidth="0.6" />
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
