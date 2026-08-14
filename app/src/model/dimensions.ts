import {
  BODY_TYPES,
  CAR_PRICE_BANDS,
  EDUCATION_LEVELS,
  GENDERS,
  HAIR_CRITERIA,
  HEALTH_CRITERIA,
  HOUSE_LOCATIONS,
  HOUSE_TYPES,
  MARITAL_STATUSES,
  MBTI_POLES,
  SCHOOL_TIERS,
  ZODIACS,
  type SoftPreferenceId,
} from './schema'

export type DimensionClass = 'hard_filter' | 'correlated_hard' | 'soft_preference' | 'entertainment'
export type DimensionCategory =
  | 'demographics' | 'region' | 'appearance' | 'education' | 'career' | 'finance'
  | 'housing' | 'lifestyle' | 'family' | 'relationship' | 'communication'
  | 'values' | 'future' | 'health' | 'interests' | 'entertainment'
export type DimensionInputType = 'single' | 'multi' | 'toggle' | 'range' | 'number' | 'city_multi' | 'compound'
export type EvidenceGrade = 'A' | 'B' | 'C' | 'D' | 'NA'
export type PopulationUse = 'included' | 'scenario' | 'unquantified'

export interface DimensionOption {
  value: string
  label: string
  description?: string
}

export interface DimensionRegistryEntry {
  id: string
  label: string
  category: DimensionCategory
  classification: DimensionClass
  inputType: DimensionInputType
  options: readonly DimensionOption[]
  applicableTo: {
    genders: readonly ('male' | 'female')[]
    age: { min: number; max: number }
    notes?: string
  }
  evidenceId: string | null
  evidenceGrade: EvidenceGrade
  sensitive: boolean
  /** True only when this dimension enters the evidence-strong `population` layer. */
  population: boolean
  /**
   * `included` is the evidence-strong population layer; `scenario` is the
   * explicitly assumption-bearing comprehensive layer; `unquantified` has no
   * numeric route in either layer.
   */
  populationUse: PopulationUse
  match: boolean
  entertainment: boolean
  shareDefault: boolean
  description: string
  /** Reliable-layer semantics; the separate probability registry owns v4 scenario composition. */
  semantics: {
    within: 'and' | 'or' | 'threshold' | 'range' | 'nested' | 'score'
    cross: 'independent' | 'conditional' | 'grouped' | 'excluded'
    empty: 'ignore' | 'all'
  }
  /** Dot-path used by generic controls; compound controls may own several paths. */
  binding: string
  correlationGroup: string | null
  order: number
}

export const DIMENSION_CATEGORIES: ReadonlyArray<{ id: DimensionCategory; label: string; order: number }> = [
  { id: 'demographics', label: '基础人口', order: 10 },
  { id: 'region', label: '地域与定居', order: 20 },
  { id: 'appearance', label: '外形与形象', order: 30 },
  { id: 'education', label: '教育与学习', order: 40 },
  { id: 'career', label: '工作与职业', order: 50 },
  { id: 'finance', label: '收入与财务', order: 60 },
  { id: 'housing', label: '房产与交通', order: 70 },
  { id: 'lifestyle', label: '生活方式', order: 80 },
  { id: 'family', label: '家庭与边界', order: 90 },
  { id: 'relationship', label: '婚恋目标', order: 100 },
  { id: 'communication', label: '性格与沟通', order: 110 },
  { id: 'values', label: '价值观', order: 120 },
  { id: 'future', label: '未来规划', order: 130 },
  { id: 'health', label: '健康与敏感信息', order: 140 },
  { id: 'interests', label: '兴趣与社交', order: 150 },
  { id: 'entertainment', label: '娱乐彩蛋', order: 160 },
]

const everyone = { genders: GENDERS, age: { min: 18, max: 50 } } as const
const option = (value: string, label: string, description?: string): DimensionOption => ({ value, label, description })

const baseEntries: DimensionRegistryEntry[] = [
  {
    id: 'base.gender', label: '目标性别', category: 'demographics', classification: 'hard_filter',
    inputType: 'single', options: [option('male', '男性'), option('female', '女性')], applicableTo: everyone,
    evidenceId: 'evidence.base.age.census-2020-single-year', evidenceGrade: 'A', sensitive: false, population: true, populationUse: 'included',
    match: false, entertainment: false, shareDefault: true, description: '选择要估算的统计人群性别口径。',
    semantics: { within: 'or', cross: 'conditional', empty: 'all' }, binding: 'target.gender',
    correlationGroup: 'demographic', order: 10,
  },
  {
    id: 'base.age', label: '年龄范围', category: 'demographics', classification: 'hard_filter',
    inputType: 'range', options: [], applicableTo: everyone, evidenceId: 'evidence.base.age.census-2020-single-year', evidenceGrade: 'A',
    sensitive: false, population: true, populationUse: 'included', match: false, entertainment: false, shareDefault: true,
    description: '18–50 岁逐单岁有效，区间按单岁人口求和。',
    semantics: { within: 'range', cross: 'conditional', empty: 'all' }, binding: 'target.age',
    correlationGroup: 'demographic', order: 20,
  },
  {
    id: 'base.region', label: '居住地区', category: 'region', classification: 'hard_filter',
    inputType: 'city_multi', options: [], applicableTo: everyone, evidenceId: 'evidence.base.region.population-2025', evidenceGrade: 'C',
    sensitive: false, population: true, populationUse: 'included', match: false, entertainment: false, shareDefault: true,
    description: '多城市为并集；全国与城市互斥，未知城市不会被当成零概率。',
    semantics: { within: 'or', cross: 'conditional', empty: 'all' }, binding: 'target.cities',
    correlationGroup: 'demographic', order: 30,
  },
  {
    id: 'base.marital', label: '婚姻状态', category: 'demographics', classification: 'hard_filter',
    inputType: 'multi', options: [
      option(MARITAL_STATUSES[0], '未婚'), option(MARITAL_STATUSES[1], '离婚未再婚'),
      option(MARITAL_STATUSES[2], '丧偶未再婚'),
    ], applicableTo: everyone, evidenceId: 'evidence.base.marital.census-2020', evidenceGrade: 'B', sensitive: true,
    population: true, populationUse: 'included', match: false, entertainment: false, shareDefault: false,
    description: '官方性别×五岁组率在组内年龄保持常数；状态互斥，多选取并集，全部取消表示不限婚史。18–19 岁与 50 岁边界降 C。',
    semantics: { within: 'or', cross: 'conditional', empty: 'all' }, binding: 'target.maritalStatuses',
    correlationGroup: 'demographic', order: 40,
  },
  {
    id: 'appearance.height', label: '身高范围', category: 'appearance', classification: 'hard_filter',
    inputType: 'range', options: [], applicableTo: everyone, evidenceId: 'evidence.appearance.height.distribution-assumption', evidenceGrade: 'C',
    sensitive: false, population: true, populationUse: 'included', match: false, entertainment: false, shareDefault: true,
    description: '使用分年龄、分性别正态近似计算明确的上下限。',
    semantics: { within: 'range', cross: 'conditional', empty: 'all' }, binding: 'target.heightCm',
    correlationGroup: 'anthropometric', order: 50,
  },
]

const correlatedEntries: DimensionRegistryEntry[] = [
  {
    id: 'appearance.body_type', label: '体型范围', category: 'appearance', classification: 'correlated_hard',
    inputType: 'multi', options: [
      option(BODY_TYPES[0], '骨感'), option(BODY_TYPES[1], '纤细'), option(BODY_TYPES[2], '匀称'),
      option(BODY_TYPES[3], '标准'), option(BODY_TYPES[4], '微胖'), option(BODY_TYPES[5], '丰腴'),
      option(BODY_TYPES[6], '圆润'),
    ], applicableTo: everyone, evidenceId: 'evidence.appearance.bmi.nhc-2018', evidenceGrade: 'C', sensitive: true,
    population: false, populationUse: 'scenario', match: false, entertainment: false, shareDefault: false,
    description: '体型标签是主观语义，无法由全国BMI超重/肥胖率可靠映射；可作为硬边界记录，但不削减主人数。',
    semantics: { within: 'or', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.bodyTypes',
    correlationGroup: null, order: 60,
  },
  {
    id: 'education.level', label: '学历', category: 'education', classification: 'correlated_hard',
    inputType: 'multi', options: [option(EDUCATION_LEVELS[0], '大专'), option(EDUCATION_LEVELS[1], '本科'), option(EDUCATION_LEVELS[2], '硕士'), option(EDUCATION_LEVELS[3], '博士')],
    applicableTo: everyone, evidenceId: 'evidence.education.level.census-2020', evidenceGrade: 'A', sensitive: false,
    population: true, populationUse: 'included', match: false, entertainment: false, shareDefault: true,
    description: '七普表4-1直接按单岁和性别统计最高受教育程度；多选为互斥类别并集，进入主人口估算。',
    semantics: { within: 'or', cross: 'grouped', empty: 'ignore' }, binding: 'correlated.educationLevels',
    correlationGroup: 'socioeconomic', order: 70,
  },
  {
    id: 'education.school', label: '院校层级偏好', category: 'education', classification: 'soft_preference',
    inputType: 'single', options: [option(SCHOOL_TIERS[0], '清北'), option(SCHOOL_TIERS[1], 'C9'), option(SCHOOL_TIERS[2], '985'), option(SCHOOL_TIERS[3], '211')],
    applicableTo: everyone, evidenceId: 'evidence.education.school.elite-assumption', evidenceGrade: 'C', sensitive: false,
    population: false, populationUse: 'scenario', match: true, entertainment: false, shareDefault: true,
    description: '清北 ⊂ C9 ⊂ 985 ⊂ 211；因缺少同口径年龄存量数据，迁出人口估算。',
    semantics: { within: 'nested', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.schoolTier',
    correlationGroup: null, order: 80,
  },
  {
    id: 'economy.income', label: '最低年收入', category: 'finance', classification: 'correlated_hard',
    inputType: 'number', options: [], applicableTo: everyone, evidenceId: 'evidence.economy.income.wages-2025', evidenceGrade: 'C',
    sensitive: true, population: false, populationUse: 'scenario', match: false, entertainment: false, shareDefault: false,
    description: '可作为硬条件记录；公开数据的就业分母、个人税前年收入口径与尾部不足以可靠量化，因此不削减主人数，主结果标为上限。',
    semantics: { within: 'threshold', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.minAnnualIncomeWan',
    correlationGroup: null, order: 90,
  },
  {
    id: 'economy.wealth', label: '最低家庭资产', category: 'finance', classification: 'correlated_hard',
    inputType: 'number', options: [], applicableTo: everyone, evidenceId: 'evidence.economy.wealth.distribution-assumption', evidenceGrade: 'C',
    sensitive: true, population: false, populationUse: 'scenario', match: false, entertainment: false, shareDefault: false,
    description: '可作为硬条件记录；2019年城镇家庭锚点不能可靠映射到18–50岁个人，故不削减主人数。',
    semantics: { within: 'threshold', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.minHouseholdWealthWan',
    correlationGroup: null, order: 100,
  },
  {
    id: 'economy.house', label: '住房条件', category: 'housing', classification: 'correlated_hard',
    inputType: 'compound', options: [option(HOUSE_LOCATIONS[0], '核心区'), option(HOUSE_LOCATIONS[1], '市区'), option(HOUSE_LOCATIONS[2], '郊区'), option(HOUSE_TYPES[1], '大平层'), option(HOUSE_TYPES[2], '别墅'), option(HOUSE_TYPES[3], '四合院')],
    applicableTo: everyone, evidenceId: 'evidence.economy.house.local-young-assumption', evidenceGrade: 'C', sensitive: true,
    population: false, populationUse: 'scenario', match: false, entertainment: false, shareDefault: false,
    description: '可作为硬条件记录；家庭有房不等于本人名下、本地且满足面积/类型，缺少同口径联合数据，故不削减主人数。',
    semantics: { within: 'nested', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.housing',
    correlationGroup: null, order: 110,
  },
  {
    id: 'economy.vehicle', label: '车辆条件', category: 'housing', classification: 'correlated_hard',
    inputType: 'compound', options: [option(CAR_PRICE_BANDS[0], '10 万以下'), option(CAR_PRICE_BANDS[1], '10–20 万'), option(CAR_PRICE_BANDS[2], '20–50 万'), option(CAR_PRICE_BANDS[3], '50–100 万'), option(CAR_PRICE_BANDS[4], '100 万以上')],
    applicableTo: everyone, evidenceId: 'evidence.economy.car.personal-assumption', evidenceGrade: 'C', sensitive: true,
    population: false, populationUse: 'scenario', match: false, entertainment: false, shareDefault: false,
    description: '可作为硬条件记录；家庭车辆与目标个人持有及价位档口径不一致，缺少可靠联合分布，故不削减主人数。',
    semantics: { within: 'or', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.vehicle',
    correlationGroup: null, order: 120,
  },
  {
    id: 'lifestyle.smoking', label: '吸烟习惯', category: 'lifestyle', classification: 'correlated_hard',
    inputType: 'single', options: [option('any', '不限'), option('non_smoker', '当前不吸烟')], applicableTo: everyone,
    evidenceId: 'evidence.lifestyle.smoking.cdc-2024', evidenceGrade: 'B', sensitive: true, population: true, populationUse: 'included',
    match: false, entertainment: false, shareDefault: false, description: '按 2024 年性别“现在吸烟率”的补集估算，不等于终身从不吸烟。',
    semantics: { within: 'or', cross: 'grouped', empty: 'ignore' }, binding: 'correlated.smoking', correlationGroup: 'health_body', order: 130,
  },
  {
    id: 'lifestyle.drinking', label: '饮酒习惯', category: 'lifestyle', classification: 'correlated_hard',
    inputType: 'single', options: [option('any', '不限'), option('not_regular', '过去30天未饮酒'), option('none', '过去12个月未饮酒')], applicableTo: everyone,
    evidenceId: 'evidence.lifestyle.drinking.cdc-2024', evidenceGrade: 'C', sensitive: true, population: true, populationUse: 'included',
    match: false, entertainment: false, shareDefault: false, description: '使用 2024 年调查的回溯期口径；“过去12个月未饮酒”是更窄集合，不声称终身不饮酒。',
    semantics: { within: 'nested', cross: 'grouped', empty: 'ignore' }, binding: 'correlated.drinking', correlationGroup: 'health_body', order: 140,
  },
  {
    id: 'health.chronic', label: '慢性病信息偏好', category: 'health', classification: 'soft_preference',
    inputType: 'toggle', options: [option(HEALTH_CRITERIA[0], '健康状况符合期待')], applicableTo: everyone,
    evidenceId: 'evidence.health.chronic.no-major-disease-assumption', evidenceGrade: 'C', sensitive: true, population: false, populationUse: 'scenario', match: true,
    entertainment: false, shareDefault: false, description: '“无重大慢性病”没有可运行的统一病种定义；登记表已将该合成曲线排除，因此只进契合度而不减少人口。',
    semantics: { within: 'score', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.healthCriteria', correlationGroup: null, order: 150,
  },
  {
    id: 'health.myopia', label: '视力偏好', category: 'health', classification: 'soft_preference',
    inputType: 'toggle', options: [option(HEALTH_CRITERIA[1], '不近视')], applicableTo: everyone,
    evidenceId: 'evidence.health.myopia.adult-evidence-gap', evidenceGrade: 'C', sensitive: true, population: false, populationUse: 'scenario', match: true,
    entertainment: false, shareDefault: false, description: '缺少18–50岁同口径成人分布，保留为偏好但不砍人口。',
    semantics: { within: 'and', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.healthCriteria', correlationGroup: null, order: 160,
  },
  {
    id: 'appearance.hair_full', label: '无雄激素性脱发', category: 'appearance', classification: 'correlated_hard',
    inputType: 'toggle', options: [option(HAIR_CRITERIA[0], '无雄激素性脱发（AGA）')], applicableTo: everyone,
    evidenceId: 'evidence.appearance.hair_full.community-study', evidenceGrade: 'B', sensitive: true, population: false, populationUse: 'scenario',
    match: false, entertainment: false, shareDefault: false, description: '六城社区研究提供男女分年龄组AGA率；综合情景按年龄与性别计算并给全国外推宽界，不削减可靠主人口。',
    semantics: { within: 'and', cross: 'excluded', empty: 'ignore' }, binding: 'correlated.hairCriteria', correlationGroup: null, order: 170,
  },
]

type SoftMeta = readonly [SoftPreferenceId, string, DimensionCategory, boolean, string]
const softMetadata: readonly SoftMeta[] = [
  ['appearance.training_habit', '训练习惯', 'appearance', false, '希望对方保持规律训练。'],
  ['appearance.grooming', '形象管理', 'appearance', false, '在意整洁与日常形象管理。'],
  ['appearance.style', '穿搭风格', 'appearance', false, '偏好的穿搭与审美契合。'],
  ['appearance.dental_neatness', '牙齿整洁偏好', 'appearance', true, '作为外形偏好，不冒充可靠人口比例。'],
  ['appearance.tattoo_preference', '纹身接受度', 'appearance', true, '表达接受边界，不评价个人价值。'],
  ['appearance.hairline_preference', '发际线偏好', 'appearance', true, '证据不足，迁出人口估算。'],
  ['appearance.gray_hair_preference', '发色偏好', 'appearance', true, '证据不足，迁出人口估算。'],
  ['lifestyle.exercise', '运动频率', 'lifestyle', false, '生活节奏与共同活动偏好。'],
  ['lifestyle.sleep_rhythm', '睡眠作息', 'lifestyle', true, '生活节奏偏好，不与健康率重复扣减。'],
  ['lifestyle.cooking', '做饭习惯', 'lifestyle', false, '共同生活技能偏好。'],
  ['lifestyle.housework', '家务分工', 'lifestyle', false, '对家务承担方式的期待。'],
  ['lifestyle.cleanliness', '整洁习惯', 'lifestyle', false, '居住环境偏好。'],
  ['lifestyle.diet', '饮食偏好', 'lifestyle', false, '饮食节奏与禁忌的契合。'],
  ['lifestyle.pet_attitude', '宠物态度', 'lifestyle', false, '对养宠和照护责任的态度。'],
  ['lifestyle.travel', '旅行频率', 'lifestyle', false, '共同旅行需求。'],
  ['lifestyle.gaming', '游戏与追剧', 'lifestyle', false, '娱乐时间与边界。'],
  ['lifestyle.social_frequency', '社交频率', 'lifestyle', false, '聚会与独处节奏。'],
  ['lifestyle.commute_tolerance', '通勤接受度', 'lifestyle', false, '对异地、通勤和见面频率的接受度。'],
  ['family.only_child', '兄弟姐妹情况', 'family', true, '作为家庭结构偏好，不进入人口漏斗。'],
  ['family.parents_pension', '父母养老保障', 'family', true, '敏感家庭财务偏好，默认不分享。'],
  ['family.boundaries', '父母介入边界', 'family', true, '对原生家庭介入关系的边界。'],
  ['family.eldercare_plan', '赡养安排', 'family', true, '提前对养老责任形成共识。'],
  ['family.separate_living', '婚后居住方式', 'family', true, '是否接受与父母同住。'],
  ['career.in_system', '职业组织偏好', 'career', true, '“体制内”等只作为偏好，不再无证据砍人口。'],
  ['career.stability', '工作稳定性', 'career', false, '对职业波动的接受度。'],
  ['career.work_intensity', '工作强度', 'career', false, '对加班、夜班与忙碌程度的期待。'],
  ['career.business_trip', '出差与异地', 'career', false, '对出差、远程和异地工作的接受度。'],
  ['finance.saving_style', '消费与储蓄观', 'finance', true, '财务价值观契合，不推断个人价值。'],
  ['finance.transparency', '财务透明度', 'finance', true, '关系中的财务披露边界。'],
  ['finance.joint_planning', '共同理财意愿', 'finance', true, '是否愿意共同制定财务计划。'],
  ['relationship.currently_single', '当前关系状态', 'relationship', true, '敏感状态偏好，不使用弱证据比例砍人口。'],
  ['relationship.orientation_compatible', '取向与边界契合', 'relationship', true, '只表达双方是否契合，默认不分享。'],
  ['relationship.history_preference', '关系经历偏好', 'relationship', true, '不以关系经历羞辱或分级。'],
  ['relationship.marriage_timeline', '结婚时间预期', 'relationship', true, '对关系推进节奏的期待。'],
  ['relationship.children_plan', '生育与育儿计划', 'relationship', true, '敏感未来计划，默认不分享。'],
  ['relationship.intimacy_health', '亲密健康沟通', 'health', true, '敏感健康议题，只进入契合度。'],
  ['relationship.stamina', '亲密节奏偏好', 'health', true, '不使用医学患病率给个人关系下结论。'],
  ['relationship.energy', '亲密频率偏好', 'health', true, '只衡量偏好交集。'],
  ['communication.frequency', '沟通频率', 'communication', false, '日常沟通密度。'],
  ['communication.conflict_repair', '冲突修复方式', 'communication', false, '争执后的冷静、道歉与修复。'],
  ['communication.emotional_expression', '情绪表达', 'communication', false, '表达感受与需求的方式。'],
  ['communication.alone_time', '独处需求', 'communication', false, '共同生活中的个人空间。'],
  ['values.loyalty', '忠诚观', 'values', true, '对排他性和承诺的共识。'],
  ['values.gender_roles', '性别角色观', 'values', true, '家庭与职业角色的共识。'],
  ['values.partner_career_support', '伴侣事业支持', 'values', false, '对彼此职业成长的支持方式。'],
  ['values.privacy_boundary', '隐私与社交边界', 'values', true, '设备、社交与个人空间边界。'],
  ['future.settlement', '定居意愿', 'future', false, '未来城市与异地迁移计划。'],
  ['future.home_purchase', '共同购房计划', 'future', true, '住房规划，不作为当前资产筛选。'],
  ['future.care_distribution', '照护分工', 'future', false, '家务、育儿和照护责任分配。'],
  ['interest.shared_activities', '共同兴趣需求', 'interests', false, '对共同活动数量和频率的期待。'],
]

const softEntries: DimensionRegistryEntry[] = softMetadata.map(([id, label, category, sensitive, description], index) => ({
  id,
  label,
  category,
  classification: 'soft_preference',
  inputType: 'toggle',
  options: [option(id, label)],
  applicableTo: everyone,
  evidenceId: null,
  evidenceGrade: 'NA',
  sensitive,
  population: false,
  populationUse: 'scenario',
  match: true,
  entertainment: false,
  shareDefault: !sensitive,
  description,
  semantics: { within: 'score', cross: 'excluded', empty: 'ignore' },
  binding: 'softPreferenceIds',
  correlationGroup: null,
  order: 200 + index,
}))

const entertainmentEntries: DimensionRegistryEntry[] = [
  {
    id: 'entertainment.zodiac', label: '星座', category: 'entertainment', classification: 'entertainment',
    inputType: 'multi', options: ZODIACS.map((value) => option(value, value)), applicableTo: everyone,
    evidenceId: null, evidenceGrade: 'D', sensitive: false, population: false, populationUse: 'scenario', match: false, entertainment: true,
    shareDefault: true, description: '不进入可靠主人口；全条件综合情境按公历日数并集计算，并明确标为娱乐先验。',
    semantics: { within: 'or', cross: 'excluded', empty: 'ignore' }, binding: 'entertainment.zodiacs', correlationGroup: null, order: 300,
  },
  {
    id: 'entertainment.mbti', label: 'MBTI 彩蛋', category: 'entertainment', classification: 'entertainment',
    inputType: 'multi', options: MBTI_POLES.map((value) => option(value, value)), applicableTo: everyone,
    evidenceId: null, evidenceGrade: 'D', sensitive: false, population: false, populationUse: 'scenario', match: false, entertainment: true,
    shareDefault: true, description: '不进入可靠主人口；全条件综合情境按四个二元轴的最大熵先验计算，不冒充调查分布。',
    semantics: { within: 'score', cross: 'excluded', empty: 'ignore' }, binding: 'entertainment.mbti', correlationGroup: null, order: 310,
  },
]

export const DIMENSION_REGISTRY: readonly DimensionRegistryEntry[] = [
  ...baseEntries,
  ...correlatedEntries,
  ...softEntries,
  ...entertainmentEntries,
]

export const DIMENSION_BY_ID: ReadonlyMap<string, DimensionRegistryEntry> = new Map(
  DIMENSION_REGISTRY.map((dimension) => [dimension.id, dimension]),
)

export function dimensionsByClass(classification: DimensionClass): readonly DimensionRegistryEntry[] {
  return DIMENSION_REGISTRY.filter((dimension) => dimension.classification === classification)
}
