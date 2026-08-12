// 计算引擎 —— 方案 B 增强版: 簇内联合分布 + 簇间独立
// 联合处理: 收入×资产(高斯 copula ρ=0.45) / 学历→收入(教育回报率溢价) / 资产→房产(持有率联动)
import {
  AGE_POP_PER_YEAR, maleShare, unmarriedRate, divorcedRate, heightDist,
  bmiDist, INCOME_SIGMA, INCOME_MEDIAN_WAN, NATIONAL_INCOME_ANCHOR,
  incomeAgeFactor, NATIONAL_PRIVATE_WAGE,
  WEALTH_MEDIAN_WAN, WEALTH_SIGMA, wealthAgeFactor, EDU, eduAgeFactor,
  EDU_INCOME_PREMIUM, SCHOOL_INCOME_PREMIUM,
  HOUSE_LOCAL_RATE, houseWealthBoost, houseIncomeBoost, CAR_RATE,
  nonSmokerRate, drinkingRate, fullHairRate,
  ECON_RHO,
  NO_MYOPIA_BACHELOR, EXERCISE_RATE, noChronicRate, noMyopiaRate,
  intimacyHealthRate, INTIMACY_ACTIVE_RATE,
  IN_SYSTEM_RATE, PARENTS_PENSION_RATE, ONLY_CHILD_RATE, COOK_RATE,
  SINGLE_NOW_FACTOR, STRAIGHT_RATE, sleepOkRate, TEETH_OK_RATE,
  STAMINA_RATE, simpleLoveRate, noTattooRate, hairlineRate, NO_GRAY_RATE, FIT_RATE,
} from '../data/model'
import { CITIES, NATIONAL_WAGE, type City } from '../data/cities'

// ---------- 数学工具 ----------
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}
export function normInv(p: number): number {
  // Acklam 近似
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0]
  const pl = 0.02425
  if (p <= 0) return -8
  if (p >= 1) return 8
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - pl) return -normInv(1 - p)
  const q = p - 0.5
  const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

// 高斯 copula 联合尾部: P(Z1>z1, Z2>z2), 数值积分
function copulaJointTail(z1: number, z2: number, rho: number): number {
  const n = 120
  const from = z1
  const to = z1 + 8
  const h = (to - from) / n
  let sum = 0
  for (let i = 0; i <= n; i++) {
    const z = from + i * h
    const phi = Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI)
    const cond = 1 - normCdf((z2 - rho * z) / Math.sqrt(1 - rho * rho))
    const w = i === 0 || i === n ? 0.5 : 1
    sum += w * phi * cond
  }
  return sum * h
}

// ---------- 输入类型 ----------
export interface Selection {
  gender: 'male' | 'female'
  ageMin: number
  ageMax: number
  cities: string[] // 城市名, 含 '全国'
  marital: string[] // '未婚' | '离异无孩' | '离异有孩'
  heightMin: number | null
  bmi: string[] // '骨感' | '纤细' | '匀称' | '标准' | '微胖' | '丰腴' | '圆滚滚' | '训练痕迹'
  incomeMin: number | null // 万/年
  wealthMin: number | null // 万
  needHouse: boolean
  houseLoc: string | null // '核心区' | '市区' | '郊区'
  houseArea: number | null // 最小面积 m²
  houseType: string | null // '大平层' | '别墅' | '四合院'
  needCar: boolean
  edu: string[] // '大专' | '本科' | '硕士' | '博士'
  school: string | null // '清北' | 'C9' | '985' | '211' (嵌套单选, 至少该层级)
  noSmoke: boolean
  drink: 'any' | 'notRegular' | 'none'
  tattooFree: boolean
  hair: string[] // '发量王者' | '发际线在线' | '无少白头'
  zodiacs: string[]
  carBands: string[] // '10万以下' | '10-20万' | '20-50万' | '50-100万' | '100万以上'
  health: string[] // '无慢性病' | '不近视' | '每周锻炼' | '睡眠良好' | '牙齿整齐'
  intimacy: string[] // '功能在线'(仅男) | '持久战'(仅男) | '精力在线' | '恋爱史简单'
  bonus: string[] // '体制内' | '父母有退休金' | '独生子女' | '会做饭'
  emotion: string[] // '目前单身' | '取向为异性'
  mbti: string[] // 'E' 'I' 'S' 'N' 'T' 'F' 'J' 'P' (每轴至多一个)
}

export interface FunnelStep {
  key: string
  label: string
  emoji: string
  factor: number // 该步保留比例
  survivors: number // 该步后存活人数(相对 pool=1)
  note: string
}

export interface Result {
  pool: number // 基础人群(人)
  steps: FunnelStep[]
  finalP: number
  count: number
  perWan: number // 每万人中数量
  low: number
  high: number
  verdict: string | null // 毒舌总评: 最狠的一刀
  comparisons: string[]
  tier: Tier
}

export interface Tier {
  key: string
  label: string
  comment: string
  bg: string
  fg: string
}

// 稀有度抽卡分级: 按每万人中的数量
export function rarityTier(perWan: number): Tier {
  if (perWan >= 500) return { key: 'N', label: 'N · 普通款', comment: '量大管饱, 下楼买杯奶茶都能撞见仨', bg: '#E5DCD5', fg: '#3b3050' }
  if (perWan >= 50) return { key: 'R', label: 'R · 稀有', comment: '池子还行, 主动一点就有戏', bg: '#cdeafa', fg: '#2b5d6e' }
  if (perWan >= 5) return { key: 'SR', label: 'SR · 超级稀有', comment: '朋友圈扩列三轮, 也许能刷到一个', bg: '#e6dbf7', fg: '#4a3a6e' }
  if (perWan >= 0.5) return { key: 'SSR', label: 'SSR · 极度稀有', comment: '遇见了别犹豫, 直接锁死 🔒', bg: '#ffd9e2', fg: '#a03d7a' }
  if (perWan >= 0.05) return { key: 'UR', label: 'UR · 传说', comment: '全服限量款, 刷到就是天大的缘分', bg: '#ffeeb0', fg: '#7a4a12' }
  return { key: 'M', label: '??? · 神话级', comment: '理论上存在, 遇见概率≈彩票头奖, 建议顺手买张彩票对冲', bg: '#ffd9b8', fg: '#7a2b12' }
}

// ---------- 基础人群 ----------
const TOTAL_POP_WAN = 141200

function agePopWan(ageMin: number, ageMax: number): number {
  let sum = 0
  for (const g of AGE_POP_PER_YEAR) {
    const from = Math.max(g.from, ageMin)
    const to = Math.min(g.to, ageMax)
    if (to >= from) sum += (to - from + 1) * g.perYear
  }
  return sum
}

export function computePool(sel: Selection): number {
  const nationalAgePop = agePopWan(sel.ageMin, sel.ageMax)
  const midAge = (sel.ageMin + sel.ageMax) / 2
  const gShare = sel.gender === 'male' ? maleShare(midAge) : 1 - maleShare(midAge)

  // 性别+年龄人口(万): 全国 或 所选城市按人口占比
  let baseWan: number
  if (sel.cities.includes('全国') || sel.cities.length === 0) {
    baseWan = nationalAgePop
  } else {
    const cityPopSum = sel.cities.reduce((s, name) => {
      const c = CITIES.find((x) => x.name === name)
      return s + (c ? c.pop : 0)
    }, 0)
    baseWan = nationalAgePop * (cityPopSum / TOTAL_POP_WAN)
  }
  baseWan *= gShare

  // 婚史(多选取并集): 未婚 / 离异无孩 / 离异有孩
  let maritalShare = 0
  // 用年龄窗内按人口加权的平均未婚/离异率
  let uw = 0, dw = 0, wsum = 0
  for (const g of AGE_POP_PER_YEAR) {
    const from = Math.max(g.from, sel.ageMin)
    const to = Math.min(g.to, sel.ageMax)
    if (to < from) continue
    const w = (to - from + 1) * g.perYear
    const mid = (from + to) / 2
    uw += w * unmarriedRate(mid, sel.gender)
    dw += w * divorcedRate(mid, sel.gender)
    wsum += w
  }
  const u = wsum ? uw / wsum : 0
  const d = wsum ? dw / wsum : 0
  if (sel.marital.includes('未婚')) maritalShare += u
  if (sel.marital.includes('离异无孩')) maritalShare += d * 0.45
  if (sel.marital.includes('离异有孩')) maritalShare += d * 0.55
  if (sel.marital.length === 0) maritalShare = u // 默认未婚

  return baseWan * maritalShare * 10000 // 返回人数
}

// ---------- 各维度概率 ----------
function heightP(sel: Selection): number | null {
  if (sel.heightMin == null) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  const { mean, sd } = heightDist(midAge, sel.gender)
  return 1 - normCdf((sel.heightMin - mean) / sd)
}

// BMI 七档 + 训练痕迹
const BMI_BANDS: Record<string, [number, number]> = {
  骨感: [0, 17], 纤细: [17, 18.5], 匀称: [18.5, 21.5], 标准: [21.5, 24],
  微胖: [24, 26], 丰腴: [26, 28], 圆滚滚: [28, 99],
}

function bmiP(sel: Selection): { p: number; note: string } | null {
  if (sel.bmi.length === 0) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  const { mean, sd } = bmiDist(midAge, sel.gender)
  const F = (x: number) => normCdf((x - mean) / sd)
  let p = 0
  const hasFit = sel.bmi.includes('训练痕迹')
  for (const b of sel.bmi) {
    if (b === '训练痕迹') continue
    const band = BMI_BANDS[b]
    if (band) p += F(band[1]) - F(band[0])
  }
  if (!hasFit && p === 0) return null
  if (p === 0) p = 1 // 只选了训练痕迹, 不限身材
  let note = sel.bmi.filter((b) => b !== '训练痕迹').join('、')
  if (hasFit) {
    p *= FIT_RATE
    note = note ? `${note} + 训练痕迹(估算)` : '有训练痕迹(估算)'
  }
  return { p: Math.max(p, 0.0001), note }
}

// 城市收入缩放系数: 多城市按人口加权(含年龄因子)
function incomeScale(cities: string[], age: number): number {
  const ageF = incomeAgeFactor(age)
  let wage: number
  if (cities.includes('全国') || cities.length === 0) {
    wage = NATIONAL_WAGE
  } else {
    let sw = 0, sp = 0
    for (const name of cities) {
      const c: City | undefined = CITIES.find((x) => x.name === name)
      if (!c) continue
      sw += c.wage * c.pop
      sp += c.pop
    }
    wage = sp ? sw / sp : NATIONAL_WAGE
  }
  const meanIncome = 0.6 * wage + 0.4 * NATIONAL_PRIVATE_WAGE
  return (meanIncome / NATIONAL_INCOME_ANCHOR) * ageF
}

// 学历 → 收入溢价系数(教育回报率): 选了学历条件时, 该人群收入分布整体上移
// 不选学历 = 1.0(全体平均), 行为与旧版完全一致
function eduIncomePremium(sel: Selection): number {
  if (sel.school != null) return SCHOOL_INCOME_PREMIUM[sel.school] ?? 1
  if (sel.edu.length === 0) return 1
  const bands: Record<string, [number, number]> = {
    大专: [EDU.juniorPlus - EDU.bachelorPlus, EDU_INCOME_PREMIUM.大专],
    本科: [EDU.bachelorPlus - EDU.masterPlus, EDU_INCOME_PREMIUM.本科],
    硕士: [EDU.masterPlus - EDU.phd, EDU_INCOME_PREMIUM.硕士],
    博士: [EDU.phd, EDU_INCOME_PREMIUM.博士],
  }
  let sw = 0, sp = 0
  for (const e of sel.edu) {
    const b = bands[e]
    if (b) { sw += b[0] * b[1]; sp += b[0] }
  }
  return sp > 0 ? sw / sp : 1
}

// 全国口径个人税前年收入尾部概率(万): 12 万以下对数正态 + 12 万以上分段幂律
// 锚点经个税申报数据交叉验证(见 model.ts)
// 幂律底数直接取对数正态在 12 万处的值, 保证分段点连续; 指数 -2.07 校准至 50 万 ≈ 0.8%
const INCOME_P12 = 1 - normCdf(Math.log(12 / INCOME_MEDIAN_WAN) / INCOME_SIGMA)
function incomeTailNational(xWan: number): number {
  if (xWan <= 0) return 1
  if (xWan <= 12) return 1 - normCdf(Math.log(xWan / INCOME_MEDIAN_WAN) / INCOME_SIGMA)
  if (xWan <= 50) return INCOME_P12 * Math.pow(xWan / 12, -2.07)
  if (xWan <= 100) return 0.008 * Math.pow(xWan / 50, -1.68)
  if (xWan <= 200) return 0.0025 * Math.pow(xWan / 100, -1.64)
  return 0.0008 * Math.pow(xWan / 200, -1.6)
}

function incomeP(sel: Selection): number | null {
  if (sel.incomeMin == null) return null
  const scale = incomeScale(sel.cities, (sel.ageMin + sel.ageMax) / 2) // 城市 × 年龄 缩放系数
  const premium = eduIncomePremium(sel) // 学历联动: 高学历人群收入分布上移
  return incomeTailNational(sel.incomeMin / (scale * premium))
}

// 家庭总资产尾部概率 (分段: 对数正态 + 幂律尾)
function wealthTailNational(xWan: number): number {
  if (xWan <= 0) return 1
  if (xWan <= 600) {
    return 1 - normCdf(Math.log(xWan / WEALTH_MEDIAN_WAN) / WEALTH_SIGMA)
  }
  if (xWan <= 1000) return 0.0103 * Math.pow(xWan / 600, -1.8)
  return 0.0041 * Math.pow(xWan / 1000, -1.2)
}

function wealthP(sel: Selection): number | null {
  if (sel.wealthMin == null) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  const ageF = wealthAgeFactor(midAge)
  // 城市财富系数: 有胡润数据用富裕家庭占比之比, 否则用工资比^1.4
  let cityF = 1
  if (!sel.cities.includes('全国') && sel.cities.length > 0) {
    let sw = 0, sp = 0
    for (const name of sel.cities) {
      const c = CITIES.find((x) => x.name === name)
      if (!c) continue
      let f: number
      if (c.rich600 != null) {
        const share = c.rich600 / (c.pop / 2.94) // 户均2.94人 → 家庭户数(万)
        f = share / 0.0103
      } else {
        f = Math.pow(c.wage / NATIONAL_WAGE, 1.4)
      }
      sw += f * c.pop
      sp += c.pop
    }
    cityF = sp ? sw / sp : 1
  }
  const adjusted = sel.wealthMin / (ageF * cityF)
  return wealthTailNational(adjusted)
}

// 经济簇联合: 收入 × 家庭资产, 高斯 copula ρ=0.45
function econP(sel: Selection): { p: number; incomeP: number | null; wealthP: number | null } {
  const pi = incomeP(sel)
  const pw = wealthP(sel)
  if (pi == null && pw == null) return { p: 1, incomeP: null, wealthP: null }
  if (pi == null) return { p: pw!, incomeP: null, wealthP: pw }
  if (pw == null) return { p: pi, incomeP: pi, wealthP: null }
  const z1 = normInv(1 - pi)
  const z2 = normInv(1 - pw)
  const joint = copulaJointTail(z1, z2, ECON_RHO)
  return { p: Math.min(joint, pi, pw), incomeP: pi, wealthP: pw }
}

function eduP(sel: Selection): number | null {
  if (sel.edu.length === 0 && sel.school == null) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  const af = eduAgeFactor(midAge) // cohort 效应: 40+ 年龄段学历占比显著更低
  const juniorPlus = Math.min(1, EDU.juniorPlus * af)
  const bachelorPlus = Math.min(1, EDU.bachelorPlus * af)
  const masterPlus = Math.min(1, EDU.masterPlus * af)
  const phd = Math.min(1, EDU.phd * af)
  let p = 0
  if (sel.edu.length === 0) p = 1
  else {
    if (sel.edu.includes('大专')) p += juniorPlus - bachelorPlus
    if (sel.edu.includes('本科')) p += bachelorPlus - masterPlus
    if (sel.edu.includes('硕士')) p += masterPlus - phd
    if (sel.edu.includes('博士')) p += phd
  }
  // 院校层级(嵌套单选: 清北 ⊂ C9 ⊂ 985 ⊂ 211): 只作用于本科及以上部分
  if (sel.school != null) {
    const SCHOOL_P: Record<string, number> = {
      清北: EDU.sTop2 * af, C9: EDU.sC9 * af, '985': EDU.s985 * af, '211': EDU.s211 * af,
    }
    const schoolShare = SCHOOL_P[sel.school] ?? 0
    const bachelorPlusInSel =
      sel.edu.length === 0
        ? bachelorPlus
        : (sel.edu.includes('本科') ? bachelorPlus - masterPlus : 0) +
          (sel.edu.includes('硕士') ? masterPlus - phd : 0) +
          (sel.edu.includes('博士') ? phd : 0)
    const elite = Math.min(schoolShare, bachelorPlusInSel)
    p = (p - bachelorPlusInSel) + elite // 非本科部分保留, 本科以上部分替换为名校交集
  }
  return Math.max(p, 0.00001)
}

// ---------- 汽车价位 ----------
// 条件于「有车」的价位分布(估算, 侧面印证: 乘联会 30 万以上车型销量占比约 12-15%)
const CAR_BAND_P: Record<string, number> = {
  '10万以下': 0.35, '10-20万': 0.35, '20-50万': 0.22, '50-100万': 0.06, '100万以上': 0.02,
}

function carP(sel: Selection): { p: number; note: string } | null {
  if (!sel.needCar) return null
  if (sel.carBands.length === 0) return { p: CAR_RATE, note: '城镇青年汽车拥有率(估算)' }
  const share = sel.carBands.reduce((s, b) => s + (CAR_BAND_P[b] ?? 0), 0)
  return { p: CAR_RATE * Math.max(share, 0.005), note: sel.carBands.join('、') }
}

// ---------- 房产细节 ----------
// 以下系数为多源侧面印证估算(★★): 基于七普住房面积结构、城镇住房存量研究、高端住宅市场报告
const HOUSE_LOC_P: Record<string, number> = { 核心区: 0.15, 市区: 0.5, 郊区: 0.9 }
const HOUSE_AREA_P: Record<number, number> = { 90: 0.55, 120: 0.28, 144: 0.12, 200: 0.045 }
const HOUSE_TYPE_P: Record<string, number> = { 大平层: 0.02, 别墅: 0.006, 四合院: 0.0002 }

function houseP(sel: Selection): { p: number; note: string } | null {
  const hasDetail = sel.houseLoc != null || sel.houseArea != null || sel.houseType != null
  if (!sel.needHouse && !hasDetail) return null
  // 资产/收入 → 有房率联动(央行: 高收入家庭住房拥有率接近 96%)
  let base = HOUSE_LOCAL_RATE
  let linkNote = ''
  if (sel.wealthMin != null) {
    base = Math.min(0.97, base * houseWealthBoost(sel.wealthMin))
    linkNote = '(有房率已联动家庭资产)'
  } else if (sel.incomeMin != null) {
    base = Math.min(0.97, base * houseIncomeBoost(sel.incomeMin))
    linkNote = '(有房率已联动收入)'
  }
  let p = base
  const notes: string[] = []
  if (sel.houseLoc) { p *= HOUSE_LOC_P[sel.houseLoc]; notes.push(sel.houseLoc) }
  if (sel.houseType) {
    // 类型(别墅/大平层)本身隐含大面积, 与面积条件取更严格者
    const typeP = HOUSE_TYPE_P[sel.houseType]
    const areaP = sel.houseArea ? HOUSE_AREA_P[sel.houseArea] : 1
    p *= Math.min(typeP, areaP)
    notes.push(sel.houseType)
  } else if (sel.houseArea) {
    p *= HOUSE_AREA_P[sel.houseArea]
    notes.push(`${sel.houseArea}m²+`)
  }
  const detail = notes.join(' · ') || '城镇青年本地住房拥有率(估算)'
  return { p: Math.max(p, 1e-7), note: detail + linkNote }
}

// ---------- 身体健康簇 ----------
// 三项同簇弱相关, 方案 B 下直接连乘, 残余相关性含在误差带内
function healthP(sel: Selection): { p: number; note: string } | null {
  if (sel.health.length === 0) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  let p = 1
  const notes: string[] = []
  if (sel.health.includes('无慢性病')) {
    const r = noChronicRate(midAge)
    p *= r
    notes.push(`无高血压/糖尿病(${Math.round(midAge)}岁档约 ${(r * 100).toFixed(0)}%)`)
  }
  if (sel.health.includes('不近视')) {
    // 与学历+年龄双联动: 选了本科及以上时用大学生近视率口径, 否则按年龄段
    const bachelorUp = sel.edu.some((e) => e !== '大专') || sel.school != null
    const r = bachelorUp ? NO_MYOPIA_BACHELOR : noMyopiaRate(midAge)
    p *= r
    notes.push(bachelorUp ? '不近视(高学历口径 12%)' : `不近视(${Math.round(midAge)}岁档约 ${(r * 100).toFixed(0)}%)`)
  }
  if (sel.health.includes('每周锻炼')) { p *= EXERCISE_RATE; notes.push('经常锻炼 37.2%') }
  if (sel.health.includes('睡眠良好')) {
    const r = sleepOkRate(midAge)
    p *= r
    notes.push(`睡眠良好(${Math.round(midAge)}岁档约 ${(r * 100).toFixed(0)}%)`)
  }
  if (sel.health.includes('牙齿整齐')) { p *= TEETH_OK_RATE; notes.push('错颌畸形约 68%') }
  return { p, note: notes.join(' · ') }
}

// ---------- 亲密关系簇(医学文献) ----------
function intimacyP(sel: Selection): { p: number; note: string } | null {
  if (sel.intimacy.length === 0) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  let p = 1
  const notes: string[] = []
  if (sel.intimacy.includes('功能在线') && sel.gender === 'male') {
    p *= intimacyHealthRate(midAge, 'male')
    notes.push('ED 患病率分年龄(PubMed 荟萃)')
  }
  if (sel.intimacy.includes('持久战') && sel.gender === 'male') {
    p *= STAMINA_RATE
    notes.push('早泄患病率约 20-30%')
  }
  if (sel.intimacy.includes('精力在线')) {
    p *= INTIMACY_ACTIVE_RATE
    notes.push('每月 >1 次约 85%(潘绥铭/艾瑞)')
  }
  if (sel.intimacy.includes('恋爱史简单')) {
    const r = simpleLoveRate(midAge)
    p *= r
    notes.push(`恋爱 ≤3 段(${Math.round(midAge)}岁档约 ${(r * 100).toFixed(0)}%, 估算)`)
  }
  if (notes.length === 0) return null
  return { p, note: notes.join(' · ') }
}

// ---------- 隐藏加分项(估算 🤔) ----------
const BONUS_P: Record<string, number> = {
  体制内: IN_SYSTEM_RATE, 父母有退休金: PARENTS_PENSION_RATE,
  独生子女: ONLY_CHILD_RATE, 会做饭: COOK_RATE,
}
function bonusP(sel: Selection): { p: number; note: string } | null {
  if (sel.bonus.length === 0) return null
  const p = sel.bonus.reduce((s, b) => s * (BONUS_P[b] ?? 1), 1)
  return { p, note: sel.bonus.join(' · ') + '(估算)' }
}

// ---------- 头发(多选) ----------
function hairP(sel: Selection): { p: number; note: string } | null {
  if (sel.hair.length === 0) return null
  const midAge = (sel.ageMin + sel.ageMax) / 2
  let p = 1
  const notes: string[] = []
  if (sel.hair.includes('发量王者')) { p *= fullHairRate(midAge, sel.gender); notes.push('雄脱诊疗指南') }
  if (sel.hair.includes('发际线在线')) { p *= hairlineRate(sel.gender); notes.push('发际线(估算)') }
  if (sel.hair.includes('无少白头')) { p *= NO_GRAY_RATE; notes.push('少白头(估算)') }
  return { p, note: notes.join(' · ') }
}

// ---------- 情感状态 ----------
function emotionP(sel: Selection): { p: number; note: string } | null {
  if (sel.emotion.length === 0) return null
  let p = 1
  const notes: string[] = []
  if (sel.emotion.includes('目前单身')) { p *= SINGLE_NOW_FACTOR; notes.push('未婚且无对象约 65%(估算)') }
  if (sel.emotion.includes('取向为异性')) { p *= STRAIGHT_RATE; notes.push('学术调查估算') }
  return { p, note: notes.join(' · ') }
}

// ---------- MBTI(纯娱乐: 每轴 1/2) ----------
const MBTI_AXES: string[][] = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']]
function mbtiP(sel: Selection): { p: number; note: string } | null {
  const axes = MBTI_AXES.filter((ax) => ax.some((l) => sel.mbti.includes(l)))
  if (axes.length === 0) return null
  const picked = MBTI_AXES.map((ax) => ax.find((l) => sel.mbti.includes(l))).filter(Boolean) as string[]
  return { p: Math.pow(0.5, axes.length), note: `${picked.join('')} 型 · 每轴 1/2` }
}

// ---------- 反向计算: 「你自己」在 TA 眼中的稀有度 ----------
// 语义: TA 在你的性别池子里挑, 遇到「至少和你一样好」的人的概率
export interface SelfProfile {
  age: number
  height: number | null // cm
  income: number | null // 万/年
  edu: string | null // '大专' | '本科' | '硕士' | '博士' (及以上口径)
  house: boolean
  car: boolean
  bmi: string | null // '偏瘦' | '匀称' | '微胖' | '圆滚滚'
  wealth: number | null // 家庭总资产(万)
  hairFull: boolean
  noSmoke: boolean
  noDrink: boolean
}

export function computeYou(p: SelfProfile, base: Selection): number {
  const myGender = base.gender === 'male' ? 'female' : 'male'
  let prob = 1
  if (p.height != null) {
    const { mean, sd } = heightDist(p.age, myGender)
    prob *= 1 - normCdf((p.height - mean) / sd)
  }
  if (p.income != null) {
    // 与正向一致: 城市×年龄缩放 + 学历溢价
    const premium = p.edu != null ? EDU_INCOME_PREMIUM[p.edu] ?? 1 : 1
    prob *= incomeTailNational(p.income / (incomeScale(base.cities, p.age) * premium))
  }
  if (p.edu != null) {
    const EDU_PLUS: Record<string, number> = {
      大专: EDU.juniorPlus, 本科: EDU.bachelorPlus, 硕士: EDU.masterPlus, 博士: EDU.phd,
    }
    prob *= Math.min(1, (EDU_PLUS[p.edu] ?? 1) * eduAgeFactor(p.age))
  }
  if (p.bmi != null) {
    const { mean, sd } = bmiDist(p.age, myGender)
    const F = (x: number) => normCdf((x - mean) / sd)
    const BANDS: Record<string, number> = {
      偏瘦: F(18.5), 匀称: F(24) - F(18.5), 微胖: F(28) - F(24), 圆滚滚: 1 - F(28),
    }
    prob *= BANDS[p.bmi] ?? 1
  }
  if (p.wealth != null) {
    prob *= wealthTailNational(p.wealth / wealthAgeFactor(p.age))
  }
  if (p.hairFull) prob *= fullHairRate(p.age, myGender)
  if (p.noSmoke) prob *= nonSmokerRate(myGender)
  if (p.noDrink) prob *= drinkingRate(myGender, 'none')
  if (p.house) prob *= HOUSE_LOCAL_RATE
  if (p.car) prob *= CAR_RATE
  return Math.min(Math.max(prob, 1e-9), 1)
}

// ---------- 主计算 ----------
export function compute(sel: Selection): Result {
  const pool = computePool(sel)
  const steps: FunnelStep[] = []
  let survivors = pool

  const push = (key: string, label: string, emoji: string, factor: number | null, note: string) => {
    if (factor == null) return
    survivors *= factor
    steps.push({ key, label, emoji, factor, survivors, note })
  }

  // 1. 身高
  push('height', '身高', '📏', heightP(sel),
    sel.heightMin ? `${sel.gender === 'male' ? '男' : '女'}性 ${sel.heightMin}cm+` : '')
  // 2. 身材
  const bmiRes = bmiP(sel)
  if (bmiRes) push('bmi', '身材', '🍑', bmiRes.p, bmiRes.note)
  // 3. 经济簇(收入 × 资产 联合, 收入已联动学历溢价)
  const econ = econP(sel)
  if (econ.incomeP != null || econ.wealthP != null) {
    const label =
      econ.incomeP != null && econ.wealthP != null
        ? '收入 × 资产'
        : econ.incomeP != null
          ? '年收入'
          : '家庭资产'
    const eduLinked = econ.incomeP != null && (sel.edu.length > 0 || sel.school != null)
    const note =
      econ.incomeP != null && econ.wealthP != null
        ? `年入${sel.incomeMin}万+ 且 资产${sel.wealthMin}万+(相关性已联合)`
        : econ.incomeP != null
          ? `年入${sel.incomeMin}万+`
          : `家庭资产${sel.wealthMin}万+`
    push('econ', label, '💰', econ.p, note + (eduLinked ? '(收入已联动学历)' : ''))
  }
  // 4. 房(含细节) / 车
  const hs = houseP(sel)
  if (hs) {
    const label = sel.houseType ?? (sel.houseLoc || sel.houseArea ? '房产要求' : '本地有房')
    push('house', label, '🏠', hs.p, hs.note)
  }
  if (sel.needCar) {
    const cp = carP(sel)
    if (cp) push('car', sel.carBands.length > 0 ? '车的价位' : '有车', '🚗', cp.p, cp.note)
  }
  // 5. 学历
  push('edu', '学历', '🎓', eduP(sel), [...sel.edu, ...(sel.school ? [sel.school] : [])].join('、'))
  // 6. 生活习惯
  if (sel.noSmoke) push('smoke', '不抽烟', '🚭', nonSmokerRate(sel.gender), '中国成人烟草调查')
  if (sel.drink !== 'any')
    push('drink', sel.drink === 'none' ? '不喝酒' : '不经常喝酒', '🍺',
      drinkingRate(sel.gender, sel.drink), '居民营养与健康监测')
  const hr = hairP(sel)
  if (hr) push('hair', '头发', '💇', hr.p, hr.note)
  if (sel.tattooFree) {
    const midAge = (sel.ageMin + sel.ageMax) / 2
    const r = noTattooRate(midAge)
    push('tattoo', '无纹身', '🐉', r, `纹身率分年龄(${Math.round(midAge)}岁档无纹身约 ${(r * 100).toFixed(0)}%)`)
  }
  // 6.5 身体健康 / 亲密关系 / 情感状态 / 加分项
  const hp = healthP(sel)
  if (hp) push('health', '身体健康', '🏋️', hp.p, hp.note)
  const ip = intimacyP(sel)
  if (ip) push('intimacy', '亲密关系', '🙈', ip.p, ip.note)
  const ep = emotionP(sel)
  if (ep) push('emotion', '情感状态', '💘', ep.p, ep.note)
  const bp = bonusP(sel)
  if (bp) push('bonus', '加分项', '🎁', bp.p, bp.note)
  // 7. MBTI / 星座
  const mp = mbtiP(sel)
  if (mp) push('mbti', 'MBTI', '🧩', mp.p, mp.note)
  // 7. 星座
  if (sel.zodiacs.length > 0)
    push('zodiac', '星座', '✨', sel.zodiacs.length / 12, sel.zodiacs.join('、'))

  const finalP = pool > 0 ? survivors / pool : 0
  const perWan = finalP * 10000
  const count = survivors

  // 误差带(±2.5 倍), 维度间残余相关性导致
  const low = count / 2.5
  const high = count * 2.5

  const comparisons = buildComparisons(finalP)
  const verdict = buildVerdict(steps)

  return {
    pool, steps, finalP, count, perWan, low, high,
    verdict,
    comparisons,
    tier: rarityTier(perWan),
  }
}

// ---------- 毒舌总评 ----------
const VERDICT_JOKES: Record<string, string> = {
  height: '这关不怪他们, 怪基因',
  bmi: '奶茶战队全军覆没',
  econ: '现实稳定发挥, 从不让人失望',
  house: '房价才是最佳守门员',
  car: '四个轮子碾过一片真心',
  edu: '知识确实改变命运…的择偶概率',
  smoke: '一根烟烧掉一大片缘分',
  drink: '感情深一口闷, 缘分浅全筛完',
  tattoo: '花臂与爱情不可兼得',
  hair: '比收入还能打, 秃然真实',
  health: '体检报告比简历诚实多了',
  intimacy: '这关我们不方便评论 🙈',
  emotion: '好家伙, 人家已经有主了',
  bonus: '投胎确实是门技术活',
  mbti: '人格不合, 概不负责',
  zodiac: '命里有时终须有, 命里无时莫强求',
}

function buildVerdict(steps: FunnelStep[]): string | null {
  if (steps.length === 0) return null
  const worst = steps.reduce((a, b) => (b.factor < a.factor ? b : a))
  const joke = VERDICT_JOKES[worst.key] ?? '这一关是真·守门员'
  const pct = ((1 - worst.factor) * 100).toFixed(worst.factor > 0.1 ? 0 : 1)
  return `致命一击是「${worst.label}」, 一刀淘汰 ${pct}% 的选手 —— ${joke}`
}

function buildComparisons(p: number): string[] {
  const out: string[] = []
  if (p <= 0) return out
  const oneIn = 1 / p
  // 考上清华: 同龄人口约 0.05% → 1/2000
  if (oneIn > 2000) out.push(`比考上清华还难 ${Math.round(oneIn / 2000)} 倍(清华: 这锅我不背)`)
  else out.push(`比考上清华容易点儿(清华录取约 1/2000)`)
  // 双色球一等奖 1/17721088
  if (oneIn > 17721088 / 100) {
    out.push(`中双色球头奖都比这容易 ${(oneIn / 17721088).toFixed(1)} 倍`)
  }
  return out
}

export function fmtCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)} 万人`
  if (n >= 1000) return `${Math.round(n).toLocaleString()} 人`
  if (n >= 1) return `${Math.round(n)} 人`
  return `不足 1 人`
}

export function fmtRarity(p: number): string {
  if (p <= 0) return '亿里挑一都悬'
  const oneIn = 1 / p
  if (oneIn < 10) return `十里挑一`
  if (oneIn < 100) return `${Math.round(oneIn)} 里挑一`
  if (oneIn < 10000) return `千分之 ${(p * 1000).toFixed(1)}`
  if (oneIn < 1e8) return `万分之 ${(p * 10000).toFixed(p * 10000 >= 10 ? 0 : 1)}`
  if (p * 1e8 >= 0.05) return `亿分之 ${(p * 1e8).toFixed(1)}`
  return `概率约等于 0, 神话都编不出来`
}
