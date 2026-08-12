// 人口结构与各维度分布模型
// 每个数据块都注明来源与年份; 无法直接获取官方分布的地方用统计模型拟合, 并标注「模型推算」

// ---------- 年龄结构 ----------
// 七普(2020)分年龄组人口推算为单岁人口(万, 含男女)
export const AGE_POP_PER_YEAR: Array<{ from: number; to: number; perYear: number }> = [
  { from: 18, to: 19, perYear: 1450 },
  { from: 20, to: 24, perYear: 1550 },
  { from: 25, to: 29, perYear: 1840 },
  { from: 30, to: 34, perYear: 2480 },
  { from: 35, to: 39, perYear: 2190 },
  { from: 40, to: 44, perYear: 1860 },
  { from: 45, to: 49, perYear: 2290 },
]

// 各年龄段男性占比 (七普, 20-40 岁男性比女性多 1752 万)
export function maleShare(age: number): number {
  if (age < 25) return 0.515
  if (age < 35) return 0.514
  if (age < 40) return 0.512
  return 0.51
}

// ---------- 未婚率 ----------
// 锚点: 《中国人口和就业统计年鉴》/ 七普 ——
// 2020 年 30-34 岁未婚率: 男 20.6%, 女 9.3%; 2023 年 30-34 岁: 男 26.8%, 女 12.1%
// 单岁锚点: 25 岁男 80.8% / 女 64.1%; 30 岁男 38.9% / 女 20.2%; 35 岁男 15.7%
const SINGLE_MALE: Array<[number, number]> = [
  [20, 0.97], [22, 0.93], [25, 0.808], [28, 0.55], [30, 0.389],
  [33, 0.25], [35, 0.157], [38, 0.1], [40, 0.075], [45, 0.05], [50, 0.04],
]
const SINGLE_FEMALE: Array<[number, number]> = [
  [20, 0.92], [22, 0.85], [25, 0.641], [28, 0.32], [30, 0.202],
  [33, 0.11], [35, 0.07], [38, 0.045], [40, 0.032], [45, 0.02], [50, 0.015],
]

function interp(points: Array<[number, number]>, age: number): number {
  if (age <= points[0][0]) return points[0][1]
  if (age >= points[points.length - 1][0]) return points[points.length - 1][1]
  for (let i = 0; i < points.length - 1; i++) {
    const [a0, v0] = points[i]
    const [a1, v1] = points[i + 1]
    if (age >= a0 && age <= a1) return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0)
  }
  return points[points.length - 1][1]
}

export function unmarriedRate(age: number, gender: 'male' | 'female'): number {
  return interp(gender === 'male' ? SINGLE_MALE : SINGLE_FEMALE, age)
}

// 离异率(模型推算, 七普 15 岁及以上离异占比约 2%, 随年龄上升)
export function divorcedRate(age: number, gender: 'male' | 'female'): number {
  const base = Math.min(0.005 + Math.max(0, age - 24) * 0.0022, 0.055)
  return gender === 'female' ? base * 1.15 : base
}

// ---------- 身高 ----------
// 卫健委《中国居民营养与慢性病状况报告(2020)》: 18-44 岁男 169.7cm / 女 158.0cm
// 标准差为模型推算(体质监测文献约 6cm); 30 岁以下群体 +1cm(世代增长)
export function heightDist(age: number, gender: 'male' | 'female') {
  // 第五次国民体质监测(2020): 20-24 岁为身高峰值组, 男 172.6 / 女 160.6,
  // 比 18-44 岁均值高 2.9 / 2.6cm; 标准差 6.2 / 5.4(2014 监测)
  let adj: number
  if (age <= 24) adj = gender === 'male' ? 2.9 : 2.6
  else if (age <= 30) adj = 1.8
  else if (age <= 35) adj = 0.8
  else adj = 0
  return gender === 'male'
    ? { mean: 169.7 + adj, sd: 6.2 }
    : { mean: 158.0 + adj, sd: 5.7 }
}

// ---------- BMI ----------
// 卫健委 2020: 成人超重率(BMI≥24)34.3%, 肥胖率(≥28)16.4%
// 分性别+年龄: 男性均值≈24.0 / 女性≈22.8; 青年(≤30 岁)偏瘦约 0.8, 中年后发福
export function bmiDist(age: number, gender: 'male' | 'female') {
  const baseMean = gender === 'male' ? 24.0 : 22.8
  const ageAdj = age <= 30 ? -0.8 : age <= 35 ? -0.4 : age <= 45 ? 0 : 0.3
  return { mean: baseMean + ageAdj, sd: gender === 'male' ? 4.16 : 4.0 }
}

// ---------- 收入 ----------
// 锚点(多源交叉验证):
// - 统计局: 2024 城镇非私营单位年平均工资 124110 元, 私营 69476 元(2025-05 发布)
// - 国家税务总局个税申报数据(2025 年发布会): 年入百万者约占「申报人数」1%(约 119 万人);
//   换算为占全部就业人口约 0.25%(下方幂律锚点口径); 北师大收入分配研究院: 月入过万约占就业人口 15.7%
// 模型: 12 万以下对数正态(全国中位数约 6 万, σ=0.68), 12 万以上分段幂律尾部
// 尾部锚点: P(≥12万)=15%, P(≥50万)=0.8%, P(≥100万)=0.25%, P(≥200万)=0.08%
export const INCOME_MEDIAN_WAN = 5.99 // 全国城镇就业者个人税前年收入中位数(万)
export const INCOME_SIGMA = 0.68
// 城市/年龄缩放通过锚点比实现
export const NATIONAL_INCOME_ANCHOR = 0.6 * 124110 + 0.4 * 69476
export function incomeAgeFactor(age: number): number {
  const pts: Array<[number, number]> = [
    [20, 0.45], [25, 0.75], [28, 0.92], [30, 1.0], [35, 1.15],
    [40, 1.22], [45, 1.2], [50, 1.1],
  ]
  return interp(pts, age)
}
// 城市工资锚点 = 0.6 × 城市非私营 + 0.4 × 全国私营(69476, 2024)
export const NATIONAL_PRIVATE_WAGE = 69476

// ---------- 家庭总资产 ----------
// 央行《2019 年中国城镇居民家庭资产负债情况调查》: 城镇家庭总资产中位数 163.0 万
// 胡润《2025 财富报告》: 600 万+ 家庭 506 万户(约 1.03%), 千万+ 200.5 万户(0.41%), 亿元+ 12.6 万户(0.026%)
// 模型: 600 万以下对数正态(中位数 163 万, σ=0.563), 以上分段幂律(帕累托)尾部
export const WEALTH_MEDIAN_WAN = 163
export const WEALTH_SIGMA = 0.563
export function wealthAgeFactor(age: number): number {
  // 央行调查: 家庭资产随户主年龄先升后降, 18-25 最低, 56-64 最高
  const pts: Array<[number, number]> = [
    [22, 0.35], [25, 0.45], [30, 0.7], [35, 1.0], [40, 1.3], [45, 1.5], [50, 1.6],
  ]
  return interp(pts, age)
}

// ---------- 学历 ----------
// 七普 + 教育部招生计划推算: 25-39 岁城镇 cohort
// 大专及以上 ~45%, 本科及以上 ~28%, 硕士及以上 ~6%, 博士 ~0.7%
// 985 约占同龄人口 2%, 211(含 985)约 5.5% (估算)
export const EDU = {
  juniorPlus: 0.38, // 大专及以上
  bachelorPlus: 0.22, // 本科及以上(同龄人口口径, 本科录取约占同龄人 16-19%, 城镇更高)
  masterPlus: 0.05,
  phd: 0.006,
  s985: 0.01, // 同龄人口口径: 985 录取约 0.8-1%
  s211: 0.028, // 含 985, 同龄人口口径约 2.4-3.3%
  sC9: 0.0015, // C9 录取约 3 万/年 ÷ 同龄约 1900 万
  sTop2: 0.0004, // 清北录取约 7000/年 ÷ 同龄人口(万里挑四)
}
// 学历 cohort 效应: 上面是 25-39 岁口径, 更老的世代学历占比显著更低
// (七普分年龄: 本科及以上 25-29 岁约 30% → 40-44 岁约 14% → 50+ 个位数), 以 30 岁 = 1.0 归一
export function eduAgeFactor(age: number): number {
  const pts: Array<[number, number]> = [
    [22, 1.12], [25, 1.1], [30, 1.0], [35, 0.85], [40, 0.6], [45, 0.45], [50, 0.35],
  ]
  return interp(pts, age)
}
// 教育回报率(CFPS/CHIP 口径): 该学历人群收入分布相对全体的上移倍数
// 用于 学历×收入 联合: P(收入≥x | 学历) = P(收入≥x/溢价)
export const EDU_INCOME_PREMIUM: Record<string, number> = {
  大专: 0.85, 本科: 1.5, 硕士: 1.9, 博士: 2.4,
}
export const SCHOOL_INCOME_PREMIUM: Record<string, number> = {
  '211': 1.7, '985': 2.0, C9: 2.2, 清北: 2.8,
}

// ---------- 住房 / 车 ----------
// 央行 2019: 城镇居民家庭住房拥有率 96.0%(含非本地房产)
// 「本地有房」对青年单身人群下调 —— 侧面印证估算 (★★)
export const HOUSE_LOCAL_RATE = 0.55
// 房产×资产/收入联动: 央行 2019「高收入家庭住房拥有率接近 96%」
// 选了资产/收入条件时, 有房基础率按门槛上移(封顶 0.97)
export function houseWealthBoost(wealthMinWan: number): number {
  const pts: Array<[number, number]> = [[100, 1.1], [300, 1.3], [600, 1.6], [1000, 1.72], [5000, 1.8]]
  return interp(pts, wealthMinWan)
}
export function houseIncomeBoost(incomeMinWan: number): number {
  const pts: Array<[number, number]> = [[10, 1.05], [20, 1.15], [50, 1.35], [100, 1.5], [500, 1.65]]
  return interp(pts, incomeMinWan)
}
// 七普家庭户住房状况含「拥有家庭汽车」项, 约四成家庭户有车 → 城镇青年 42% (★★)
export const CAR_RATE = 0.42

// ---------- 生活习惯 ----------
// 中国成人烟草调查(2018): 男性吸烟率 50.5%, 女性 2.1%; 2022 年男性降至 45.3%
export function nonSmokerRate(gender: 'male' | 'female'): number {
  return gender === 'male' ? 1 - 0.47 : 1 - 0.023
}
// 多源监测合成(2018): 男性过去 12 个月饮酒率 58.4%, 女性 18.7%
// CKB 队列: 每周规律饮酒 男 33.1%, 女 2.2%
export function drinkingRate(gender: 'male' | 'female', level: 'none' | 'notRegular'): number {
  if (level === 'none') return gender === 'male' ? 1 - 0.584 : 1 - 0.187
  return gender === 'male' ? 1 - 0.331 : 1 - 0.022
}

// ---------- 头发 ----------
// 《中国人雄激素性脱发诊疗指南(2019)》: 男性患病率 21.3%, 女性 6.0%; 年轻人群更低
export function fullHairRate(age: number, gender: 'male' | 'female'): number {
  if (gender === 'female') return 0.94
  const rate = age <= 28 ? 0.12 : age <= 35 ? 0.18 : 0.25
  return 1 - rate
}

// ---------- 身体健康 ----------
// 卫健委《中国居民营养与慢性病状况报告(2020)》: 18 岁+ 高血压 27.5%, 糖尿病 11.9%
// ⚠️ 这是全年龄口径, 不能直接用! 分年龄(2012-2015 高血压流调 + 糖尿病流调):
// 25-34 岁高血压约 6-7% / 糖尿病约 2%; 45 岁约 24% / 7%; 65+ 高血压过半
// → 「无两大慢性病」按年龄插值(已扣除共病重叠, 全年龄均值 ≈0.66 与总口径自洽)
export function noChronicRate(age: number): number {
  const pts: Array<[number, number]> = [
    [20, 0.95], [25, 0.94], [30, 0.91], [35, 0.87], [40, 0.82],
    [45, 0.70], [50, 0.61], [55, 0.52], [60, 0.43], [70, 0.35],
  ]
  return interp(pts, age)
}
// 近视同理存在世代差: 卫健委 2018 大学生 87.7% / 高中生 81%, 年轻世代近视率显著更高
// 26-34 岁(90 后)不近视约 0.30; 50 岁以上老一代约 0.55-0.6(当年没那么多屏幕)
export function noMyopiaRate(age: number): number {
  const pts: Array<[number, number]> = [
    [22, 0.28], [30, 0.32], [40, 0.45], [50, 0.55], [60, 0.62],
  ]
  return interp(pts, age)
}
// 央视 2018(引卫健委): 大学生近视率 87.7% → 本科及以上人群不近视约 0.12
export const NO_MYOPIA_BACHELOR = 0.12
// 卫健委 2020: 经常参加体育锻炼人数比例 37.2%
export const EXERCISE_RATE = 0.372

// ---------- 亲密关系(医学文献, 羞而不黄) ----------
// 中华男科学杂志 + PubMed 荟萃分析(PMC5302383): 中国男性 ED 患病率
// <30 岁约 20.9%, 30-39 岁约 25.3%, 40-49 岁约 40.5%
export function intimacyHealthRate(age: number, gender: 'male' | 'female'): number {
  if (gender === 'female') return 1 // 该维度仅适用男性
  if (age < 30) return 1 - 0.209
  if (age < 40) return 1 - 0.253
  return 1 - 0.405
}
// 潘绥铭《2000-2015 中国人的全性》/ 艾瑞咨询 2025:
// 18-35 岁亲密生活每月 ≤1 次者约 14.5% → 「精力在线」约 0.85
export const INTIMACY_ACTIVE_RATE = 0.85

// ---------- 隐藏加分项(多源侧面印证估算 🤔) ----------
// 机关事业单位+国企正式就业约占城镇就业 15%(估算)
export const IN_SYSTEM_RATE = 0.15
// 父母有职工养老金: 企业职工+机关养老覆盖推算约 45%(估算)
export const PARENTS_PENSION_RATE = 0.45
// 城镇青年独生子女比例(估算, 计生年代 cohort 侧面印证)
export const ONLY_CHILD_RATE = 0.5
// 会做饭(趣味估算)
export const COOK_RATE = 0.6

// ---------- 情感状态 ----------
// 「目前单身」= 未婚且当前无恋爱对象; 未婚人群中无对象比例约 65%(青年调查侧面印证, 估算 🤔)
export const SINGLE_NOW_FACTOR = 0.65
// 取向为异性: 学术调查估算非异性恋约 3-5%(🤔, 文案保持中性尊重)
export const STRAIGHT_RATE = 0.95

// ---------- 更多健康细节 ----------
// 睡眠: 国内流调成人失眠患病率约 10-15%, 且随年龄上升(老年人更高)
// → 「睡眠良好」按年龄: 25 岁档约 0.86, 55 岁档约 0.68
export function sleepOkRate(age: number): number {
  const pts: Array<[number, number]> = [[25, 0.86], [35, 0.82], [45, 0.76], [55, 0.68], [70, 0.58]]
  return interp(pts, age)
}
// 牙齿: 中华口腔医学会流调错颌畸形患病率约 67.8% → 牙列整齐约 0.32
export const TEETH_OK_RATE = 0.32
// 男性「持久战」: 国内外流调早泄患病率约 20-30% → 0.75 (📑)
export const STAMINA_RATE = 0.75
// 恋爱史简单(≤3 段): 估算, 随年龄递减(年纪越大恋爱经历越多)
export function simpleLoveRate(age: number): number {
  const pts: Array<[number, number]> = [[24, 0.72], [28, 0.64], [32, 0.56], [38, 0.45], [45, 0.38]]
  return interp(pts, age)
}
// 无纹身: 估算, 年轻世代纹身率显著更高(25 岁档无纹身约 0.80, 45 岁档约 0.94)
export function noTattooRate(age: number): number {
  const pts: Array<[number, number]> = [[22, 0.78], [28, 0.82], [35, 0.88], [45, 0.94], [60, 0.97]]
  return interp(pts, age)
}
// 发际线在线 / 无少白头(估算)
export function hairlineRate(gender: 'male' | 'female'): number {
  return gender === 'male' ? 0.85 : 0.96
}
export const NO_GRAY_RATE = 0.75
// 训练痕迹(肌肉线条/马甲线): 经常锻炼人群中的子集, 估算
export const FIT_RATE = 0.15

// ---------- 星座 ----------
export const ZODIACS = [
  '白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座',
]

// ---------- 经济簇相关性 ----------
// 方案 B: 收入与家庭资产不独立, 用高斯 copula (ρ=0.45) 联合
// 依据: 央行调查报告「高收入家庭拥有更多资产」, 最高 20% 家庭占总资产 63%
export const ECON_RHO = 0.45

// ---------- 数据来源清单(展示用) ----------
export const SOURCES = [
  { name: '国家统计局 · 2024 年国民经济和社会发展统计公报', desc: '五等分收入分组、人均可支配收入', year: '2025-02 发布', level: 3 },
  { name: '国家统计局 · 城镇单位就业人员年平均工资', desc: '全国非私营/私营单位工资(分省为 2023 口径)', year: '2024 年度', level: 3 },
  { name: '中国人民银行 · 城镇居民家庭资产负债情况调查', desc: '家庭总资产/净资产中位数、住房拥有率', year: '2019 调查', level: 3 },
  { name: '胡润研究院 · 胡润财富报告', desc: '600 万/千万/亿元资产家庭数量及城市分布', year: '2025 版', level: 2 },
  { name: '国家卫健委 · 中国居民营养与慢性病状况报告', desc: '分性别平均身高、超重肥胖率', year: '2020 版', level: 3 },
  { name: '第七次全国人口普查 / 中国人口和就业统计年鉴', desc: '年龄结构、分年龄分性别未婚率、教育结构、户均住房面积 111.18m²', year: '2020-2024', level: 3 },
  { name: '国家税务总局 · 个税申报数据 / 北师大收入分配研究院', desc: '年入百万约占申报人数 1%; 月入过万约占就业人口 15.7%', year: '2021-2025', level: 2 },
  { name: '中国成人烟草调查', desc: '分性别吸烟率(男 50.5% / 女 2.1%)', year: '2018', level: 3 },
  { name: '中国居民营养与健康监测 / CKB 队列', desc: '分性别饮酒率、规律饮酒率', year: '2004-2018', level: 2 },
  { name: '中国人雄激素性脱发诊疗指南', desc: '脱发患病率(男 21.3% / 女 6.0%)', year: '2019', level: 2 },
  { name: '教育部 · 高校招生计划', desc: '985/211 占同龄人口比例(估算)', year: '近年', level: 1 },
  { name: '国家卫健委 · 慢性病报告 / 央视新闻', desc: '高血压 27.5%、糖尿病 11.9%、经常锻炼 37.2%; 成人近视率 >50%、大学生近视 87.7%', year: '2018-2020', level: 3 },
  { name: 'PubMed 荟萃分析(PMC5302383)/ 中华男科学杂志', desc: '中国男性 ED 患病率分年龄: <30 岁 20.9% / 30-39 岁 25.3% / 40+ 岁 40.5%', year: '2017-2023', level: 2 },
  { name: '潘绥铭 ·《2000-2015 中国人的全性》/ 艾瑞咨询', desc: '18-35 岁亲密生活频率分布(每月 ≤1 次者约 14.5%)', year: '2000-2025', level: 1 },
  { name: '体制内就业 / 职工养老覆盖(综合推算)', desc: '体制内约占城镇就业 15%; 父母有职工养老金约 45%(均为估算)', year: '近年', level: 1 },
  { name: '中国睡眠研究会 / 国内失眠流行病学综述', desc: '成人失眠患病率约 10-15%(症状口径 9.4%-38.2%)', year: '2013-2024', level: 2 },
  { name: '中华口腔医学会 · 错颌畸形流调', desc: '错颌畸形患病率约 67.8% → 牙列整齐约三成', year: '流调', level: 2 },
  { name: '男科流行病学文献(早泄/ED)', desc: '早泄患病率约 20-30%; ED 见上条荟萃分析', year: '2006-2023', level: 1 },
  { name: '单身状态 / 性取向 / 纹身 / 独生子女(综合估算)', desc: '未婚中当前无对象约 65%; 非异性恋约 3-5%; 其余为趣味估算', year: '近年', level: 1 },
]
