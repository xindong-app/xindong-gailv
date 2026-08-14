// 城市皮肤 —— 选了具体城市后, 小人阵列里会混入当地特色角色
// 画法与 roster.tsx 一致(viewBox 34x46, 头心 17,13 r7.5)
import type { ReactNode } from 'react'
import { CAISHEN, rnd, ROSTER, type Prof } from './roster'

const INK = '#3b3050'

const skin = (name: string, emoji: string, hat?: ReactNode, body?: ReactNode, face?: ReactNode, bye?: readonly string[]): Prof =>
  ({ name, emoji, hat, body, face, bye })

export const CITY_SKINS: Readonly<Record<string, readonly Prof[]>> = {
  北京: [
    skin('京剧名角', '🎭', (
      <g>
        <path d="M9 9 A 8 7 0 0 1 25 9 Z" fill="#c23b3b" stroke={INK} strokeWidth="1.2" />
        <circle cx="9.5" cy="4" r="1.8" fill="#f5a623" stroke={INK} strokeWidth="0.9" />
        <circle cx="24.5" cy="4" r="1.8" fill="#f5a623" stroke={INK} strokeWidth="0.9" />
        <path d="M9.5 5.5 L9.5 8 M24.5 5.5 L24.5 8" stroke={INK} strokeWidth="0.8" />
      </g>
    )),
    skin('胡同大爷', '🪭', (
      <path d="M10 8 A 7 6 0 0 1 24 8 L24 6.5 A 7 5 0 0 0 10 6.5 Z" fill="#6b7b8c" stroke={INK} strokeWidth="1.2" />
    )),
  ],
  上海: [
    skin('摩登绅士', '🎩', (
      <g>
        <rect x="11" y="-0.5" width="12" height="7" rx="1" fill="#3b3050" stroke={INK} strokeWidth="1.2" />
        <ellipse cx="17" cy="7" rx="9.5" ry="2" fill="#3b3050" stroke={INK} strokeWidth="1.1" />
        <rect x="11" y="4.6" width="12" height="1.6" fill="#e2547a" />
      </g>
    )),
    skin('旗袍姐姐', '🌹', (
      <g>
        <circle cx="10" cy="8" r="2.6" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <circle cx="24" cy="8" r="2.6" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <circle cx="23" cy="4.5" r="1.6" fill="#e2547a" stroke={INK} strokeWidth="0.9" />
      </g>
    )),
  ],
  深圳: [
    skin('创客极客', '🤖', (
      <g stroke={INK} strokeWidth="1.2" fill="#5ba8e2">
        <path d="M9.5 11 A 7.5 7.5 0 0 1 24.5 11" fill="none" strokeWidth="1.8" />
        <rect x="8" y="9.5" width="3.2" height="5" rx="1.6" />
        <rect x="22.8" y="9.5" width="3.2" height="5" rx="1.6" />
      </g>
    )),
  ],
  广州: [
    skin('早茶点心师', '🥟', (
      <g>
        <path d="M9.5 9 Q17 1 24.5 9 Z" fill="#f3e3c3" stroke={INK} strokeWidth="1.2" />
        <path d="M13 5.5 Q17 8 21 5.5" fill="none" stroke={INK} strokeWidth="0.9" />
      </g>
    )),
  ],
  杭州: [
    skin('龙井茶艺师', '🍵', (
      <g>
        <path d="M6 9.5 L17 1 L28 9.5 Z" fill="#e8c468" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="17" cy="1.6" r="0.9" fill="#7a9a5b" stroke={INK} strokeWidth="0.7" />
      </g>
    )),
    skin('电商主播', '🎙️', (
      <circle cx="17" cy="4" r="2.4" fill="#e2547a" stroke={INK} strokeWidth="1.1" />
    ), (
      <g stroke={INK} strokeWidth="1" fill="#5ba8e2">
        <circle cx="25.5" cy="30" r="2" />
        <path d="M25.5 32 L25.5 36" />
      </g>
    )),
  ],
  成都: [
    skin('熊猫饲养员', '🐼', (
      <g>
        <circle cx="11" cy="6" r="2.8" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <circle cx="23" cy="6" r="2.8" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <path d="M9.5 9 A 7.5 7.5 0 0 1 24.5 9 Z" fill="white" stroke={INK} strokeWidth="1.2" />
      </g>
    )),
    skin('火锅串串哥', '🌶️', (
      <g transform="rotate(18 17 6)">
        <path d="M14 4 Q20 2 21 7 Q20 10 15 9 Q12 7 14 4 Z" fill="#c23b3b" stroke={INK} strokeWidth="1.1" />
        <path d="M19.5 3.5 Q21 2 22 3" fill="none" stroke="#315f38" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    )),
  ],
  西安: [
    skin('兵马俑', '🗿', (
      <g>
        <path d="M9.5 10 A 7.5 8 0 0 1 24.5 10 L24.5 7 A 7.5 6.5 0 0 0 9.5 7 Z" fill="#8a8f7a" stroke={INK} strokeWidth="1.2" />
        <rect x="15.2" y="0.5" width="3.6" height="4.5" rx="1.5" fill="#8a8f7a" stroke={INK} strokeWidth="1" />
      </g>
    )),
  ],
  重庆: [
    skin('火锅掌柜', '🔥', (
      <g>
        <path d="M10 8 A 7 6.5 0 0 1 24 8 Z" fill="#8c2f5d" stroke={INK} strokeWidth="1.2" />
        <path d="M12 6.5 Q17 4 22 6.5" fill="none" stroke="#f5a623" strokeWidth="1" />
      </g>
    ), (
      <path d="M11 26 Q17 31 23 26 L23 29 Q17 33.5 11 29 Z" fill="#c23b3b" stroke={INK} strokeWidth="1" />
    )),
  ],
  天津: [
    skin('相声演员', '🪭', (
      <g>
        <path d="M11 8 A 6 5.5 0 0 1 23 8 Z" fill="#3b3050" stroke={INK} strokeWidth="1.2" />
        <circle cx="17" cy="2.8" r="1.1" fill="#e2547a" stroke={INK} strokeWidth="0.8" />
      </g>
    ), (
      <g transform="rotate(-20 24 34)">
        <path d="M24 44 L24 30 L30 34 Z" fill="#ffeeb0" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      </g>
    )),
  ],
  长沙: [
    skin('奶茶店长', '🧋', (
      <g>
        <rect x="12" y="1.5" width="10" height="7" rx="2" fill="#f3e3c3" stroke={INK} strokeWidth="1.2" />
        <path d="M12 4 h10" stroke="#a55a35" strokeWidth="1.6" />
        <path d="M15 1.5 L14 -0.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    )),
  ],
  武汉: [
    skin('热干面摊主', '🍜', (
      <path d="M9 8.5 Q17 3 25 8.5 L25 10 Q17 6 9 10 Z" fill="white" stroke={INK} strokeWidth="1.2" />
    ), (
      <g stroke={INK} strokeWidth="0.9" strokeLinecap="round">
        <path d="M24 30 L28 24 M25.5 30.5 L29.5 24.5" />
      </g>
    )),
  ],
  南京: [
    skin('江南状元', '📜', (
      <g>
        <rect x="12" y="2" width="10" height="6" rx="1.5" fill="#3b3050" stroke={INK} strokeWidth="1.2" />
        <path d="M12 5 L5 3.5 M22 5 L29 3.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    )),
  ],
  苏州: [
    skin('评弹先生', '🪕', (
      <path d="M11 8 A 6 6 0 0 1 23 8 L23 5.5 A 6 5 0 0 0 11 5.5 Z" fill="#5c4383" stroke={INK} strokeWidth="1.2" />
    )),
  ],
  哈尔滨: [
    skin('东北老铁', '🧤', (
      <g>
        <path d="M9 10 A 8 8 0 0 1 25 10 Z" fill="#a5523b" stroke={INK} strokeWidth="1.2" />
        <path d="M9 10 L7.5 16 L11 15 Z M25 10 L26.5 16 L23 15 Z" fill="#a5523b" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      </g>
    )),
  ],
  沈阳: [
    skin('东北老铁', '🧤', (
      <g>
        <path d="M9 10 A 8 8 0 0 1 25 10 Z" fill="#a5523b" stroke={INK} strokeWidth="1.2" />
        <path d="M9 10 L7.5 16 L11 15 Z M25 10 L26.5 16 L23 15 Z" fill="#a5523b" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      </g>
    )),
  ],
  长春: [
    skin('电影放映员', '🎬', (
      <g>
        <circle cx="13" cy="5" r="3" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <circle cx="21" cy="5" r="3" fill="#3b3050" stroke={INK} strokeWidth="1" />
        <circle cx="13" cy="5" r="1" fill="#fbf6ec" />
        <circle cx="21" cy="5" r="1" fill="#fbf6ec" />
      </g>
    )),
  ],
  青岛: [sailor()],
  大连: [sailor()],
  厦门: [sailor()],
  珠海: [sailor()],
  海口: [
    skin('海岛少年', '🥥', (
      <g>
        <path d="M10 8.5 A 7 6 0 0 1 24 8.5 Z" fill="#7a9a5b" stroke={INK} strokeWidth="1.2" />
        <circle cx="13" cy="5" r="1" fill="#e2547a" />
        <circle cx="21" cy="4.5" r="1" fill="#ffeeb0" stroke={INK} strokeWidth="0.6" />
      </g>
    )),
  ],
  昆明: [
    skin('花仙子', '🌸', (
      <g stroke={INK} strokeWidth="0.8">
        <circle cx="10.5" cy="7" r="1.8" fill="#e2547a" />
        <circle cx="15" cy="4.5" r="1.8" fill="#ffeeb0" />
        <circle cx="19.5" cy="4.5" r="1.8" fill="#f2979b" />
        <circle cx="23.5" cy="7" r="1.8" fill="#a03d7a" />
      </g>
    )),
  ],
  拉萨: [
    skin('藏家少年', '🏔️', (
      <g>
        <path d="M10 8 A 7 6 0 0 1 24 8 Z" fill="#c23b3b" stroke={INK} strokeWidth="1.2" />
        <path d="M10 8 Q17 5 24 8" fill="none" stroke="#f5a623" strokeWidth="1.3" />
      </g>
    )),
  ],
  乌鲁木齐: [
    skin('巴郎子', '🍇', (
      <g>
        <path d="M12 7 L22 7 L21 3.5 L13 3.5 Z" fill="#315f38" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M13.5 5.5 L20.5 5.5" stroke="#f5a623" strokeWidth="0.9" />
      </g>
    )),
  ],
  呼和浩特: [
    skin('草原骑手', '🐎', (
      <g>
        <path d="M10 9 A 7 6 0 0 1 24 9 Z" fill="#5b7fb8" stroke={INK} strokeWidth="1.2" />
        <path d="M17 3.5 L17 0.5" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="17" cy="0.5" r="1" fill="#c23b3b" stroke={INK} strokeWidth="0.7" />
      </g>
    )),
  ],
  兰州: [
    skin('拉面师傅', '🍜', (
      <g>
        <ellipse cx="17" cy="6.5" rx="8" ry="3" fill="white" stroke={INK} strokeWidth="1.2" />
        <path d="M12 5.5 Q17 8 22 5.5" fill="none" stroke={INK} strokeWidth="0.8" />
      </g>
    )),
  ],
}

function sailor(): Prof {
  return skin('水手', '⚓', (
    <g>
      <path d="M10 8 A 7 6.5 0 0 1 24 8 L24 6 A 7 5.5 0 0 0 10 6 Z" fill="white" stroke={INK} strokeWidth="1.2" />
      <path d="M10 7.5 L24 7.5" stroke="#5b7fb8" strokeWidth="1.2" />
    </g>
  ))
}

// 通用新角色(全国池也更有戏)
const GENERIC_EXTRAS: readonly Prof[] = [
  { ...skin('外卖骑手', '🛵', (
    <g>
      <path d="M9 10 A 8 8 0 0 1 25 10 Z" fill="#f5a623" stroke={INK} strokeWidth="1.3" />
      <path d="M9 10 L25 10" stroke={INK} strokeWidth="1.1" />
    </g>
  )), outfit: (
    <g stroke={INK} strokeWidth="1">
      <path d="M9.5 26.5 L24.5 26.5 L24.5 36 L9.5 36 Z" fill="#f5a623" opacity="0.85" />
      <path d="M17 26.5 V36" fill="none" />
    </g>
  ), bye: ['您的订单已超时', '下一单替我送'] },
  { ...skin('街舞少年', '🕺', (
    <g transform="rotate(160 17 8)">
      <path d="M9.5 9 A 7.5 7.5 0 0 1 24.5 9 Z" fill="#5c4383" stroke={INK} strokeWidth="1.3" />
      <ellipse cx="24" cy="9.6" rx="4.5" ry="1.6" fill="#5c4383" stroke={INK} strokeWidth="1.1" transform="rotate(12 24 9.6)" />
    </g>
  )), bye: ['battle 输了, 走人', '这地板我擦过了'] },
  { ...skin('汉服同袍', '🏮', (
    <g>
      <circle cx="17" cy="4" r="2.2" fill="#3b3050" stroke={INK} strokeWidth="1" />
      <path d="M15 6.5 Q17 5 19 6.5" fill="none" stroke="#e2547a" strokeWidth="1.4" strokeLinecap="round" />
    </g>
  )), outfit: (
    <path d="M12.5 26 L17 31.5 L21.5 26 M12.5 26 L10.5 44 M21.5 26 L23.5 44" stroke={INK} strokeWidth="1" fill="none" opacity="0.6" />
  ), bye: ['先行一步, 告辞', '这厢有礼了'] },
]

const FULL_ROSTER: readonly Prof[] = [...ROSTER, ...GENERIC_EXTRAS]

/**
 * 按城市挑角色: 选了具体城市时, 约 45% 的小人换上当地皮肤;
 * 多城市按小人序号轮换取材; 全国/未知城市用全名册。
 * 隐藏款财神爷约 1.5% 概率乱入人群 —— 小人池本身就是个概率游戏。
 * 全程确定性随机, 同一份输入同一批小人。
 */
export function pickProf(index: number, cities: readonly string[]): Prof {
  if (rnd(index, 88) < 0.015) return CAISHEN
  const skinnedCities = cities.filter((city) => CITY_SKINS[city])
  if (skinnedCities.length > 0 && rnd(index, 77) < 0.45) {
    const city = skinnedCities[Math.floor(rnd(index, 78) * skinnedCities.length)]
    const skins = CITY_SKINS[city]
    return skins[Math.floor(rnd(index, 79) * skins.length)]
  }
  return FULL_ROSTER[Math.floor(rnd(index, 9) * FULL_ROSTER.length)]
}
