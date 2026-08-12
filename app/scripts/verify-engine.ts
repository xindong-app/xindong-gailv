// 引擎数值验证脚本: npx tsx scripts/verify-engine.ts
import { compute, computeYou, type Selection } from '../src/engine/calc'
import { EDU } from '../src/data/model'

const base: Selection = {
  gender: 'male', ageMin: 26, ageMax: 34, cities: ['全国'], marital: ['未婚'],
  heightMin: null, bmi: [], incomeMin: null, wealthMin: null,
  needHouse: false, houseLoc: null, houseArea: null, houseType: null,
  needCar: false, edu: [], school: null, noSmoke: false, drink: 'any',
  tattooFree: false, hair: [], zodiacs: [], carBands: [], health: [],
  intimacy: [], bonus: [], emotion: [], mbti: [],
}

let pass = 0, fail = 0
function ok(cond: boolean, name: string, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`) }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`) }
}
const approx = (a: number, b: number, tol = 0.3) => Math.abs(a - b) / b <= tol

// ---------- 1. 不变量: 全网格扫描 ----------
console.log('\n【1】不变量扫描(概率∈[0,1], 无 NaN/负数)')
const heights = [null, 160, 175, 180, 190]
const incomes = [null, 5, 12, 30, 50, 100, 500, 1000]
const wealths = [null, 100, 600, 1000, 5000, 100000]
const citySets = [['全国'], ['北京'], ['北京', '上海'], ['鹤岗']]
let worst = ''
for (const h of heights) for (const i of incomes) for (const w of wealths) for (const c of citySets) {
  for (const g of ['male', 'female'] as const) {
    const sel = { ...base, gender: g, heightMin: h, incomeMin: i, wealthMin: w, cities: c }
    const r = compute(sel)
    const bad =
      !Number.isFinite(r.finalP) || !Number.isFinite(r.count) ||
      r.finalP < 0 || r.finalP > 1 || r.count < 0 ||
      r.steps.some((s) => !(s.factor > 0 && s.factor <= 1) || !Number.isFinite(s.survivors))
    if (bad) worst = JSON.stringify({ h, i, w, c, g, finalP: r.finalP, count: r.count })
  }
}
ok(worst === '', '1440 组组合全部落在合法区间', worst || 'finalP∈[0,1], factor∈(0,1]')

// ---------- 2. 单调性: 加条件只能变少 ----------
console.log('\n【2】单调性(每加一刀, 人数只减不增)')
const r0 = compute(base)
const chain: Array<[string, Selection]> = [
  ['+身高180', { ...base, heightMin: 180 }],
  ['+年入50万', { ...base, heightMin: 180, incomeMin: 50 }],
  ['+本科', { ...base, heightMin: 180, incomeMin: 50, edu: ['本科', '硕士', '博士'] }],
  ['+有房', { ...base, heightMin: 180, incomeMin: 50, edu: ['本科', '硕士', '博士'], needHouse: true }],
]
let mono = true, prev = r0.count, monoDetail = `裸池 ${Math.round(r0.count / 10000)} 万人`
for (const [name, sel] of chain) {
  const c = compute(sel).count
  monoDetail += ` → ${name} ${Math.round(c / 10000)} 万人`
  if (c > prev) mono = false
  prev = c
}
ok(mono, '逐级加条件人数递减', monoDetail)

// ---------- 3. 外部锚点比对 ----------
console.log('\n【3】外部数据锚点(模型值 vs 官方/文献值)')
// 年入百万 ≈ 0.25% (个税申报数据校准)
const incTail = (x: number) => compute({ ...base, incomeMin: x }).steps.find((s) => s.key === 'econ')!.factor
ok(approx(incTail(100), 0.0025, 0.2), '年入100万+ ≈ 0.25%', `模型 ${(incTail(100) * 100).toFixed(3)}%`)
ok(approx(incTail(12), 0.15, 0.2), '年入12万+ ≈ 15%(北师大月入过万口径)', `模型 ${(incTail(12) * 100).toFixed(2)}%`)
ok(approx(incTail(50), 0.008, 0.25), '年入50万+ ≈ 0.8%', `模型 ${(incTail(50) * 100).toFixed(3)}%`)
// 家庭资产600万+ ≈ 1.03% (胡润) — 锚点定义在「年龄系数=1」的 35 岁档
const wTail = (x: number, a = 35) => compute({ ...base, ageMin: a, ageMax: a, wealthMin: x }).steps.find((s) => s.key === 'econ')!.factor
ok(approx(wTail(600), 0.0103, 0.25), '家庭资产600万+ ≈ 1%(胡润, 35岁基准档)', `模型 ${(wTail(600) * 100).toFixed(3)}%`)
// 26-34 岁(系数0.7)应显著低于 1%: 年轻人家庭资产低, 这是设计而非 bug
const wYoung = compute({ ...base, wealthMin: 600 }).steps.find((s) => s.key === 'econ')!.factor
ok(wYoung < 0.0103 && wYoung > 0.002, '26-34 岁资产门槛自动加严(年龄系数)', `${(wYoung * 100).toFixed(2)}% < 1.03%`)
// 分段连续性: 幂律衔接处左右极限必须相等
const cont = (f: (x: number) => number, b: number) => Math.abs(f(b - 0.001) - f(b + 0.001)) / f(b) < 0.01
ok(cont(incTail, 12) && cont(incTail, 50) && cont(incTail, 100) && cont(incTail, 200), '收入分布分段点全部连续', '12/50/100/200 万')
ok(cont(wTail, 600) && cont(wTail, 1000), '资产分布分段点全部连续', '600/1000 万')
// 男性180cm+: 卫健委均值169.7, 模型应给 5%-12%
const hTail = compute({ ...base, heightMin: 180 }).steps.find((s) => s.key === 'height')!.factor
ok(hTail > 0.04 && hTail < 0.12, '男性180cm+ 在 4%~12% 合理带', `模型 ${(hTail * 100).toFixed(1)}%`)
// 基础池: 26-34 岁(1992-2000 出生, 年均出生约 2000 万) → 总盘子约 1.8 亿,
// × 男性约 51.5% × 未婚率约 45% ≈ 4100 万, 合理带宽 3000万-6000万
ok(r0.pool > 3000e4 && r0.pool < 6000e4, '基础池量级合理(对账出生人口)', `${Math.round(r0.pool / 10000)} 万人`)
// 年龄口径校验: 「全年龄 15%」不能直接套到某年龄段
const chron = (a: number) => compute({ ...base, ageMin: a, ageMax: a, health: ['无慢性病'] }).steps.find((s) => s.key === 'health')!.factor
ok(chron(30) > 0.85 && chron(30) < 0.95, '无慢病 30 岁档 ≈ 91%(不是全年龄 66%)', `${(chron(30) * 100).toFixed(1)}%`)
ok(chron(50) > 0.5 && chron(50) < 0.7, '无慢病 50 岁档 ≈ 61%', `${(chron(50) * 100).toFixed(1)}%`)

// ---------- 4. copula 联合分布 ----------
console.log('\n【4】联合分布与聚堆效应')
const both = compute({ ...base, incomeMin: 50, wealthMin: 600 })
const econStep = both.steps.find((s) => s.key === 'econ')!
const pi = incTail(50), pw = wTail(600)
ok(econStep.factor <= Math.min(pi, pw) + 1e-9, '联合 ≤ 单边', `joint=${(econStep.factor * 100).toFixed(3)}% ≤ min(${(pi * 100).toFixed(2)}%, ${(pw * 100).toFixed(2)}%)`)
ok(econStep.factor >= pi * pw * 0.99, '联合 ≥ 独立乘积(正相关)', `joint=${(econStep.factor * 100).toFixed(3)}% ≥ 独立 ${(pi * pw * 100).toFixed(4)}%`)
// 学历×收入联动: 选了本科+后, 收入步保留率应显著上升(高学历人群收入分布上移)
const incNoEdu = compute({ ...base, incomeMin: 50 }).steps.find((s) => s.key === 'econ')!.factor
const incWithEdu = compute({ ...base, incomeMin: 50, edu: ['本科', '硕士', '博士'] }).steps.find((s) => s.key === 'econ')!.factor
ok(incWithEdu > incNoEdu * 1.5, '学历×收入正相关(本科+的收入步保留率更高)', `无学历条件 ${(incNoEdu * 100).toFixed(2)}% → 本科+条件 ${(incWithEdu * 100).toFixed(2)}%`)
// 房产×资产联动: 选了资产条件后, 有房率上升
const housePlain = compute({ ...base, needHouse: true }).steps.find((s) => s.key === 'house')!.factor
const houseRich = compute({ ...base, needHouse: true, wealthMin: 600 }).steps.find((s) => s.key === 'house')!.factor
ok(houseRich > housePlain && houseRich <= 0.97, '资产×房产正相关(600万+有房率上升)', `${(housePlain * 100).toFixed(0)}% → ${(houseRich * 100).toFixed(0)}%`)
// 但联合总人数仍 ≤ 任一边际(不能越联动人越多到离谱)
const jointAll = compute({ ...base, incomeMin: 50, wealthMin: 600, edu: ['本科', '硕士', '博士'], needHouse: true })
ok(jointAll.count <= compute({ ...base, incomeMin: 50 }).count, '加条件总人数仍只减不增', '')

// ---------- 5. 多选并集 ----------
console.log('\n【5】多选并集逻辑')
const eduAll = compute({ ...base, edu: ['大专', '本科', '硕士', '博士'] }).steps.find((s) => s.key === 'edu')!.factor
ok(approx(eduAll, EDU.juniorPlus, 0.001), '学历全选 = 大专及以上', `${(eduAll * 100).toFixed(1)}% = ${(EDU.juniorPlus * 100).toFixed(1)}%`)
const zAll = compute({ ...base, zodiacs: Array.from({ length: 12 }, (_, i) => String(i)) }).steps.find((s) => s.key === 'zodiac')!.factor
ok(zAll === 1, '星座选满 12 个 = 不筛', `factor=${zAll}`)
const bmiAll = compute({ ...base, bmi: ['骨感', '纤细', '匀称', '标准', '微胖', '丰腴', '圆滚滚'] }).steps.find((s) => s.key === 'bmi')!.factor
ok(bmiAll > 0.995, '身材七档全选 ≈ 不筛', `factor=${bmiAll.toFixed(4)}`)
// 嵌套: 985 ⊆ 本科以上
const elite = compute({ ...base, edu: ['本科'], school: '985' }).steps.find((s) => s.key === 'edu')!.factor
ok(approx(elite, Math.min(EDU.s985, EDU.bachelorPlus - EDU.masterPlus), 0.001), '本科×985 = 交集', `${(elite * 100).toFixed(2)}%`)

// ---------- 6. 极端压力 ----------
console.log('\n【6】极端条件压力测试')
const extreme = compute({
  ...base, heightMin: 190, incomeMin: 1000, wealthMin: 100000,
  needHouse: true, houseType: '四合院', needCar: true, carBands: ['100万以上'],
  edu: ['博士'], school: '清北', noSmoke: true, drink: 'none', tattooFree: true,
  hair: ['发量王者', '发际线在线', '无少白头'], health: ['无慢性病', '不近视', '每周锻炼', '睡眠良好', '牙齿整齐'],
  intimacy: ['功能在线', '持久战', '精力在线', '恋爱史简单'], bonus: ['体制内', '父母有退休金', '独生子女', '会做饭'],
  emotion: ['目前单身', '取向为异性'], mbti: ['E', 'S', 'T', 'J'], zodiacs: ['狮子座'],
  bmi: ['匀称', '训练痕迹'],
})
ok(Number.isFinite(extreme.count) && extreme.count >= 0 && extreme.finalP > 0, '全维度拉满: 有限非负不为 0', `count=${extreme.count.toExponential(2)}, finalP=${extreme.finalP.toExponential(2)}`)
ok(extreme.finalP < 1e-8, '全维度拉满: 足够稀有(<亿分之一)', `finalP=${extreme.finalP.toExponential(2)}`)
const single = compute({ ...base, ageMin: 18, ageMax: 18 })
ok(Number.isFinite(single.pool) && single.pool > 0, '年龄 18-18 单岁正常', `pool=${Math.round(single.pool / 10000)} 万`)
const mix = compute({ ...base, cities: ['全国', '北京'] })
const nat = compute({ ...base, cities: ['全国'] })
ok(Math.abs(mix.count - nat.count) / nat.count < 1e-9, '全国+城市混选退化为全国', '')

// ---------- 7. 反向自评 ----------
console.log('\n【7】反向自评 computeYou')
const you1 = computeYou({ age: 28, height: 175, income: 30, edu: '本科', house: true, car: true, bmi: '匀称', wealth: 300, hairFull: true, noSmoke: true, noDrink: false }, base)
ok(you1 > 0 && you1 <= 1, '自评概率在 (0,1]', `p=${(you1 * 100).toFixed(2)}%`)
const you2 = computeYou({ age: 28, height: 185, income: 100, edu: '硕士', house: true, car: true, bmi: '匀称', wealth: 1000, hairFull: true, noSmoke: true, noDrink: true }, base)
ok(you2 < you1, '条件越好, 概率越低(更稀有)', `175cm/30万=${(you1 * 100).toFixed(2)}% vs 185cm/100万=${(you2 * 100).toFixed(3)}%`)

console.log(`\n========== 结果: ${pass} 通过, ${fail} 失败 ==========`)
process.exit(fail ? 1 : 0)
