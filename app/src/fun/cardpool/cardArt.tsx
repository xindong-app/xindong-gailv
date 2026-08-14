// 卡面插画库 —— 占卜牌圆奖章里的手绘涂鸦, 统一墨线 (#3b3050) + 粉彩填充。
// 与 roster/person 同一套贴纸语言: 3px 圆头墨线、不追求写实、追求梗。
const INK = '#3b3050'

function Svg({ children, size = 92 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true"
      stroke={INK} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const Ruler = () => (<>
  <rect x="14" y="30" width="68" height="20" rx="5" fill="#fffdf8" />
  <path d="M26 30v8M38 30v8M50 30v8M62 30v8M74 30v8" />
  <path d="M20 66q14 10 28 0t28 0" stroke="#8c2f5d" strokeDasharray="1 7" />
</>)
const Money = () => (<>
  <path d="M40 22q8-9 16 0l-3 8H43z" fill="#ffeeb0" />
  <path d="M34 30h28q9 3 9 14v16q0 9-9 9H34q-9 0-9-9V44q0-11 9-14z" fill="#ffd24a" />
  <circle cx="48" cy="52" r="9" fill="#fffdf8" />
  <path d="M48 47v10M45 49.5q3-2.5 6 0M45 54.5q3 2.5 6 0" stroke="#76570a" strokeWidth={2.2} />
</>)
const House = () => (<>
  <path d="M20 46 48 22l28 24" fill="#ffd9b8" />
  <rect x="26" y="46" width="44" height="30" rx="4" fill="#fffdf8" />
  <path d="M48 62c-4-6-12-4-12 1 0 5 7 8 12 11 5-3 12-6 12-11 0-5-8-7-12-1z" fill="#ff9ebb" strokeWidth={2.2} />
</>)
const Car = () => (<>
  <path d="M18 56q2-10 12-12l6-10q2-3 6-3h14q4 0 7 4l6 9q12 2 13 12" fill="#cdeafa" />
  <path d="M14 56h68v10q0 4-4 4H18q-4 0-4-4z" fill="#cdeafa" />
  <circle cx="30" cy="70" r="7" fill="#fffdf8" /><circle cx="66" cy="70" r="7" fill="#fffdf8" />
</>)
const Smoke = () => (<>
  <rect x="18" y="52" width="42" height="12" rx="6" fill="#fffdf8" />
  <rect x="60" y="52" width="12" height="12" rx="6" fill="#ffd9b8" />
  <path d="M74 44q6-6 0-12t0-12" stroke="#81788e" />
  <path d="M84 44q6-6 0-12t0-12" stroke="#81788e" strokeWidth={2.2} />
</>)
const Wine = () => (<>
  <path d="M32 20h32v10q0 16-16 18-16-2-16-18z" fill="#ffd9e2" />
  <path d="M32 30h32" stroke="#8c2f5d" strokeWidth={4} />
  <path d="M48 48v20M36 74h24" />
</>)
const Stetho = () => (<>
  <path d="M30 20v16q0 14 14 14t14-14V20" />
  <path d="M44 50v10q0 12 12 12t12-12" />
  <circle cx="72" cy="54" r="7" fill="#cdeafa" />
</>)
const Glasses = () => (<>
  <circle cx="30" cy="50" r="14" fill="#e6dbf7" /><circle cx="66" cy="50" r="14" fill="#e6dbf7" />
  <path d="M44 50h8M16 46l-6-4M80 46l6-4" />
</>)
const Hair = () => (<>
  <path d="M28 66q-4-26 20-30 24-4 24 16 0 10-8 14" fill="#ffd9b8" />
  <path d="M36 40q10-8 22-2M40 52q8-6 18-2" strokeWidth={2.2} />
  <path d="M70 30l2 4.4 4.4 2-4.4 2-2 4.4-2-4.4-4.4-2 4.4-2z" fill="#8c2f5d" stroke="none" />
</>)
const Star = () => (<>
  <circle cx="48" cy="48" r="26" strokeDasharray="3 6" />
  <path d="M48 30l4.6 9.4 9.4 4.6-9.4 4.6-4.6 9.4-4.6-9.4-9.4-4.6 9.4-4.6z" fill="#ffeeb0" />
  <circle cx="74" cy="30" r="2.4" fill="#5c4383" stroke="none" /><circle cx="22" cy="62" r="2.4" fill="#5c4383" stroke="none" />
</>)
const Mbti = () => (<>
  <rect x="20" y="20" width="24" height="24" rx="6" fill="#cdeafa" /><rect x="52" y="20" width="24" height="24" rx="6" fill="#ffd9e2" />
  <rect x="20" y="52" width="24" height="24" rx="6" fill="#ddefd3" /><rect x="52" y="52" width="24" height="24" rx="6" fill="#ffeeb0" />
  <path d="M28 32h8M32 28v8M60 32h8M28 64h8M60 60v8M60 68h8" strokeWidth={2.2} />
</>)
const Compass = () => (<>
  <circle cx="48" cy="48" r="26" fill="#fffdf8" />
  <path d="M58 38l-6 14-14 6 6-14z" fill="#ff9ebb" />
  <circle cx="48" cy="48" r="3" fill={INK} stroke="none" />
</>)
const Ticket = () => (<>
  <path d="M18 34h60v10q-6 2-6 6t6 6v10H18V56q6-2 6-6t-6-6z" fill="#ffeeb0" />
  <path d="M38 34v32" strokeDasharray="2 5" />
  <path d="M56 44c-3-4.4-9-3-9 .8 0 3.6 5 5.8 9 8 4-2.2 9-4.4 9-8 0-3.8-6-5.2-9-.8z" fill="#ff9ebb" strokeWidth={2.2} />
</>)
const Gps = () => (<>
  <path d="M48 78S26 58 26 40q0-18 22-18t22 18q0 18-22 38z" fill="#cdeafa" />
  <circle cx="48" cy="40" r="8" fill="#fffdf8" />
  <path d="M70 20q4 2 6 6M76 14q6 3 9 9" stroke="#17647d" strokeWidth={2.2} />
</>)
const Report = () => (<>
  <path d="M28 18h26l14 14v46H28z" fill="#fffdf8" />
  <path d="M54 18v14h14M36 44h24M36 54h24" strokeWidth={2.2} />
  <path d="M48 62c-3-4.4-9-3-9 .8 0 3.6 5 5.8 9 8 4-2.2 9-4.4 9-8 0-3.8-6-5.2-9-.8z" fill="#ff9ebb" strokeWidth={2.2} />
</>)
const Body = () => (<>
  <rect x="24" y="34" width="48" height="40" rx="8" fill="#e6dbf7" />
  <path d="M48 34v40M24 46h48" strokeWidth={2.2} />
  <path d="M48 34q-10-14-18-6M48 34q10-14 18-6" />
  <path d="M43 58h4l1.5 5h-7z" fill={INK} stroke="none" transform="rotate(45 46 60)" />
</>)
const Cap = () => (<>
  <path d="M48 26 16 40l32 14 32-14z" fill="#cdeafa" />
  <path d="M32 48v12q0 8 16 8t16-8V48" />
  <path d="M76 42v16" strokeWidth={2.2} /><circle cx="76" cy="62" r="3.4" fill="#8c2f5d" stroke="none" />
</>)
const Stamp = () => (<>
  <path d="M42 18h12v14q8 3 8 12H34q0-9 8-12z" fill="#ffd9b8" />
  <rect x="26" y="44" width="44" height="14" rx="5" fill="#8c2f5d" stroke="none" />
  <path d="M30 68h36" strokeDasharray="3 5" />
</>)
const Xray = () => (<>
  <rect x="22" y="26" width="52" height="46" rx="10" fill="#ffeeb0" />
  <circle cx="48" cy="46" r="12" fill="#fffdf8" />
  <path d="M48 40v6l4 4" strokeWidth={2.2} />
  <path d="M30 62h8M58 62h8" strokeWidth={2.2} />
</>)
const Dumbbell = () => (<>
  <rect x="14" y="38" width="12" height="22" rx="4" fill="#cdeafa" /><rect x="70" y="38" width="12" height="22" rx="4" fill="#cdeafa" />
  <rect x="26" y="32" width="10" height="34" rx="4" fill="#cdeafa" /><rect x="60" y="32" width="10" height="34" rx="4" fill="#cdeafa" />
  <path d="M36 49h24" />
</>)
const Mirror = () => (<>
  <circle cx="46" cy="38" r="20" fill="#cdeafa" />
  <path d="M46 58v22M40 84h12" />
  <path d="M38 32q4-6 10-7" stroke="#fff" strokeWidth={3.4} />
  <path d="M70 22l1.8 3.8 3.8 1.8-3.8 1.8-1.8 3.8-1.8-3.8-3.8-1.8 3.8-1.8z" fill="#8c2f5d" stroke="none" />
</>)
const Hanger = () => (<>
  <path d="M48 22q6 0 6 5t-6 5" />
  <path d="M48 32 20 52q-4 4 2 4h52q6 0 2-4z" fill="#ffd9e2" />
  <path d="M34 62v6M62 62v6" strokeWidth={2.2} />
</>)
const Sneaker = () => (<>
  <path d="M20 60V44q10 0 16-8 4 8 12 10l22 6q10 2 10 8v4H20z" fill="#ffd9e2" />
  <path d="M20 64h60M44 46l6-3M48 52l6-3" strokeWidth={2.2} />
</>)
const Pan = () => (<>
  <path d="M18 44h44v8q0 12-22 12t-22-12z" fill="#655a75" />
  <path d="M62 48h16" />
  <circle cx="40" cy="44" r="9" fill="#fffdf8" /><circle cx="40" cy="44" r="3.6" fill="#ffd24a" stroke="none" />
  <path d="M32 30q3-4 0-8M44 30q3-4 0-8" stroke="#81788e" strokeWidth={2.2} />
</>)
const Broom = () => (<>
  <path d="M62 16 44 46" />
  <path d="M36 44h18l4 22q-13 8-26 0z" fill="#ffeeb0" />
  <path d="M40 52l2 14M48 52v16M56 50l-2 16" strokeWidth={2.2} />
</>)
const Sparkles = () => (<>
  <path d="M46 18l5.4 11 11 5.4-11 5.4-5.4 11-5.4-11-11-5.4 11-5.4z" fill="#ffeeb0" />
  <path d="M70 54l3 6.2 6.2 3-6.2 3-3 6.2-3-6.2-6.2-3 6.2-3z" fill="#cdeafa" />
  <path d="M24 58l2.4 5 5 2.4-5 2.4-2.4 5-2.4-5-5-2.4 5-2.4z" fill="#ffd9e2" />
</>)
const Bowl = () => (<>
  <path d="M22 44h52q0 22-26 22t-26-22z" fill="#cdeafa" />
  <path d="M18 44h60" strokeWidth={4} />
  <path d="M58 36 74 18M64 38l12-14" strokeWidth={2.4} />
  <path d="M36 32q3-4 0-8M46 32q3-4 0-8" stroke="#81788e" strokeWidth={2.2} />
</>)
const Paw = () => (<>
  <ellipse cx="48" cy="58" rx="15" ry="12" fill="#ffd9e2" />
  <circle cx="28" cy="38" r="6.4" fill="#ffd9e2" /><circle cx="44" cy="30" r="6.4" fill="#ffd9e2" />
  <circle cx="60" cy="30" r="6.4" fill="#ffd9e2" /><circle cx="72" cy="40" r="6.4" fill="#ffd9e2" />
</>)
const Plane = () => (<>
  <path d="M14 46 82 20 56 78l-12-18z" fill="#cdeafa" />
  <path d="M44 60 82 20" strokeWidth={2.2} />
</>)
const Gamepad = () => (<>
  <rect x="16" y="34" width="64" height="30" rx="15" fill="#e6dbf7" />
  <path d="M30 44v10M25 49h10" />
  <circle cx="62" cy="44" r="3.4" fill="#8c2f5d" stroke="none" /><circle cx="70" cy="52" r="3.4" fill="#17647d" stroke="none" />
</>)
const Battery = () => (<>
  <rect x="20" y="32" width="48" height="30" rx="8" fill="#ddefd3" />
  <path d="M68 42h8v10h-8" />
  <path d="M42 38l-7 10h7l-3 10 11-13h-7l4-7z" fill="#ffd24a" strokeWidth={2.2} />
</>)
const Train = () => (<>
  <rect x="26" y="18" width="44" height="48" rx="12" fill="#cdeafa" />
  <rect x="34" y="26" width="28" height="16" rx="5" fill="#fffdf8" strokeWidth={2.2} />
  <circle cx="37" cy="54" r="3.4" fill="#ffd24a" stroke="none" /><circle cx="59" cy="54" r="3.4" fill="#ffd24a" stroke="none" />
  <path d="M34 74l-6 8M62 74l6 8M30 82h36" />
</>)
const Badge = () => (<>
  <path d="M48 16l9 6 11-1 2 11 8 7-5 10 3 11-10 4-5 10-11-2-9 7-6-9-11-3 1-11-7-8 6-9-1-11 11-2z" fill="#ffeeb0" />
  <path d="M38 44l7 7 13-14" stroke="#315f38" strokeWidth={4} />
</>)
const Moon = () => (<>
  <path d="M60 20q-22 6-22 28t22 28q-32-2-32-28t32-28z" fill="#ffeeb0" />
  <path d="M66 26h8l-8 9h8M74 44h6l-6 7h6" stroke="#5c4383" strokeWidth={2.2} />
</>)
const Suitcase = () => (<>
  <rect x="24" y="30" width="48" height="40" rx="9" fill="#ffd9b8" />
  <path d="M38 30v-6q0-5 5-5h10q5 0 5 5v6M24 44h48M24 58h48" strokeWidth={2.2} />
</>)
const Chat = () => (<>
  <path d="M20 28h56v30H46l-12 12v-12H20z" fill="#cdeafa" />
  <path d="M48 36c-2.6-3.8-7.8-2.6-7.8 .7 0 3.1 4.3 5 7.8 6.9 3.5-1.9 7.8-3.8 7.8-6.9 0-3.3-5.2-4.5-7.8-.7z" fill="#ff9ebb" strokeWidth={2.2} />
</>)
const Bolt = () => (<>
  <path d="M52 16 26 52h16l-6 28 30-40H48z" fill="#ffd24a" />
</>)
const Megaphone = () => (<>
  <path d="M22 44v14h10l26 12V32L32 44z" fill="#ffd9e2" />
  <path d="M32 58v10q0 4 5 4" />
  <path d="M66 40q6 4 0 8M72 32q12 10 0 20" stroke="#8c2f5d" strokeWidth={2.2} />
</>)
const Door = () => (<>
  <rect x="28" y="18" width="40" height="60" rx="6" fill="#ffd9b8" />
  <path d="M28 20q16 4 16 14v40q-8 2-16 4z" fill="#fffdf8" />
  <circle cx="40" cy="50" r="2.6" fill={INK} stroke="none" />
</>)
const Fistbump = () => (<>
  <rect x="16" y="38" width="26" height="22" rx="9" fill="#cdeafa" />
  <rect x="54" y="38" width="26" height="22" rx="9" fill="#ffd9e2" />
  <path d="M22 44h14M22 52h14M60 44h14M60 52h14" strokeWidth={2.2} />
  <path d="M44 24l2 4.4 4.4 2-4.4 2-2 4.4-2-4.4-4.4-2 4.4-2z" fill="#8c2f5d" stroke="none" />
</>)
const Anchor = () => (<>
  <circle cx="48" cy="22" r="7" />
  <path d="M48 29v44M34 40h28" />
  <path d="M24 56q0 17 24 17t24-17M24 56l-5 6M24 56l6 5M72 56l5 6M72 56l-6 5" fill="none" />
</>)
const Calendar = () => (<>
  <rect x="22" y="24" width="52" height="48" rx="8" fill="#fffdf8" />
  <path d="M22 38h52M34 18v10M62 18v10" />
  <path d="M48 46c-3-4.4-9-3-9 .8 0 3.6 5 5.8 9 8 4-2.2 9-4.4 9-8 0-3.8-6-5.2-9-.8z" fill="#ff9ebb" strokeWidth={2.2} />
</>)
const Dice = () => (<>
  <rect x="18" y="34" width="30" height="30" rx="8" fill="#ffd9e2" transform="rotate(-8 33 49)" />
  <rect x="48" y="28" width="30" height="30" rx="8" fill="#cdeafa" transform="rotate(10 63 43)" />
  <circle cx="30" cy="46" r="2.6" fill={INK} stroke="none" /><circle cx="38" cy="54" r="2.6" fill={INK} stroke="none" />
  <circle cx="60" cy="40" r="2.6" fill={INK} stroke="none" /><circle cx="68" cy="48" r="2.6" fill={INK} stroke="none" /><circle cx="64" cy="36" r="2.6" fill={INK} stroke="none" />
</>)

const ARTS = {
  ruler: Ruler, money: Money, house: House, car: Car, smoke: Smoke, wine: Wine,
  stetho: Stetho, glasses: Glasses, hair: Hair, star: Star, mbti: Mbti,
  compass: Compass, ticket: Ticket, gps: Gps, report: Report, body: Body,
  cap: Cap, stamp: Stamp, xray: Xray, dumbbell: Dumbbell, mirror: Mirror,
  hanger: Hanger, sneaker: Sneaker, pan: Pan, broom: Broom, sparkles: Sparkles,
  bowl: Bowl, paw: Paw, plane: Plane, gamepad: Gamepad, battery: Battery,
  train: Train, badge: Badge, moon: Moon, suitcase: Suitcase, chat: Chat,
  bolt: Bolt, megaphone: Megaphone, door: Door, fistbump: Fistbump,
  anchor: Anchor, calendar: Calendar, dice: Dice,
} as const

export type CardArtKind = keyof typeof ARTS

/** 卡面奖章插画: 统一 96 画布, 用 size 缩放 */
export function CardArt({ kind, size = 92 }: { kind: CardArtKind; size?: number }) {
  const Art = ARTS[kind] ?? Sparkles
  return <Svg size={size}><Art /></Svg>
}
