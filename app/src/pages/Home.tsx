import { useEffect, useMemo, useRef, useState } from 'react'
import { CITIES } from '../data/cities'
import { ZODIACS, SOURCES } from '../data/model'
import { compute, computeYou, fmtCount, fmtRarity, rarityTier, type Selection, type SelfProfile, type Result, type Tier } from '../engine/calc'
import PeopleFunnel from '../components/PeopleFunnel'
import { survivorProf } from '../engine/roster'
import Confetti from '../components/Confetti'
import { downloadShareCard } from '../utils/shareCard'

// ---------- 数字滚动 ----------
function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target)
  const fromRef = useRef(target)
  const rafRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - k, 3)
      const v = from + (target - from) * eased
      setVal(v)
      if (k < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return val
}

// ---------- 逐字弹出 ----------
function SplitChars({ text }: { text: string }) {
  return (
    <span key={text} aria-label={text}>
      {[...text].map((c, i) => (
        <span key={`${text}-${i}`} className="char-pop" style={{ animationDelay: `${i * 55}ms` }}>
          {c === ' ' ? ' ' : c}
        </span>
      ))}
    </span>
  )
}

// ---------- 小控件 ----------
function Chip({
  active, onClick, children, color = '#ffd9e2',
}: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[40px] rounded-full px-4 text-sm border-[2.5px] transition-all duration-150 select-none
        active:scale-90
        ${active
          ? 'border-[#3b3050] font-bold shadow-[3px_3px_0_#3b3050] -translate-y-0.5 -rotate-1'
          : 'border-transparent bg-white/70 hover:bg-white hover:-translate-y-0.5 hover:border-[#3b3050]/25'}`}
      style={active ? { background: color } : undefined}
    >
      {children}
    </button>
  )
}

function Card({
  title, emoji, color, badge, children, tilt = 'tilt-1', delay = 0,
}: {
  title: string; emoji: string; color: string; badge: string;
  children: React.ReactNode; tilt?: string; delay?: number
}) {
  return (
    <div
      className={`fade-up sticker rounded-[22px] p-5 transition-transform duration-200 hover:-translate-y-1 ${tilt}`}
      style={{ background: color, animationDelay: `${delay}ms` }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display text-lg text-[#3b3050]">
          {emoji} {title}
        </h3>
        <span className="shrink-0 rounded-full border border-[#3b3050]/20 bg-white/85 px-2.5 py-0.5 text-[11px] text-[#3b3050]/80">{badge}</span>
      </div>
      {children}
    </div>
  )
}

// 章节标题: 像一张斜贴上去的便利贴
function StickyTitle({ children, color = '#ffffff' }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="pt-2">
      <span
        className="sticker-sm inline-block -rotate-1 rounded-xl px-4 py-1.5 font-display text-xl text-[#3b3050]"
        style={{ background: color }}
      >
        {children}
      </span>
    </div>
  )
}

function toggle(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

const BMI_OPTS = ['骨感', '纤细', '匀称', '标准', '微胖', '丰腴', '圆滚滚']
const INCOME_OPTS = [null, 5, 8, 10, 15, 20, 30, 50, 80, 100, 200, 300, 500, 800, 1000]
const WEALTH_OPTS = [null, 100, 200, 300, 500, 800, 1000, 2000, 5000, 10000, 30000, 50000, 100000]
const ME_INCOME_OPTS = [null, 5, 10, 20, 30, 50]
const ME_WEALTH_OPTS = [null, 100, 300, 600, 1000]
const MBTI_AXES: Array<{ label: string; pair: [string, string] }> = [
  { label: '精力', pair: ['E', 'I'] },
  { label: '信息', pair: ['S', 'N'] },
  { label: '决策', pair: ['T', 'F'] },
  { label: '生活', pair: ['J', 'P'] },
]

const DEFAULT_SEL: Selection = {
  gender: 'male',
  ageMin: 26,
  ageMax: 34,
  cities: ['全国'],
  marital: ['未婚'],
  heightMin: null,
  bmi: [],
  incomeMin: null,
  wealthMin: null,
  needHouse: false,
  houseLoc: null,
  houseArea: null,
  houseType: null,
  needCar: false,
  carBands: [],
  edu: [],
  school: null,
  noSmoke: false,
  drink: 'any',
  tattooFree: false,
  hair: [],
  zodiacs: [],
  health: [],
  intimacy: [],
  bonus: [],
  emotion: [],
  mbti: [],
}

const DEFAULT_ME: SelfProfile = {
  age: 28, height: null, income: null, edu: null, house: false, car: false,
  bmi: null, wealth: null, hairFull: false, noSmoke: false, noDrink: false,
}

const PRESETS: Array<{ name: string; emoji: string; sel: Selection }> = [
  {
    name: '偶像剧男主', emoji: '🤵',
    sel: {
      ...DEFAULT_SEL, heightMin: 180, bmi: ['匀称'], incomeMin: 50,
      needHouse: true, houseLoc: '核心区', edu: ['本科', '硕士', '博士'], school: '985',
      noSmoke: true, hair: ['发量王者'],
    },
  },
  {
    name: '我妈的理想型', emoji: '👩‍👦',
    sel: {
      ...DEFAULT_SEL, ageMin: 26, ageMax: 32, incomeMin: 20,
      needHouse: true, needCar: true, edu: ['本科', '硕士'],
      noSmoke: true, drink: 'notRegular', hair: ['发量王者'], bonus: ['体制内'],
    },
  },
  { name: '随缘', emoji: '🍃', sel: DEFAULT_SEL },
]

// ---------- 结果主体(桌面侧栏 & 手机底栏共用) ----------
function ResultBody({
  result, tier, rarity, animCount, mutual, sharing, onShare, scope,
}: {
  result: Result; tier: Tier; rarity: string; animCount: number;
  mutual: number | null; sharing: boolean; onShare: () => void; scope: string
}) {
  return (
    <div className="mt-1">
      <div className="flex items-center gap-2">
        <span
          key={tier.key}
          className="stamp-in tier-shine inline-block rounded-full border-[2.5px] border-[#3b3050] px-4 py-1 font-display text-lg shadow-[3px_3px_0_#3b3050]"
          style={{ background: tier.bg, color: tier.fg }}
        >
          {tier.label}
        </span>
      </div>
      <div className="mt-1 font-hand text-lg text-[#a55a35]">{tier.comment}</div>

      <div className="mt-2 font-display text-5xl leading-tight text-[#3b3050]">
        <SplitChars text={rarity} />
      </div>
      <div className="mt-2 text-sm text-[#3b3050]/80">
        📍 在「{scope}」里, 满足全部条件的大约有 <b className="text-lg">{fmtCount(animCount)}</b>
      </div>
      <div className="text-xs text-[#3b3050]/55">
        误差区间 {fmtCount(result.low)} ~ {fmtCount(result.high)}(维度间的小猫腻)
      </div>
      <div className="mt-3 space-y-1 text-sm text-[#3b3050]/80">
        {result.comparisons.map((c) => (
          <div key={c}>💡 {c}</div>
        ))}
      </div>
      {result.verdict && (
        <div key={result.verdict} className="pop-in mt-3 rounded-2xl border-2 border-dashed border-[#3b3050]/25 bg-white/70 p-3 font-hand text-lg text-[#a55a35]">
          🔪 毒舌总评: {result.verdict}
        </div>
      )}
      {mutual != null && (
        <div className="pop-in mt-3 rounded-2xl border-2 border-[#3b3050]/15 bg-white/80 p-3 text-sm text-[#3b3050]">
          💞 互相心动 ≈ <span className="font-display text-lg text-[#a03d7a]">{fmtRarity(mutual)}</span>
        </div>
      )}
      <button
        onClick={onShare}
        disabled={sharing}
        className="sticker-sm mt-4 w-full rounded-full bg-[#f5a623] px-4 py-2.5 font-display text-[#3b3050] transition-transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 active:shadow-none disabled:opacity-60"
      >
        {sharing ? '正在画战报…' : '📸 一键生成战报, 去群里炸场'}
      </button>
    </div>
  )
}

// ---------- 主页面 ----------
export default function Home() {
  const [sel, setSel] = useState<Selection>(DEFAULT_SEL)
  const [armedPreset, setArmedPreset] = useState<string | null>(null)
  const armTimer = useRef<number>(0)

  // 预设两段式确认: 已加过条件时, 第一次点击只"上膛", 再点才覆盖
  const applyPreset = (p: (typeof PRESETS)[number]) => {
    const dirty = JSON.stringify(sel) !== JSON.stringify(DEFAULT_SEL)
    if (dirty && armedPreset !== p.name) {
      setArmedPreset(p.name)
      window.clearTimeout(armTimer.current)
      armTimer.current = window.setTimeout(() => setArmedPreset(null), 2500)
      return
    }
    window.clearTimeout(armTimer.current)
    setArmedPreset(null)
    setSel(p.sel)
  }
  const [cityQuery, setCityQuery] = useState('')
  const [me, setMe] = useState<SelfProfile>(DEFAULT_ME)
  const [sharing, setSharing] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const up = (patch: Partial<Selection>) => setSel((s) => ({ ...s, ...patch }))
  const result = useMemo(() => compute(sel), [sel])
  const animCount = useCountUp(result.count)

  const hotCities = CITIES.filter((c) => c.hot)
  const filteredCities = cityQuery ? CITIES.filter((c) => c.name.includes(cityQuery)) : []

  const pickCity = (name: string) => {
    if (name === '全国') return up({ cities: ['全国'] })
    const cur = sel.cities.filter((c) => c !== '全国')
    const next = cur.includes(name) ? cur.filter((c) => c !== name) : [...cur, name]
    up({ cities: next.length === 0 ? ['全国'] : next })
  }

  // MBTI: 同轴互斥
  const pickMbti = (letter: string) => {
    const axis = MBTI_AXES.find((a) => a.pair.includes(letter))
    if (!axis) return
    const cur = sel.mbti.filter((l) => !axis.pair.includes(l))
    const next = sel.mbti.includes(letter) ? cur : [...cur, letter]
    up({ mbti: next })
  }

  const rarity = fmtRarity(result.finalP)
  const noFilter = result.steps.length === 0
  const tier = result.tier
  const scope = `${sel.cities.join('、') || '全国'} · ${sel.ageMin}-${sel.ageMax} 岁 · ${sel.gender === 'male' ? '男' : '女'} · ${sel.marital.join('/') || '未婚'}`
  const houseOn = sel.needHouse || sel.houseLoc != null || sel.houseArea != null || sel.houseType != null
  const myGender = sel.gender === 'male' ? 'female' : 'male'

  // 反向彩蛋
  const hasMeInfo = me.height != null || me.income != null || me.edu != null || me.house || me.car
    || me.bmi != null || me.wealth != null || me.hairFull || me.noSmoke || me.noDrink
  const youP = hasMeInfo ? computeYou(me, sel) : null
  const youTier = youP != null ? rarityTier(youP * 10000) : null
  const mutual = youP != null ? result.finalP * youP : null

  const celebrate = !noFilter && ['SSR', 'UR', 'M'].includes(tier.key)

  const onShare = async () => {
    setSharing(true)
    try {
      const survivor80 = result.pool > 0 ? Math.max(0, Math.round((80 * result.count) / result.pool)) : 0
      await downloadShareCard({ sel, result, tier, youP, youTier, survivor: survivorProf(survivor80) })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#fbf6ec' }}>
      {celebrate && <Confetti seed={tier.key} />}
      {/* 漂浮装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="float-slow absolute -left-16 top-24 h-52 w-52 rounded-full opacity-40" style={{ background: '#ffd9e2', ['--rot' as string]: '-8deg' }} />
        <div className="float-slower absolute -right-20 top-1/3 h-64 w-64 rounded-full opacity-30" style={{ background: '#cdeafa', ['--rot' as string]: '6deg' }} />
        <div className="float-slow absolute bottom-10 left-1/4 h-32 w-32 rounded-full opacity-30" style={{ background: '#ddefd3' }} />
      </div>

      {/* Hero */}
      <header className="relative mx-auto max-w-5xl px-4 pt-12 pb-8 text-center">
        {/* 旋转环形文字徽章 */}
        <div className="pointer-events-none absolute right-2 top-4 hidden md:block lg:right-16">
          <svg width="130" height="130" viewBox="0 0 130 130" className="spin-slow">
            <defs>
              <path id="circlePath" d="M 65,65 m -46,0 a 46,46 0 1,1 92,0 a 46,46 0 1,1 -92,0" />
            </defs>
            <text fontSize="12.5" fill="#a55a35" className="font-hand" letterSpacing="2">
              <textPath href="#circlePath">
                官方数据 × 最玄的缘 × 心动概率局 × 缘分解析 ×
              </textPath>
            </text>
            <text x="65" y="73" textAnchor="middle" fontSize="26">💘</text>
          </svg>
        </div>
        <div className="font-hand text-2xl text-[#a55a35]">用官方数据, 算最玄的缘</div>
        <h1 className="font-display mt-2 text-6xl md:text-7xl text-[#3b3050]">
          心动概率局 💘
        </h1>
        {/* 手绘波浪线 */}
        <svg className="mx-auto mt-1" width="240" height="14" viewBox="0 0 240 14" fill="none">
          <path d="M4 8 Q 24 2, 44 8 T 84 8 T 124 8 T 164 8 T 204 8 T 236 8" stroke="#a03d7a" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
        </svg>
        <p className="mx-auto mt-4 max-w-xl text-[#3b3050]/70">
          把条件一个个码上去, 看 TA 是「十里挑一」还是「人间隐藏款」。
          数字都有官方出处, 估算的部分也绝不装死 🙋
        </p>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-40 lg:pb-24 lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
        {/* 左: 条件区 */}
        <div className="space-y-6">
          {/* 第一步 */}
          <Card title="第一步 · 圈个地盘" emoji="🎯" color="#cdeafa" badge="人口普查数据" tilt="tilt-2">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">我在找</span>
                <Chip active={sel.gender === 'male'} onClick={() => up({ gender: 'male' })} color="#cdeafa">👦 男生</Chip>
                <Chip active={sel.gender === 'female'} onClick={() => up({ gender: 'female' })} color="#ffd9e2">👧 女生</Chip>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#3b3050]/70 w-16">年龄</span>
                <input type="range" min={18} max={50} value={sel.ageMin}
                  onChange={(e) => up({ ageMin: Math.min(+e.target.value, sel.ageMax) })}
                  className="w-32" />
                <input type="range" min={18} max={50} value={sel.ageMax}
                  onChange={(e) => up({ ageMax: Math.max(+e.target.value, sel.ageMin) })}
                  className="w-32" />
                <span className="rounded-full border-2 border-[#3b3050]/15 bg-white/85 px-3 py-1 text-sm font-bold">{sel.ageMin} - {sel.ageMax} 岁</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#3b3050]/70 w-16">城市</span>
                  <Chip active={sel.cities.includes('全国')} onClick={() => pickCity('全国')} color="#ffeeb0">🇨🇳 全国</Chip>
                  {hotCities.map((c) => (
                    <Chip key={c.name} active={sel.cities.includes(c.name)} onClick={() => pickCity(c.name)} color="#ffeeb0">
                      {c.name}
                    </Chip>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-[4.5rem]">
                  <input
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                    placeholder="搜你的城市…"
                    className="min-h-[40px] w-40 rounded-full border-2 border-[#3b3050]/15 bg-white/85 px-3 text-sm outline-none focus:border-[#e6dbf7]"
                  />
                  {filteredCities.slice(0, 6).map((c) => (
                    <Chip key={c.name} active={sel.cities.includes(c.name)} onClick={() => pickCity(c.name)} color="#ffeeb0">
                      {c.name}
                    </Chip>
                  ))}
                </div>
                <div className="mt-1 pl-[4.5rem] text-[11px] text-[#3b3050]/60">
                  随便勾; 选了城市, 收入资产就按当地行情算
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">婚史</span>
                {['未婚', '离异无孩', '离异有孩'].map((m) => (
                  <Chip key={m} active={sel.marital.includes(m)} onClick={() => up({ marital: toggle(sel.marital, m) })} color="#e6dbf7">
                    {m}
                  </Chip>
                ))}
                <span className="text-[11px] text-[#3b3050]/60">随便勾</span>
              </div>
            </div>
          </Card>

          {/* 第二步 + 预设 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StickyTitle color="#ffffff">第二步 · 哐哐加条件 🧅</StickyTitle>
            <span className="text-xs text-[#3b3050]/50">手懒? 直接抄作业 👇</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className={
                  armedPreset === p.name
                    ? 'min-h-[36px] rounded-full border-2 border-red-400 bg-red-50 px-3 text-xs font-bold text-red-500 transition-all active:scale-90'
                    : 'min-h-[36px] rounded-full border-2 border-[#3b3050]/15 bg-white/75 px-3 text-xs transition-all hover:-translate-y-0.5 hover:border-[#3b3050] hover:bg-white active:scale-90'
                }
              >
                {armedPreset === p.name ? `⚠️ 再点一次覆盖 ${p.name}` : `${p.emoji} ${p.name}`}
              </button>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Card title="身高" emoji="📏" color="#ffd9e2" badge="📊 卫健委数据" tilt="tilt-1" delay={60}>
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={sel.heightMin == null} onClick={() => up({ heightMin: null })} color="#ffd9e2">不限</Chip>
                <Chip active={sel.heightMin != null} onClick={() => up({ heightMin: sel.gender === 'male' ? 175 : 162 })} color="#ffd9e2">
                  有要求
                </Chip>
              </div>
              {sel.heightMin != null && (
                <div className="mt-3 flex items-center gap-3">
                  <input type="range" min={sel.gender === 'male' ? 160 : 145} max={sel.gender === 'male' ? 195 : 185}
                    value={sel.heightMin}
                    onChange={(e) => up({ heightMin: +e.target.value })}
                    className="w-40" />
                  <span className="rounded-full border-2 border-[#3b3050]/15 bg-white/85 px-3 py-1 text-sm font-bold">{sel.heightMin} cm 以上</span>
                </div>
              )}
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                18-44 岁{sel.gender === 'male' ? '男' : '女'}性平均 {sel.gender === 'male' ? '169.7' : '158.0'} cm(卫健委 2020)
              </div>
            </Card>

            <Card title="身材" emoji="🍑" color="#ddefd3" badge="📊 卫健委数据" tilt="tilt-3" delay={100}>
              <div className="flex flex-wrap gap-2">
                {BMI_OPTS.map((b) => (
                  <Chip key={b} active={sel.bmi.includes(b)} onClick={() => up({ bmi: toggle(sel.bmi, b) })} color="#ddefd3">
                    {b}
                  </Chip>
                ))}
              </div>
              <button
                onClick={() => up({ bmi: toggle(sel.bmi, '训练痕迹') })}
                className={
                  sel.bmi.includes('训练痕迹')
                    ? 'mt-2 rounded-full border-2 border-dashed border-[#3b3050] bg-[#f5a623]/25 px-3 py-1.5 text-xs font-bold transition-all active:scale-95'
                    : 'mt-2 rounded-full border-2 border-dashed border-[#3b3050]/30 bg-white/60 px-3 py-1.5 text-xs text-[#3b3050]/70 transition-all hover:border-[#3b3050]/60 active:scale-95'
                }
              >
                {sel.bmi.includes('训练痕迹') ? '✅' : '➕'} 再叠加一条: 💪 要有训练痕迹
              </button>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                上面档位随便勾, 勾得越多人越多; 按 BMI 细分为 7 档: &lt;17 骨感 / 17-18.5 纤细 / 18.5-21.5 匀称 / 21.5-24 标准 / 24-26 微胖 / 26-28 丰腴 / 28+ 圆滚滚。虚线按钮是叠加条件(肌肉线条/马甲线, 估算), 点了人会变少
              </div>
            </Card>

            <Card title="年收入" emoji="💰" color="#ffeeb0" badge="📑 统计局 + 个税数据校准" tilt="tilt-2" delay={140}>
              <div className="flex flex-wrap gap-2">
                {INCOME_OPTS.map((v) => (
                  <Chip key={String(v)} active={sel.incomeMin === v} onClick={() => up({ incomeMin: v })} color="#ffeeb0">
                    {v == null ? '不限' : `${v}万+`}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-[#3b3050]/60">自定义:</span>
                <input
                  type="number" min={1} max={10000} placeholder="如 66"
                  className="min-h-[40px] w-24 rounded-full border-2 border-[#3b3050]/15 bg-white/85 px-3 text-sm outline-none focus:border-[#f5a623]"
                  onChange={(e) => {
                    const v = e.target.value === '' ? null : Math.max(1, +e.target.value)
                    up({ incomeMin: v })
                  }}
                  value={sel.incomeMin ?? ''}
                />
                <span className="text-xs text-[#3b3050]/60">万以上 / 年</span>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                年入百万全国约 0.25%(个税数据校准), 千万级按幂律尾外推; 和资产联合算, 不会重复刀人
              </div>
            </Card>

            <Card title="家庭总资产" emoji="🏦" color="#ffd9b8" badge="📊 央行 + 胡润" tilt="tilt-1" delay={180}>
              <div className="flex flex-wrap gap-2">
                {WEALTH_OPTS.map((v) => (
                  <Chip key={String(v)} active={sel.wealthMin === v} onClick={() => up({ wealthMin: v })} color="#ffd9b8">
                    {v == null ? '不限' : v >= 10000 ? `${v / 10000}亿+` : `${v}万+`}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                含自住房产; 城镇家庭中位数 163 万(央行 2019), 600 万+ 约 1% / 亿元+ 约 0.026%(胡润), 亿元以上按幂律尾外推
              </div>
            </Card>

            <Card title="房子" emoji="🏠" color="#e6dbf7" badge="🤔 侧面印证估算" tilt="tilt-3" delay={220}>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip active={!houseOn} onClick={() => up({ needHouse: false, houseLoc: null, houseArea: null, houseType: null })} color="#e6dbf7">不限</Chip>
                  <Chip active={houseOn} onClick={() => up({ needHouse: true })} color="#e6dbf7">🏠 本地有房</Chip>
                </div>
                {houseOn && (
                  <div className="fade-up space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#3b3050]/60 w-12">地段</span>
                      {['核心区', '市区', '郊区'].map((l) => (
                        <Chip key={l} active={sel.houseLoc === l}
                          onClick={() => up({ houseLoc: sel.houseLoc === l ? null : l, needHouse: true })} color="#e6dbf7">
                          {l}
                        </Chip>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#3b3050]/60 w-12">面积</span>
                      {[90, 120, 144, 200].map((a) => (
                        <Chip key={a} active={sel.houseArea === a}
                          onClick={() => up({ houseArea: sel.houseArea === a ? null : a, needHouse: true })} color="#e6dbf7">
                          {a}m²+
                        </Chip>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-[#3b3050]/60 w-12">类型</span>
                      {['大平层', '别墅', '四合院'].map((t) => (
                        <Chip key={t} active={sel.houseType === t}
                          onClick={() => up({ houseType: sel.houseType === t ? null : t, needHouse: true })} color="#e6dbf7">
                          {t}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                城镇家庭住房拥有率 96%(央行); 地段/面积/类型是按住房存量研究估的, 轻喷
              </div>
            </Card>

            <Card title="车子" emoji="🚗" color="#cdeafa" badge="🤔 乘联会数据侧推" tilt="tilt-2" delay={260}>
              <div className="flex flex-wrap gap-2">
                <Chip active={!sel.needCar} onClick={() => up({ needCar: false, carBands: [] })} color="#cdeafa">不限</Chip>
                <Chip active={sel.needCar && sel.carBands.length === 0} onClick={() => up({ needCar: true, carBands: [] })} color="#cdeafa">🚗 有车就行</Chip>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#3b3050]/60">价位档</span>
                {['10万以下', '10-20万', '20-50万', '50-100万', '100万以上'].map((b) => (
                  <Chip key={b} active={sel.carBands.includes(b)}
                    onClick={() => up({ needCar: true, carBands: toggle(sel.carBands, b) })} color="#cdeafa">
                    {b}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                随便勾; 约四成城镇家庭有车(七普), 30 万+ 车型销量占比约 12-15%(乘联会)
              </div>
            </Card>

            <Card title="学历" emoji="🎓" color="#bfe8c9" badge="📊 普查 + 教育部" tilt="tilt-1" delay={300}>
              <div className="flex flex-wrap gap-2">
                {['大专', '本科', '硕士', '博士'].map((e) => (
                  <Chip key={e} active={sel.edu.includes(e)} onClick={() => up({ edu: toggle(sel.edu, e) })} color="#bfe8c9">
                    {e}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs text-[#3b3050]/60">院校档</span>
                {['211', '985', 'C9', '清北'].map((s) => (
                  <Chip key={s} active={sel.school === s}
                    onClick={() => up({ school: sel.school === s ? null : s })} color="#bfe8c9">
                    {s}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                随便勾; 院校档是嵌套的(清北⊂C9⊂985⊂211), 占同龄人: 211 约 2.8% / 985 约 1% / 清北约 0.04%
              </div>
            </Card>

            <Card title="生活习惯" emoji="🧼" color="#ddefd3" badge="📊 烟草调查 / 健康监测" tilt="tilt-3" delay={340}>
              <div className="flex flex-wrap gap-2">
                <Chip active={sel.noSmoke} onClick={() => up({ noSmoke: !sel.noSmoke })} color="#ddefd3">🚭 不抽烟</Chip>
                <Chip active={sel.drink === 'notRegular'} onClick={() => up({ drink: sel.drink === 'notRegular' ? 'any' : 'notRegular' })} color="#ddefd3">🍺 不经常喝</Chip>
                <Chip active={sel.drink === 'none'} onClick={() => up({ drink: sel.drink === 'none' ? 'any' : 'none' })} color="#ddefd3">🙅 滴酒不沾</Chip>
                <Chip active={sel.tattooFree} onClick={() => up({ tattooFree: !sel.tattooFree })} color="#ddefd3">🐉 无纹身</Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                男性吸烟率约 47%, 每周规律饮酒 33%(官方调查); 无纹身为估算口径
              </div>
            </Card>

            <Card title="头发" emoji="💇" color="#ffd9e2" badge="📊 医学指南" tilt="tilt-2" delay={380}>
              <div className="flex flex-wrap gap-2">
                <Chip active={sel.hair.includes('发量王者')} onClick={() => up({ hair: toggle(sel.hair, '发量王者') })} color="#ffd9e2">
                  🦁 发量王者
                </Chip>
                <Chip active={sel.hair.includes('发际线在线')} onClick={() => up({ hair: toggle(sel.hair, '发际线在线') })} color="#ffd9e2">
                  📐 发际线在线
                </Chip>
                <Chip active={sel.hair.includes('无少白头')} onClick={() => up({ hair: toggle(sel.hair, '无少白头') })} color="#ffd9e2">
                  🦳 无少白头
                </Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                每勾一条都是加码, 人要同时满足; 男性雄脱患病率 21.3%(《雄激素性脱发诊疗指南》); 发际线/少白头为估算口径
              </div>
            </Card>

            <Card title="身体健康" emoji="💪" color="#cdeafa" badge="📊 卫健委数据" tilt="tilt-1" delay={400}>
              <div className="flex flex-wrap gap-2">
                <Chip active={sel.health.includes('无慢性病')} onClick={() => up({ health: toggle(sel.health, '无慢性病') })} color="#cdeafa">
                  🩺 无慢性病
                </Chip>
                <Chip active={sel.health.includes('不近视')} onClick={() => up({ health: toggle(sel.health, '不近视') })} color="#cdeafa">
                  👓 不近视
                </Chip>
                <Chip active={sel.health.includes('每周锻炼')} onClick={() => up({ health: toggle(sel.health, '每周锻炼') })} color="#cdeafa">
                  🏃 每周锻炼
                </Chip>
                <Chip active={sel.health.includes('睡眠良好')} onClick={() => up({ health: toggle(sel.health, '睡眠良好') })} color="#cdeafa">
                  😴 睡眠良好
                </Chip>
                <Chip active={sel.health.includes('牙齿整齐')} onClick={() => up({ health: toggle(sel.health, '牙齿整齐') })} color="#cdeafa">
                  🦷 牙齿整齐
                </Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                每勾一条都是加码, 人要同时满足; 慢病按年龄分档: 30 岁档无慢病约 91% / 45 岁档约 70%(卫健委流调); 经常锻炼 37.2%(卫健委); 失眠率约 10-15%(流调综述);
                错颌畸形约 68%(口腔医学会); 「不近视」年龄+学历双联动: 26-34 岁档约 30%, 本科以上按大学生近视 87.7% 算, 很残酷
              </div>
            </Card>

            <Card title="亲密关系" emoji="🙈" color="#ffd9e2" badge="📑 正经医学文献" tilt="tilt-3" delay={420}>
              <div className="flex flex-wrap gap-2">
                {sel.gender === 'male' && (
                  <Chip active={sel.intimacy.includes('功能在线')} onClick={() => up({ intimacy: toggle(sel.intimacy, '功能在线') })} color="#ffd9e2">
                    💪 功能在线
                  </Chip>
                )}
                {sel.gender === 'male' && (
                  <Chip active={sel.intimacy.includes('持久战')} onClick={() => up({ intimacy: toggle(sel.intimacy, '持久战') })} color="#ffd9e2">
                    ⏱️ 持久战
                  </Chip>
                )}
                <Chip active={sel.intimacy.includes('精力在线')} onClick={() => up({ intimacy: toggle(sel.intimacy, '精力在线') })} color="#ffd9e2">
                  🔥 精力在线
                </Chip>
                <Chip active={sel.intimacy.includes('恋爱史简单')} onClick={() => up({ intimacy: toggle(sel.intimacy, '恋爱史简单') })} color="#ffd9e2">
                  💌 恋爱史简单
                </Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                {sel.gender === 'male'
                  ? '每勾一条都是加码; 羞羞的数据来自正经期刊: ED 患病率 <30 岁 20.9% / 30-39 岁 25.3% / 40+ 岁 40.5%(PubMed); 早泄约 20-30%(流调); 「精力在线」= 每月 >1 次(约 85%); 「恋爱史简单」= ≤3 段(估算)'
                  : '每勾一条都是加码; 「精力在线」= 每月 >1 次(约 85%, 潘绥铭/艾瑞); 「恋爱史简单」= ≤3 段(估算), 别笑, 这是学术'}
              </div>
            </Card>

            <Card title="情感状态" emoji="💘" color="#e6dbf7" badge="🤔 侧面印证估算" tilt="tilt-1" delay={440}>
              <div className="flex flex-wrap gap-2">
                <Chip active={sel.emotion.includes('目前单身')} onClick={() => up({ emotion: toggle(sel.emotion, '目前单身') })} color="#e6dbf7">
                  🐶 目前单身
                </Chip>
                <Chip active={sel.emotion.includes('取向为异性')} onClick={() => up({ emotion: toggle(sel.emotion, '取向为异性') })} color="#e6dbf7">
                  💑 取向为异性
                </Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                每勾一条都是加码; 「目前单身」= 未婚且当前无对象(约占未婚者 65%, 估算); 取向按学术调查估算(约 95%), 爱不分形态, 这里只做统计
              </div>
            </Card>

            <Card title="隐藏加分项" emoji="🎁" color="#ffeeb0" badge="🤔 侧面印证估算" tilt="tilt-2" delay={460}>
              <div className="flex flex-wrap gap-2">
                <Chip active={sel.bonus.includes('体制内')} onClick={() => up({ bonus: toggle(sel.bonus, '体制内') })} color="#ffeeb0">
                  🏛️ 体制内工作
                </Chip>
                <Chip active={sel.bonus.includes('父母有退休金')} onClick={() => up({ bonus: toggle(sel.bonus, '父母有退休金') })} color="#ffeeb0">
                  👵 父母有退休金
                </Chip>
                <Chip active={sel.bonus.includes('独生子女')} onClick={() => up({ bonus: toggle(sel.bonus, '独生子女') })} color="#ffeeb0">
                  🧧 独生子女
                </Chip>
                <Chip active={sel.bonus.includes('会做饭')} onClick={() => up({ bonus: toggle(sel.bonus, '会做饭') })} color="#ffeeb0">
                  🍳 会做饭
                </Chip>
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                每勾一条都是加码; 体制内约 15% / 父母有职工养老金约 45% / 独生子女约 50% / 会做饭约 60% —— 都是估算, 图一乐, 别当真 🤫
              </div>
            </Card>

            <Card title="MBTI" emoji="🧩" color="#cdeafa" badge="🎲 比星座还玄" tilt="tilt-3" delay={480}>
              <div className="space-y-2">
                {MBTI_AXES.map((a) => (
                  <div key={a.label} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[#3b3050]/60 w-10">{a.label}</span>
                    {a.pair.map((l) => (
                      <Chip key={l} active={sel.mbti.includes(l)} onClick={() => pickMbti(l)} color="#cdeafa">
                        {l} 型
                      </Chip>
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                每轴二选一, 选一轴砍一半, 凑齐四轴就是 1/16; 玄学浓度超标, 谨慎服用
              </div>
            </Card>

            <Card title="星座" emoji="✨" color="#ffc09b" badge="🎲 纯娱乐" tilt="tilt-1" delay={500}>
              <div className="flex flex-wrap gap-1.5">
                {ZODIACS.map((z) => (
                  <Chip key={z} active={sel.zodiacs.includes(z)} onClick={() => up({ zodiacs: toggle(sel.zodiacs, z) })} color="#ffc09b">
                    {z}
                  </Chip>
                ))}
              </div>
              <div className="mt-2 text-[11px] text-[#3b3050]/60">
                随便勾; 选 N 个就是 N/12, 玄学没有加成, 主打一个心理安慰
              </div>
            </Card>
          </div>

          {/* 手机: 漏斗插在条件卡之后 */}
          <div className="lg:hidden">
            <Card title="淘汰赛直播现场" emoji="🥊" color="#ffffff" badge="LIVE" tilt="tilt-1">
              <div className="mb-2 text-xs text-[#3b3050]/60">
                {sel.cities.join('、') || '全国'} · {sel.ageMin}-{sel.ageMax} 岁 · {sel.gender === 'male' ? '男' : '女'} · {sel.marital.join('/') || '未婚'}
              </div>
              <PeopleFunnel pool={result.pool} steps={result.steps} />
            </Card>
          </div>

          {/* 第三步: 反向彩蛋完整版 */}
          <StickyTitle color="#fff3d9">第三步 · 彩蛋: 轮到你了 🪞</StickyTitle>
          <Card title="别光挑 TA, 照照镜子" emoji="🪞" color="#fff3d9" badge="🥚 反向完整版" tilt="tilt-2">
            <div className="text-xs text-[#3b3050]/60 mb-3">
              TA 的门槛也不低 —— 报上你的条件({myGender === 'male' ? '男生' : '女生'}视角), 看你是「人间小透明」还是「天选之子」, 顺便算算你俩互相看上的概率
            </div>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#3b3050]/70 w-16">我的年龄</span>
                <input type="range" min={18} max={50} value={me.age}
                  onChange={(e) => setMe((m) => ({ ...m, age: +e.target.value }))}
                  className="w-32" />
                <span className="rounded-full border-2 border-[#3b3050]/15 bg-white/85 px-3 py-1 text-sm font-bold">{me.age} 岁</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-[#3b3050]/70 w-16">我的身高</span>
                <Chip active={me.height != null} onClick={() => setMe((m) => ({ ...m, height: m.height == null ? (myGender === 'male' ? 172 : 160) : null }))} color="#fff3d9">
                  {me.height != null ? `${me.height} cm` : '保密'}
                </Chip>
                {me.height != null && (
                  <input type="range" min={myGender === 'male' ? 155 : 145} max={myGender === 'male' ? 195 : 185}
                    value={me.height}
                    onChange={(e) => setMe((m) => ({ ...m, height: +e.target.value }))}
                    className="w-32" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">我的身材</span>
                {[null, '偏瘦', '匀称', '微胖', '圆滚滚'].map((b) => (
                  <Chip key={String(b)} active={me.bmi === b} onClick={() => setMe((m) => ({ ...m, bmi: b }))} color="#fff3d9">
                    {b == null ? '保密' : b}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">我的年收入</span>
                {ME_INCOME_OPTS.map((v) => (
                  <Chip key={String(v)} active={me.income === v} onClick={() => setMe((m) => ({ ...m, income: v }))} color="#fff3d9">
                    {v == null ? '保密' : `${v}万`}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">家庭资产</span>
                {ME_WEALTH_OPTS.map((v) => (
                  <Chip key={String(v)} active={me.wealth === v} onClick={() => setMe((m) => ({ ...m, wealth: v }))} color="#fff3d9">
                    {v == null ? '保密' : `${v}万`}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">我的学历</span>
                {[null, '大专', '本科', '硕士', '博士'].map((e) => (
                  <Chip key={String(e)} active={me.edu === e} onClick={() => setMe((m) => ({ ...m, edu: e }))} color="#fff3d9">
                    {e == null ? '保密' : `${e}+`}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[#3b3050]/70 w-16">我的硬件</span>
                <Chip active={me.house} onClick={() => setMe((m) => ({ ...m, house: !m.house }))} color="#fff3d9">🏠 本地有房</Chip>
                <Chip active={me.car} onClick={() => setMe((m) => ({ ...m, car: !m.car }))} color="#fff3d9">🚗 有车</Chip>
                <Chip active={me.hairFull} onClick={() => setMe((m) => ({ ...m, hairFull: !m.hairFull }))} color="#fff3d9">🦁 发量在线</Chip>
                <Chip active={me.noSmoke} onClick={() => setMe((m) => ({ ...m, noSmoke: !m.noSmoke }))} color="#fff3d9">🚭 不抽烟</Chip>
                <Chip active={me.noDrink} onClick={() => setMe((m) => ({ ...m, noDrink: !m.noDrink }))} color="#fff3d9">🙅 不喝酒</Chip>
              </div>
            </div>
            {youP != null && youTier != null && mutual != null && (
              <div className="slide-open mt-4 rounded-2xl border-2 border-[#3b3050]/15 bg-white/85 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-[#3b3050]">你的稀有度:</span>
                  <span className="tier-shine inline-block rounded-full border-2 border-[#3b3050] px-3 py-0.5 font-display"
                    style={{ background: youTier.bg, color: youTier.fg }}>
                    {youTier.label}
                  </span>
                  <span className="font-display text-lg text-[#3b3050]">{fmtRarity(youP)}</span>
                </div>
                <div className="mt-2 text-sm text-[#3b3050]/80">
                  你们「互相心动」的概率 ≈ <b className="font-display text-lg text-[#a03d7a]">{fmtRarity(mutual)}</b>
                </div>
                <div className="mt-1 font-hand text-lg text-[#a55a35]">
                  {mutual < 1e-6
                    ? '比中双色球头奖还玄 —— 真遇到了请原地结婚 💍'
                    : mutual < 1e-4
                      ? '缘分相当稀缺, 遇到了就别作, 好好珍惜 🥺'
                      : '缘分尚存! 多出门刷刷存在感, 故事就有了 🚪'}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* 右: 结果面板(桌面) */}
        <aside className="mt-8 hidden lg:block lg:mt-0">
          <div className="lg:sticky lg:top-6 space-y-5">
            <div className="sticker rounded-[24px] bg-white p-6">
              <div className="font-hand text-xl text-[#a55a35]">淘汰赛直播现场 🥊</div>
              <div className="mt-1 text-sm text-[#3b3050]/70">
                {sel.cities.join('、') || '全国'} · {sel.ageMin}-{sel.ageMax} 岁 · {sel.gender === 'male' ? '男' : '女'} · {sel.marital.join('/') || '未婚'}
              </div>
              <div className="mt-4">
                <PeopleFunnel pool={result.pool} steps={result.steps} />
              </div>
            </div>

            <div className="sticker rounded-[24px] p-6" style={{ background: '#ffd9e2' }}>
              <div className="font-hand text-xl text-[#a55a35]">本局开奖 🎰</div>
              {noFilter ? (
                <div className="mt-2 text-[#3b3050]/70 text-sm">
                  全员存活中 —— 左边随便点几张卡, 看小人哗哗下班 🍂
                </div>
              ) : (
                <ResultBody result={result} tier={tier} rarity={rarity} animCount={animCount} mutual={mutual} sharing={sharing} onShare={onShare} scope={scope} />
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* 手机: 底部结果栏 */}
      <div className="fixed bottom-3 inset-x-3 z-40 lg:hidden">
        {sheetOpen && !noFilter && (
          <div className="sheet-open sticker mb-2 max-h-[62vh] overflow-y-auto rounded-[24px] p-5" style={{ background: '#ffd9e2' }}>
            <div className="mb-1 flex items-center justify-between">
              <span className="font-hand text-xl text-[#a55a35]">本局开奖 🎰</span>
              <button onClick={() => setSheetOpen(false)} className="min-h-[36px] rounded-full border-2 border-[#3b3050]/20 bg-white/80 px-3 text-sm active:scale-90">收起 ▼</button>
            </div>
            <ResultBody result={result} tier={tier} rarity={rarity} animCount={animCount} mutual={mutual} sharing={sharing} onShare={onShare} scope={scope} />
          </div>
        )}
        <button
          onClick={() => setSheetOpen((v) => !v)}
          className="sticker flex w-full items-center justify-between rounded-full bg-white px-4 py-2.5 active:scale-[0.98] transition-transform"
        >
          <span className="flex items-center gap-2">
            <span
              className="rounded-full border-2 border-[#3b3050] px-2.5 py-0.5 font-display text-sm"
              style={{ background: tier.bg, color: tier.fg }}
            >
              {noFilter ? '待开筛' : tier.key}
            </span>
            <span className="font-display text-[#3b3050]">{noFilter ? '点几张卡开筛呗' : rarity}</span>
          </span>
          <span className="text-sm text-[#3b3050]/70">
            {noFilter ? '👆' : <><b>{fmtCount(result.count)}</b> {sheetOpen ? '▼' : '▲'}</>}
          </span>
        </button>
      </div>

      {/* 数据来源 */}
      <footer className="relative mx-auto max-w-5xl px-4 pb-28 lg:pb-16">
        <div className="rounded-[24px] border-[3px] border-dashed border-[#3b3050]/30 bg-white/60 p-6">
          <h2 className="font-display text-xl text-[#3b3050]">📚 数据来源 & 滑跪交代区</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SOURCES.map((s) => (
              <div key={s.name} className="flex items-start gap-2 text-sm">
                <span>{s.level === 3 ? '📊' : s.level === 2 ? '📑' : '🤔'}</span>
                <div>
                  <div className="font-bold text-[#3b3050]">{s.name} <span className="font-normal text-[#3b3050]/50">({s.year})</span></div>
                  <div className="text-[#3b3050]/60">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5 border-t-2 border-dashed border-[#3b3050]/20 pt-4 text-xs text-[#3b3050]/60">
            <p>📊 = 官方直接数据 / 📑 = 官方锚点 + 统计模型推算 / 🤔 = 多源侧面印证估算(主打一个尽力了)。</p>
            <p>计算方法: 收入和资产是联合分布算的(这俩本来就有关系, 不重复刀人); 「不近视」跟学历联动(本科以上按大学生近视率算); 健康/亲密同簇维度弱相关, 猫腻都在 ±2.5 倍误差区间里了。</p>
            <p>身高/BMI/财富的完整分布官方没公布, 我们用官方均值和分位锚点做了正态/幂律拟合; 千万级收入与亿级资产按幂律尾外推。本工具仅供娱乐, 不构成任何婚恋建议, 真爱不看概率 💗</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
