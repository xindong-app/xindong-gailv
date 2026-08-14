import cityRuntimeJson from './city-runtime.json'

/**
 * 城市人口运行时投影。
 *
 * 完整的官方来源、原始值、口径和局限保存在
 * `city-population-sources.json` 与 `evidence-registry.json`。浏览器只加载
 * 计算必需字段，避免把整套证据正文打进生产包。
 *
 * 每个可选城市都有可追溯的年末常住人口锚点。城市公报通常没有
 * 18—50 岁逐岁×性别表，因此主人口仍按 2020 七普全国详细表份额外推，
 * 并使用 0.70—1.30 宽情景；该结构外推为 C 级，不是官方置信区间。
 */

export type CityMainEstimateStatus = 'included_estimate'

export interface City {
  name: string
  province: string
  /** 官方年末常住人口，单位：万人。 */
  pop: number
  /** 历史工资校准字段，仅供研究情景；主人口不得据此砍人数。 */
  wage: number
  hot?: boolean
  mainEstimateStatus: CityMainEstimateStatus
  populationYear: number
  sourceEvidenceId: string
}

/** 2025 年规模以上企业就业人员平均工资；不是全体18—50岁个人收入。 */
export const NATIONAL_WAGE = 106_080

/**
 * 2023 年省级城镇非私营单位平均工资。分母是单位就业人员，不是所有居民；
 * 仅供研究情景和旧接口兼容，禁止把地域工资比直接乘到个人收入概率。
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

export const CITY_DATA_VERSION = cityRuntimeJson.dataVersion
export const CITIES: readonly City[] = cityRuntimeJson.entries as readonly City[]
