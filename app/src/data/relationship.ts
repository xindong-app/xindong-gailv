import type { RelationshipPairing, RelationshipRateRange } from '../model/relationshipSchema'

export type RelationshipEvidenceGrade = 'C' | 'D' | 'NA'

/** Version of the relationship-scenario assumptions, independent of the main population model. */
export const RELATIONSHIP_SCENARIO_VERSION = '1.1.0'
export const RELATIONSHIP_DATA_VERSION = '2026.08.14'
export const RELATIONSHIP_EVIDENCE_RETRIEVED_AT = '2026-08-14'

export interface RelationshipEvidenceSource {
  id: string
  title: string
  publisher: string
  year: number
  url: string | null
  documentPath: string | null
  retrievedAt: string
  applicablePopulation: string
  measure: string
  limitations: readonly string[]
  kind: 'study' | 'analyst_scenario'
}

export interface RelationshipFactorScenario {
  range: RelationshipRateRange
  evidenceGrade: RelationshipEvidenceGrade
  sourceIds: readonly string[]
  applicablePopulation: string
  basis: string
  limitations: readonly string[]
}

export interface RelationshipDataValidationSnapshot {
  scenarioVersion: string
  dataVersion: string
  evidenceRetrievedAt: string
  sources: readonly RelationshipEvidenceSource[]
  scenarios: Readonly<Record<string, RelationshipFactorScenario>>
}

export interface RelationshipDataValidationIssue {
  path: string
  message: string
}

export interface RelationshipDataValidationResult {
  valid: boolean
  sourceCount: number
  scenarioCount: number
  issues: readonly RelationshipDataValidationIssue[]
}

/**
 * These sources anchor a sensitivity scenario; none is treated as an official
 * population rate for present-day mainland Chinese adults aged 18–50.
 */
export const RELATIONSHIP_EVIDENCE_SOURCES = [
  {
    id: 'wei-guadamuz-2009-chfls-msm',
    title: 'STD Prevalence, Risky Sexual Behaviors, and Sex With Women in a National Sample of Chinese Men Who Have Sex With Men',
    publisher: 'American Journal of Public Health',
    year: 2009,
    url: 'https://doi.org/10.2105/AJPH.2008.150037',
    documentPath: null,
    retrievedAt: '2026-08-14',
    applicablePopulation: '1999–2000 年中国 20–64 岁男性概率样本；论文明确说明调查未覆盖香港和西藏',
    measure: '一生中是否曾与男性发生性行为；男性样本 1,861 人，其中 MSM 41 人',
    limitations: [
      '测量的是终生同性性行为，不是性取向、当前单身或寻找男性长期伴侣的意愿。',
      '数据距今久、事件样本仅 41 人，且污名环境可能导致漏报。',
      '论文的 1.6%–3.0% 是原研究对 MSM 行为比例的 95% 置信区间，不能直接当作本产品关系人群的置信区间。',
    ],
    kind: 'study',
  },
  {
    id: 'liu-et-al-2015-population-estimation',
    title: '中国同性爱者、同性性行为者和相关女性群体人口数值估测',
    publisher: '中国性科学（北京大学期刊平台收录）',
    year: 2015,
    url: 'https://ccj.pku.edu.cn/article/info?id=107779330',
    documentPath: null,
    retrievedAt: '2026-08-14',
    applicablePopulation: '以 2013 年人口基数和 2010 年中国成年人多层等概率性学抽样结果推算的人群',
    measure: '男/女同性爱者与同性性行为者的模型化人口规模',
    limitations: [
      '这是二次人口推算，不是 18–50 岁当前关系意愿的直接调查。',
      '“同性爱者”“同性性行为者”和“愿意建立关系”是不同概念，不能互换。',
      '文章锚定的调查和人口年份较早。',
    ],
    kind: 'study',
  },
  {
    id: 'yan-et-al-2018-guangzhou-students',
    title: 'Self-reported sexual orientation among undergraduates of 10 universities in Guangzhou, China',
    publisher: 'PLOS ONE',
    year: 2018,
    url: 'https://doi.org/10.1371/journal.pone.0201817',
    documentPath: null,
    retrievedAt: '2026-08-14',
    applicablePopulation: '广州大学城 10 所高校、15–29 岁本科生，分层随机抽样；有效样本 8,182 人',
    measure: '五级自报性取向连续量表，按性别报告',
    limitations: [
      '高校年轻样本不能代表全国 18–50 岁居民。',
      '自报取向不等于当前愿意寻找某一性别的长期伴侣。',
      '性取向题拒答率 9.8%，存在敏感题非应答偏差。',
    ],
    kind: 'study',
  },
  {
    id: 'product-wide-scenario-2026',
    title: '关系可得性宽情境假设（非调查数据）',
    publisher: '择偶概率软件模型组',
    year: 2026,
    url: null,
    documentPath: 'docs/RELATIONSHIP_SCENARIO_METHOD.md',
    retrievedAt: '2026-08-14',
    applicablePopulation: '已满足主人口层可量化条件的目标人群；用于取向相容宽情境，以及取向相容后当前单身与关系意愿的逐层条件情境',
    measure: '取向相容、当前单身、愿意进入关系三个条件链环节的分析者宽情境参数',
    limitations: [
      '没有可代表全国 18–50 岁、同时匹配本产品条件链的调查锚点。',
      '上下界和参考值只用于观察结果对假设的敏感性，不是观测率、官方率或置信区间。',
      '取向标签与对特定伴侣性别的开放程度不是同一概念；单身与关系意愿也会随年龄、城市、时间和个人定义显著变化。',
    ],
    kind: 'analyst_scenario',
  },
] as const satisfies readonly RelationshipEvidenceSource[]

export const RELATIONSHIP_SOURCE_BY_ID: ReadonlyMap<string, RelationshipEvidenceSource> = new Map(
  RELATIONSHIP_EVIDENCE_SOURCES.map((source) => [source.id, source] as const),
)

const oppositeSexScenario: RelationshipFactorScenario = {
  range: { lower: 0.85, reference: 0.95, upper: 0.995 },
  evidenceGrade: 'D',
  sourceIds: ['yan-et-al-2018-guangzhou-students', 'product-wide-scenario-2026'],
  applicablePopulation: '目标性别为异性时，可能对本人性别有伴侣取向相容性的人群',
  basis: '高校研究中绝大多数自报并非排他同性取向；为覆盖年龄、定义、非应答和外推误差，产品采用更宽的 85%–99.5% 情境，而不是照搬样本比例。',
  limitations: [
    '没有全国 18–50 岁按目标性别、当前伴侣意向测量的代表性数据。',
    '双性/偏异性/偏同性类别是否愿意与特定个人建立关系不可由身份标签推出。',
  ],
}

export const ORIENTATION_COMPATIBILITY_SCENARIOS: Readonly<Record<RelationshipPairing, RelationshipFactorScenario>> = {
  male_female: oppositeSexScenario,
  female_male: oppositeSexScenario,
  male_male: {
    range: { lower: 0.016, reference: 0.035, upper: 0.075 },
    evidenceGrade: 'D',
    sourceIds: [
      'wei-guadamuz-2009-chfls-msm',
      'liu-et-al-2015-population-estimation',
      'yan-et-al-2018-guangzhou-students',
      'product-wide-scenario-2026',
    ],
    applicablePopulation: '男性目标人群中，可能对男性有取向相容性的人群',
    basis: '下界参考早期全国概率样本男性同性行为研究的低端；参考值靠近后续人口推算采用的宽口径；上界用于覆盖年轻高校样本中同性/双性/偏同性类别和长期漏报。三点共同构成敏感性情境，不是同一统计量的合并估计。',
    limitations: [
      '来源分别测量行为、模型化人群与自报取向，定义不同。',
      '年龄和年份不一致，不能声称代表当前全国 18–50 岁。',
      '对男性有过吸引或行为，不自动意味着当前愿意与男性建立关系。',
    ],
  },
  female_female: {
    range: { lower: 0.004, reference: 0.02, upper: 0.09 },
    evidenceGrade: 'D',
    sourceIds: [
      'liu-et-al-2015-population-estimation',
      'yan-et-al-2018-guangzhou-students',
      'product-wide-scenario-2026',
    ],
    applicablePopulation: '女性目标人群中，可能对女性有取向相容性的人群',
    basis: '下界有意低于 2015 年成年人口规模推算所隐含的量级，以覆盖漏报与定义差异；参考值靠近该推算量级；上界覆盖广州高校女性同性/双性/偏同性类别。它是跨定义、跨年龄证据形成的宽情境，不是汇总率。',
    limitations: [
      '缺少全国成年女性的近期代表性取向调查，证据比男男性行为更薄弱。',
      '高校女性样本不能外推到所有年龄和城市。',
      '身份、吸引、行为和建立关系意愿不可互换。',
    ],
  },
}

export const CURRENTLY_SINGLE_SCENARIO: RelationshipFactorScenario = {
  range: { lower: 0.15, reference: 0.4, upper: 0.75 },
  evidenceGrade: 'NA',
  sourceIds: ['product-wide-scenario-2026'],
  applicablePopulation: '性取向相容的目标人群；比例应理解为在上一层条件下的条件比例',
  basis: '因缺少能与主人口条件链联结的全国数据，使用 15%–75% 的极宽敏感性情境，参考值 40% 只用于重算。',
  limitations: [
    '法律婚姻状态不等于当前单身，不能用未婚率替代。',
    '主人口层若已选择婚史，也不能据此推断关系状态。',
  ],
}

export const RELATIONSHIP_WILLINGNESS_SCENARIO: RelationshipFactorScenario = {
  range: { lower: 0.25, reference: 0.6, upper: 0.9 },
  evidenceGrade: 'NA',
  sourceIds: ['product-wide-scenario-2026'],
  applicablePopulation: '性取向相容且当前单身的目标人群；比例应理解为在前两层条件下的条件比例',
  basis: '因没有全国代表性且定义一致的数据，使用 25%–90% 的宽敏感性情境，参考值 60% 只用于重算。',
  limitations: [
    '“愿意进入关系”受关系类型、时间窗口、出柜安全、距离和个人处境影响。',
    '没有回答或未知不能当作不愿意。',
  ],
}

const EXPECTED_SCENARIO_IDS = [
  'orientation.male_female',
  'orientation.female_male',
  'orientation.male_male',
  'orientation.female_female',
  'currentlySingle',
  'relationshipWillingness',
] as const

export const RELATIONSHIP_FACTOR_SCENARIOS: Readonly<Record<string, RelationshipFactorScenario>> = {
  'orientation.male_female': ORIENTATION_COMPATIBILITY_SCENARIOS.male_female,
  'orientation.female_male': ORIENTATION_COMPATIBILITY_SCENARIOS.female_male,
  'orientation.male_male': ORIENTATION_COMPATIBILITY_SCENARIOS.male_male,
  'orientation.female_female': ORIENTATION_COMPATIBILITY_SCENARIOS.female_female,
  currentlySingle: CURRENTLY_SINGLE_SCENARIO,
  relationshipWillingness: RELATIONSHIP_WILLINGNESS_SCENARIO,
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isRepositoryRelativePath(value: string): boolean {
  return value.length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('\\') &&
    !/^[A-Za-z]:/.test(value) &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
}

/**
 * Release-time integrity validation for the relationship evidence layer.
 * It accepts an injectable snapshot so the failure boundaries can be tested
 * without mutating the module-level registry.
 */
export const RELATIONSHIP_DATA_SNAPSHOT: RelationshipDataValidationSnapshot = {
  scenarioVersion: RELATIONSHIP_SCENARIO_VERSION,
  dataVersion: RELATIONSHIP_DATA_VERSION,
  evidenceRetrievedAt: RELATIONSHIP_EVIDENCE_RETRIEVED_AT,
  sources: RELATIONSHIP_EVIDENCE_SOURCES,
  scenarios: RELATIONSHIP_FACTOR_SCENARIOS,
}

export function validateRelationshipData(
  buildDate: string,
  snapshot: RelationshipDataValidationSnapshot = RELATIONSHIP_DATA_SNAPSHOT,
): RelationshipDataValidationResult {
  const issues: RelationshipDataValidationIssue[] = []
  const issue = (path: string, message: string): void => {
    issues.push({ path, message })
  }

  const validBuildDate = isIsoDate(buildDate)
  if (!validBuildDate) issue('buildDate', '构建日期必须是有效的 YYYY-MM-DD 日期')
  if (!/^\d+\.\d+\.\d+$/.test(snapshot.scenarioVersion)) {
    issue('scenarioVersion', '关系情境版本必须使用语义版本号')
  }
  const dataVersionDate = snapshot.dataVersion.replace(/\./g, '-')
  if (!/^\d{4}\.\d{2}\.\d{2}$/.test(snapshot.dataVersion) || !isIsoDate(dataVersionDate)) {
    issue('dataVersion', '关系数据版本必须是有效的 YYYY.MM.DD 日期')
  } else if (validBuildDate && dataVersionDate > buildDate) {
    issue('dataVersion', '关系数据版本不能晚于构建日期')
  }
  if (!isIsoDate(snapshot.evidenceRetrievedAt)) {
    issue('evidenceRetrievedAt', '关系证据检索日期必须是有效的 YYYY-MM-DD 日期')
  } else if (validBuildDate && snapshot.evidenceRetrievedAt > buildDate) {
    issue('evidenceRetrievedAt', '关系证据检索日期不能晚于构建日期')
  }

  const sourceIds = new Set<string>()
  const usedSourceIds = new Set<string>()
  snapshot.sources.forEach((source, index) => {
    const path = `sources[${index}]`
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source.id)) {
      issue(`${path}.id`, '来源 ID 必须是非空的小写 kebab-case')
    }
    if (sourceIds.has(source.id)) issue(`${path}.id`, `来源 ID 重复：${source.id}`)
    sourceIds.add(source.id)

    if (source.title.trim().length === 0) issue(`${path}.title`, '来源标题不能为空')
    if (source.publisher.trim().length === 0) issue(`${path}.publisher`, '发布方不能为空')
    if (source.applicablePopulation.trim().length === 0) {
      issue(`${path}.applicablePopulation`, '适用人群不能为空')
    }
    if (source.measure.trim().length === 0) issue(`${path}.measure`, '测量对象不能为空')
    if (source.limitations.length === 0 || source.limitations.some((item) => item.trim().length === 0)) {
      issue(`${path}.limitations`, '至少需要一条非空局限说明')
    }

    if (!isIsoDate(source.retrievedAt)) {
      issue(`${path}.retrievedAt`, '来源检索日期必须是有效的 YYYY-MM-DD 日期')
    } else {
      if (validBuildDate && source.retrievedAt > buildDate) {
        issue(`${path}.retrievedAt`, '来源检索日期不能晚于构建日期')
      }
      if (isIsoDate(snapshot.evidenceRetrievedAt) && source.retrievedAt > snapshot.evidenceRetrievedAt) {
        issue(`${path}.retrievedAt`, '来源检索日期不能晚于关系证据总检索日期')
      }
      if (!Number.isInteger(source.year) || source.year < 1900 || source.year > Number(source.retrievedAt.slice(0, 4))) {
        issue(`${path}.year`, '来源年份必须是不晚于检索年份的合理整数')
      }
    }

    if (source.kind === 'study') {
      if (source.url == null || !source.url.startsWith('https://')) {
        issue(`${path}.url`, '研究来源必须提供 HTTPS URL')
      } else {
        try {
          const parsedUrl = new URL(source.url)
          if (parsedUrl.protocol !== 'https:') issue(`${path}.url`, '研究来源必须使用 HTTPS')
        } catch {
          issue(`${path}.url`, '研究来源 URL 无效')
        }
      }
      if (source.documentPath != null) issue(`${path}.documentPath`, '研究来源不能伪装成本地分析文档')
    } else if (source.kind === 'analyst_scenario') {
      if (source.url != null) issue(`${path}.url`, '分析者情境不能伪装成外部研究 URL')
      if (source.documentPath == null || !isRepositoryRelativePath(source.documentPath)) {
        issue(`${path}.documentPath`, '分析者情境必须提供无路径穿越的仓库相对 documentPath')
      }
    } else {
      issue(`${path}.kind`, '未知的关系来源类型')
    }
  })

  const scenarioIds = Object.keys(snapshot.scenarios)
  for (const expectedId of EXPECTED_SCENARIO_IDS) {
    if (!(expectedId in snapshot.scenarios)) issue(`scenarios.${expectedId}`, '缺少必要关系情境')
  }
  for (const scenarioId of scenarioIds) {
    if (!(EXPECTED_SCENARIO_IDS as readonly string[]).includes(scenarioId)) {
      issue(`scenarios.${scenarioId}`, '存在未登记的关系情境 ID')
    }
    const scenario = snapshot.scenarios[scenarioId]
    const values = [scenario.range.lower, scenario.range.reference, scenario.range.upper]
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
      scenario.range.lower > scenario.range.reference || scenario.range.reference > scenario.range.upper) {
      issue(`scenarios.${scenarioId}.range`, '情境比例必须有限、位于 0–1 且满足下界 ≤ 参考值 ≤ 上界')
    }
    if (!['C', 'D', 'NA'].includes(scenario.evidenceGrade)) {
      issue(`scenarios.${scenarioId}.evidenceGrade`, '未知的关系证据等级')
    }
    if (scenario.sourceIds.length === 0) issue(`scenarios.${scenarioId}.sourceIds`, '情境必须引用至少一个来源')
    for (const sourceId of scenario.sourceIds) {
      usedSourceIds.add(sourceId)
      if (!sourceIds.has(sourceId)) {
        issue(`scenarios.${scenarioId}.sourceIds`, `引用了未登记来源：${sourceId}`)
      }
    }
    if (scenario.applicablePopulation.trim().length === 0 || scenario.basis.trim().length === 0) {
      issue(`scenarios.${scenarioId}`, '情境必须说明适用人群和依据')
    }
    if (scenario.limitations.length === 0 || scenario.limitations.some((item) => item.trim().length === 0)) {
      issue(`scenarios.${scenarioId}.limitations`, '情境至少需要一条非空局限说明')
    }
  }
  for (const sourceId of sourceIds) {
    if (!usedSourceIds.has(sourceId)) issue(`sources.${sourceId}`, '来源已登记但未被任何关系情境引用')
  }

  return {
    valid: issues.length === 0,
    sourceCount: snapshot.sources.length,
    scenarioCount: scenarioIds.length,
    issues,
  }
}
