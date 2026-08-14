/**
 * 城市常住人口证据层。
 *
 * `pop` 只允许保存能追溯到政府/统计局原始发布的年末常住人口锚点。
 * `unsupported` 城市使用 `pop: 0` 作为“禁止旧引擎误用”的哨兵值；它不表示
 * 该城市无人。调用方必须先检查 `mainEstimateStatus`，并把这类城市报告为
 * “当前不可量化”。
 *
 * 城市公报通常没有 18—50 岁逐岁×性别表。即便总量为 A 级，按全国 2020
 * 年龄性别份额外推到城市仍是 C 级情景，不是统计置信区间。
 */

export type CityPopulationStatus = 'official_resident_anchor' | 'unsupported'
export type CityMainEstimateStatus = 'included_estimate' | 'unquantified'
export type CityPopulationBasis = 'year_end_resident_population' | 'unavailable'
export type CityAgeSexStructurePolicy = 'national_2020_age_sex_share' | 'unavailable'

export const CITY_STRUCTURE_SCENARIO_RANGE = {
  conservativeMultiplier: 0.7,
  optimisticMultiplier: 1.3,
  isConfidenceInterval: false,
  note: '城市逐岁×性别结构缺失时的宽情景倍数；不是官方误差界限或统计学置信区间。',
} as const

export interface City {
  name: string
  province: string
  /** 常住人口，万人；unsupported 时固定为 0（不可量化哨兵，不是人口估计）。 */
  pop: number
  /**
   * 历史工资校准字段，仅为旧代码兼容。城市/省级非私营单位平均工资与目标
   * 个人收入分母不同，主人口估算不得读取该值。
   */
  wage: number
  /** 已停用的旧财富展示字段；不进入任何人口计算。 */
  rich600: number | null
  hot?: boolean
  populationStatus: CityPopulationStatus
  mainEstimateStatus: CityMainEstimateStatus
  populationBasis: CityPopulationBasis
  populationYear: number | null
  sourceEvidenceId: string | null
  populationSourceUrl: string | null
  populationGrade: 'A' | null
  ageSexStructurePolicy: CityAgeSexStructurePolicy
  ageSexStructureGrade: 'C' | null
  structureScenarioRange: typeof CITY_STRUCTURE_SCENARIO_RANGE | null
  populationNote: string
  wageQuantificationStatus: 'research_only'
}

/**
 * 2025 年规模以上企业就业人员平均工资。它不是全国 18—50 岁个人收入均值，
 * 也不是中位数；仅保留给研究情景和旧接口，主估算不得用作收入分布分母。
 */
export const NATIONAL_WAGE = 106_080

/**
 * 2023 年省级城镇非私营单位平均工资（元）。分母是单位就业人员，不是所有
 * 18—50 岁居民。仅研究情景可用，禁止把地域工资比直接乘到个人收入概率。
 */
export const PROVINCE_WAGE: Readonly<Record<string, number>> = {
  上海: 229337, 北京: 218312, 西藏: 165004, 天津: 138007, 浙江: 133045,
  广东: 131418, 江苏: 125102, 青海: 121457, 宁夏: 117681, 海南: 114572,
  重庆: 113653, 新疆: 112305, 四川: 110160, 湖北: 109227, 内蒙古: 108856,
  福建: 108520, 山东: 107131, 陕西: 106969, 云南: 106769, 安徽: 103688,
  贵州: 102010, 甘肃: 99124, 辽宁: 97330, 湖南: 97015, 广西: 96184,
  黑龙江: 95750, 山西: 95025, 吉林: 94937, 河北: 94818, 江西: 92794,
  河南: 84156,
}

interface CityIdentity {
  name: string
  province: string
  wage: number
  hot?: boolean
}

interface OfficialCityInput extends CityIdentity {
  pop: number
  populationYear: number
  sourceEvidenceId: string
  populationSourceUrl: string
}

function officialCity(input: OfficialCityInput): City {
  return {
    ...input,
    rich600: null,
    populationStatus: 'official_resident_anchor',
    mainEstimateStatus: 'included_estimate',
    populationBasis: 'year_end_resident_population',
    populationGrade: 'A',
    ageSexStructurePolicy: 'national_2020_age_sex_share',
    ageSexStructureGrade: 'C',
    structureScenarioRange: CITY_STRUCTURE_SCENARIO_RANGE,
    populationNote: '总量来自官方年末常住人口；18—50岁逐岁×性别结构按全国2020份额外推并采用宽情景范围。',
    wageQuantificationStatus: 'research_only',
  }
}

function unsupportedCity(input: CityIdentity): City {
  return {
    ...input,
    pop: 0,
    rich600: null,
    populationStatus: 'unsupported',
    mainEstimateStatus: 'unquantified',
    populationBasis: 'unavailable',
    populationYear: null,
    sourceEvidenceId: null,
    populationSourceUrl: null,
    populationGrade: null,
    ageSexStructurePolicy: 'unavailable',
    ageSexStructureGrade: null,
    structureScenarioRange: null,
    populationNote: '截至本数据版本未登记可追溯的一手常住人口锚点；0为禁用哨兵，不代表人口为0。',
    wageQuantificationStatus: 'research_only',
  }
}

/**
 * 46 个可选城市全部保留。只有 `officialCity` 可进入城市主估算；其余城市
 * 仍可在产品中选择，但应返回“当前不可量化”，不能回退到历史搜索摘要。
 */
export const CITIES: readonly City[] = [
  officialCity({ name: '北京', province: '北京', pop: 2180, wage: 218312, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.beijing-2025', populationSourceUrl: 'https://tjj.beijing.gov.cn/tjsj_31433/tjgb_31445/ndgb_31446/202603/t20260326_4566469.html' }),
  officialCity({ name: '上海', province: '上海', pop: 2485.41, wage: 229337, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.shanghai-2025', populationSourceUrl: 'https://tjj.sh.gov.cn/tjgb/20260330/e0772941e8e041eaaad2df850b44ef98.html' }),
  officialCity({ name: '深圳', province: '广东', pop: 1824.85, wage: 174640, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.shenzhen-2025', populationSourceUrl: 'https://tjj.sz.gov.cn/zwgk/zfxxgkml/tjsj/tjgb/content/post_12803919.html' }),
  officialCity({ name: '广州', province: '广东', pop: 1910.10, wage: 158318, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.guangzhou-2025', populationSourceUrl: 'https://tjj.gz.gov.cn/zzfwzq/tjgb/content/post_10804088.html' }),
  unsupportedCity({ name: '杭州', province: '浙江', wage: 161660, hot: true }),
  unsupportedCity({ name: '成都', province: '四川', wage: 127093, hot: true }),
  officialCity({ name: '南京', province: '江苏', pop: 963.85, wage: 159659, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.nanjing-2025', populationSourceUrl: 'https://tjj.nanjing.gov.cn/bmfw/njsj/202604/t20260403_5818444.html' }),
  officialCity({ name: '武汉', province: '湖北', pop: 1386.19, wage: 109227, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.wuhan-2025', populationSourceUrl: 'https://tjj.wuhan.gov.cn/tjfw/tjgb/202604/t20260408_2750693.shtml' }),
  officialCity({ name: '苏州', province: '江苏', pop: 1304.77, wage: 138732, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.suzhou-2025', populationSourceUrl: 'https://tjj.suzhou.gov.cn/sztjj/tjgb/202604/3dc4b574cabd4e86b36ec5d3280e927c.shtml' }),
  officialCity({ name: '西安', province: '陕西', pop: 1323.63, wage: 128675, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.xian-2025', populationSourceUrl: 'https://tjj.xa.gov.cn/web_files/tjj/file/2026/05/15/202605151000219859531.pdf' }),
  officialCity({ name: '重庆', province: '重庆', pop: 3187.26, wage: 117446, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.chongqing-2025', populationSourceUrl: 'https://www.cq.gov.cn/zwgk/zfxxgkml/sjfb_120853/tjgb/202603/t20260326_15568523.html' }),
  officialCity({ name: '天津', province: '天津', pop: 1363, wage: 138007, hot: true, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.tianjin-2025', populationSourceUrl: 'https://www.tj.gov.cn/sq/tjgb/202603/t20260327_7271193.html' }),
  unsupportedCity({ name: '长沙', province: '湖南', wage: 97015 }),
  officialCity({ name: '郑州', province: '河南', pop: 1313.8, wage: 84156, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.zhengzhou-2025', populationSourceUrl: 'https://tjj.zhengzhou.gov.cn/fxtj/10069073.jhtml' }),
  officialCity({ name: '东莞', province: '广东', pop: 1080.04, wage: 131418, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.dongguan-2025', populationSourceUrl: 'https://tjj.dg.gov.cn/tjzl/tjgb/content/post_4537415.html' }),
  officialCity({ name: '佛山', province: '广东', pop: 969.89, wage: 115084, populationYear: 2024, sourceEvidenceId: 'evidence.base.region.foshan-2024', populationSourceUrl: 'https://www.foshan.gov.cn/attachment/0/537/537176/6564843.pdf' }),
  unsupportedCity({ name: '宁波', province: '浙江', wage: 138033 }),
  unsupportedCity({ name: '合肥', province: '安徽', wage: 103688 }),
  unsupportedCity({ name: '青岛', province: '山东', wage: 107131 }),
  officialCity({ name: '济南', province: '山东', pop: 961.6, wage: 133232, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.jinan-2025', populationSourceUrl: 'https://jntj.jinan.gov.cn/col/col18254/art/2026/art_7dc3135bb2209f961b3c65baa8ab3d2d.html' }),
  officialCity({ name: '沈阳', province: '辽宁', pop: 924.3, wage: 114821, populationYear: 2024, sourceEvidenceId: 'evidence.base.region.shenyang-2024', populationSourceUrl: 'https://tjj.shenyang.gov.cn/sjfb/tjgb/202504/P020250423354552607711.pdf' }),
  unsupportedCity({ name: '哈尔滨', province: '黑龙江', wage: 95750 }),
  unsupportedCity({ name: '昆明', province: '云南', wage: 106769 }),
  unsupportedCity({ name: '大连', province: '辽宁', wage: 119793 }),
  unsupportedCity({ name: '无锡', province: '江苏', wage: 139697 }),
  unsupportedCity({ name: '厦门', province: '福建', wage: 108520 }),
  officialCity({ name: '福州', province: '福建', pop: 852.1, wage: 108520, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.fuzhou-2025', populationSourceUrl: 'https://tjj.fuzhou.gov.cn/zwgk/tjzl/ndbg/202604/t20260414_5308173.htm' }),
  unsupportedCity({ name: '温州', province: '浙江', wage: 122163 }),
  officialCity({ name: '常州', province: '江苏', pop: 541.54, wage: 134829, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.changzhou-2025', populationSourceUrl: 'https://tjj.changzhou.gov.cn/content/suitable/show?catid=24519&id=29035' }),
  unsupportedCity({ name: '珠海', province: '广东', wage: 133869 }),
  unsupportedCity({ name: '泉州', province: '福建', wage: 108520 }),
  officialCity({ name: '南通', province: '江苏', pop: 775, wage: 125102, populationYear: 2024, sourceEvidenceId: 'evidence.base.region.nantong-2024', populationSourceUrl: 'https://tjj.nantong.gov.cn/ntstj/2025tjnj/zk/html/gb.pdf' }),
  officialCity({ name: '烟台', province: '山东', pop: 700.05, wage: 107131, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.yantai-2025', populationSourceUrl: 'https://tjj.yantai.gov.cn/col/col117/art/2026/art_61a619eacfd44e5bbf80e45bf2cdd6d0.html' }),
  unsupportedCity({ name: '太原', province: '山西', wage: 95025 }),
  unsupportedCity({ name: '贵阳', province: '贵州', wage: 102010 }),
  unsupportedCity({ name: '南昌', province: '江西', wage: 92794 }),
  officialCity({ name: '石家庄', province: '河北', pop: 1124.69, wage: 94818, populationYear: 2025, sourceEvidenceId: 'evidence.base.region.shijiazhuang-2025', populationSourceUrl: 'https://tjj.sjz.gov.cn/columns/940d701f-5e56-4f5d-9ece-7968f6354993/202605/26/f062dca8-ce95-46f8-b1c9-33f507db5a29.html' }),
  unsupportedCity({ name: '兰州', province: '甘肃', wage: 99124 }),
  unsupportedCity({ name: '乌鲁木齐', province: '新疆', wage: 112305 }),
  unsupportedCity({ name: '海口', province: '海南', wage: 114572 }),
  unsupportedCity({ name: '银川', province: '宁夏', wage: 117681 }),
  unsupportedCity({ name: '西宁', province: '青海', wage: 121457 }),
  unsupportedCity({ name: '呼和浩特', province: '内蒙古', wage: 108856 }),
  unsupportedCity({ name: '拉萨', province: '西藏', wage: 165004 }),
  unsupportedCity({ name: '南宁', province: '广西', wage: 96184 }),
  unsupportedCity({ name: '长春', province: '吉林', wage: 94937 }),
]
