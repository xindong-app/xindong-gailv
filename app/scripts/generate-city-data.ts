import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import citySources from '../src/data/city-population-sources.json'
import evidenceRegistry from '../src/data/evidence-registry.json'

type CitySource = (typeof citySources.entries)[number]

const names = new Set<string>()
const evidenceIds = new Set<string>()
for (const city of citySources.entries) {
  if (names.has(city.name)) throw new Error(`重复城市名称：${city.name}`)
  if (evidenceIds.has(city.sourceEvidenceId)) throw new Error(`重复城市证据ID：${city.sourceEvidenceId}`)
  if (!(city.popWan > 0) || !Number.isInteger(city.populationYear)) {
    throw new Error(`城市人口值或年份非法：${city.name}`)
  }
  names.add(city.name)
  evidenceIds.add(city.sourceEvidenceId)
}

const runtime = {
  dataVersion: citySources.dataVersion,
  entries: citySources.entries.map((city) => ({
    name: city.name,
    province: city.province,
    pop: city.popWan,
    wage: city.wage,
    ...(city.hot ? { hot: true } : {}),
    mainEstimateStatus: 'included_estimate' as const,
    populationYear: city.populationYear,
    sourceEvidenceId: city.sourceEvidenceId,
  })),
}

const transformFor = (city: CitySource) => [
  `城市18—50岁基础池（人）=2020七普目标年龄×性别人数×${city.popWan}万人÷140,977.8724万人；`,
  '即城市官方年末常住人口×（2020七普目标年龄×性别人数÷1,409,778,724人）。',
  '2025全国人口只作宏观校准，不参与该比例；不再额外乘全国城镇化率。',
].join('')

const cityEvidence = citySources.entries.map((city) => ({
  id: city.sourceEvidenceId,
  dimensionId: 'base.region',
  dimensionName: `${city.name}市常住人口`,
  definition: `${city.populationYear}年末${city.geography}常住人口。`,
  classification: 'hard',
  applicablePopulation: `${city.name}市常住人口`,
  geography: city.geography,
  ageRange: { min: 0, max: null },
  sexBasis: 'both',
  dataYear: `${city.populationYear}-year-end`,
  publisher: city.publisher,
  sourceTitle: city.sourceTitle,
  sourceUrl: city.sourceUrl,
  retrievedAt: citySources.retrievedAt,
  denominator: `${city.geography}常住人口`,
  directValue: city.directValue,
  transformation: transformFor(city),
  adjustments: [],
  estimate: {
    baseline: city.popWan,
    optimistic: city.popWan,
    conservative: city.popWan,
    unit: 'wan',
  },
  grade: 'A',
  limitations: city.limitations,
  modelVersion: evidenceRegistry.modelVersion,
  dataVersion: citySources.dataVersion,
  modelUse: 'anchor',
}))

const isCityAnchor = (entry: (typeof evidenceRegistry.entries)[number]) =>
  entry.dimensionId === 'base.region' && entry.modelUse === 'anchor'
const firstCityAnchorIndex = evidenceRegistry.entries.findIndex(isCityAnchor)
const insertionIndex = evidenceRegistry.entries
  .slice(0, firstCityAnchorIndex < 0 ? evidenceRegistry.entries.length : firstCityAnchorIndex)
  .filter((entry) => !isCityAnchor(entry)).length
const nonCityEvidence = evidenceRegistry.entries.filter((entry) => !isCityAnchor(entry))
const versionAlignedNonCityEvidence = nonCityEvidence.map((entry) => ({
  ...entry,
  dataVersion: citySources.dataVersion,
}))
const updatedRegistry = {
  ...evidenceRegistry,
  dataVersion: citySources.dataVersion,
  retrievedAt: citySources.retrievedAt,
  entries: [
    ...versionAlignedNonCityEvidence.slice(0, insertionIndex),
    ...cityEvidence,
    ...versionAlignedNonCityEvidence.slice(insertionIndex),
  ],
}

writeFileSync(
  resolve(process.cwd(), 'src/data/city-runtime.json'),
  `${JSON.stringify(runtime)}\n`,
  'utf8',
)
writeFileSync(
  resolve(process.cwd(), 'src/data/evidence-registry.json'),
  `${JSON.stringify(updatedRegistry, null, 2)}\n`,
  'utf8',
)
console.log(`Generated ${runtime.entries.length} runtime cities and ${cityEvidence.length} city evidence records`)
