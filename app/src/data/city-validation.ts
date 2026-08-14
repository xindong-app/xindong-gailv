import cityTierRosterJson from './city-tier-roster.json'
import cityPopulationSourcesJson from './city-population-sources.json'
import { CITIES, CITY_DATA_VERSION } from './cities'
import { EVIDENCE_REGISTRY } from './evidence-validation'

type CityTierRoster = {
  schemaVersion: number
  dataVersion: string
  rosterId: string
  publishedAt: string
  retrievedAt: string
  publisher: string
  sourceTitle: string
  sourceUrl: string
  sourceImageUrl: string
  sourceImageSha256: string
  latestMethodNotice: {
    publishedAt: string
    sourceUrl: string
    note: string
  }
  classificationStatus: string
  tiers: {
    first: string[]
    newFirst: string[]
    second: string[]
  }
  retainedAdditionalCities: string[]
  selectionPolicy: string
}

export const CITY_TIER_ROSTER = cityTierRosterJson as CityTierRoster
const CITY_POPULATION_SOURCES = cityPopulationSourcesJson

export interface CityRosterValidation {
  valid: boolean
  issues: string[]
  rosterCityCount: number
  selectableCityCount: number
  supportedCityCount: number
  evidenceCityCount: number
}

function isOfficialGovernmentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'gov.cn' || url.hostname.endsWith('.gov.cn'))
  } catch {
    return false
  }
}

/**
 * Release gate for city coverage and provenance.
 *
 * The commercial tier list controls only which cities must be selectable. A
 * city's numeric anchor is accepted only when its own evidence entry points to
 * a government/statistics-bureau HTTPS source and exactly matches the runtime
 * resident-population value.
 */
export function validateCityRoster(): CityRosterValidation {
  const issues: string[] = []
  const tiers = CITY_TIER_ROSTER.tiers
  const rosterNames = [...tiers.first, ...tiers.newFirst, ...tiers.second]
  const expectedSelectableNames = [...rosterNames, ...CITY_TIER_ROSTER.retainedAdditionalCities]
  const selectableNames = CITIES.map((city) => city.name)
  const rosterNameSet = new Set(rosterNames)
  const expectedSelectableNameSet = new Set(expectedSelectableNames)
  const selectableNameSet = new Set(selectableNames)

  if (CITY_TIER_ROSTER.schemaVersion !== 1) issues.push('roster schemaVersion')
  if (CITY_TIER_ROSTER.dataVersion !== EVIDENCE_REGISTRY.dataVersion) issues.push('roster dataVersion')
  if (CITY_POPULATION_SOURCES.schemaVersion !== 1) issues.push('city source schemaVersion')
  if (CITY_POPULATION_SOURCES.dataVersion !== EVIDENCE_REGISTRY.dataVersion ||
      CITY_DATA_VERSION !== EVIDENCE_REGISTRY.dataVersion) {
    issues.push('city dataVersion')
  }
  if (CITY_POPULATION_SOURCES.rosterId !== CITY_TIER_ROSTER.rosterId ||
      CITY_POPULATION_SOURCES.populationBasis !== 'year_end_resident_population' ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.status !== 'registered_but_unused' ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.currentProxyCityCount !== 0 ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.priority.join('|') !== [
        'latest_official_city_resident_population',
        'prior_year_official_city_resident_population',
        'comparable_city_proxy_scenario',
      ].join('|') ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.proxyRequirements.maximumEvidenceGrade !== 'D' ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.proxyRequirements.mustNameReferenceCities !== true ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.proxyRequirements.mustExplainMatch !== true ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.proxyRequirements.mustUseWideRange !== true ||
      CITY_POPULATION_SOURCES.futureMissingAnchorPolicy.proxyRequirements.mustNotPresentAsOfficialPointEstimate !== true ||
      CITY_POPULATION_SOURCES.structurePolicy.method !== 'national_2020_age_sex_share' ||
      CITY_POPULATION_SOURCES.structurePolicy.evidenceGrade !== 'C' ||
      CITY_POPULATION_SOURCES.structurePolicy.conservativeMultiplier !== 0.7 ||
      CITY_POPULATION_SOURCES.structurePolicy.optimisticMultiplier !== 1.3 ||
      CITY_POPULATION_SOURCES.structurePolicy.isConfidenceInterval !== false) {
    issues.push('city source policy')
  }
  if (CITY_TIER_ROSTER.rosterId !== 'yicai-city-tier-2025-05-28') issues.push('roster id')
  if (tiers.first.length !== 4 || tiers.newFirst.length !== 15 || tiers.second.length !== 30) {
    issues.push('roster tier counts')
  }
  if (rosterNameSet.size !== 49 || rosterNameSet.size !== rosterNames.length) {
    issues.push('roster uniqueness')
  }
  if (!CITY_TIER_ROSTER.sourceUrl.startsWith('https://www.yicai.com/') ||
      !CITY_TIER_ROSTER.sourceImageUrl.startsWith('https://imgcdn.yicai.com/') ||
      CITY_TIER_ROSTER.sourceImageSha256 !==
        '3510B5BEBA917D562E51A01DA8F87173C3748C0BE5E952B13C0496D652023986') {
    issues.push('roster source')
  }
  if (CITY_TIER_ROSTER.latestMethodNotice.publishedAt !== '2026-05-28' ||
      !CITY_TIER_ROSTER.latestMethodNotice.note.includes('不再发布')) {
    issues.push('2026 no-ranking notice')
  }
  if (CITY_TIER_ROSTER.classificationStatus !==
      'commercial_roster_not_official_administrative_classification') {
    issues.push('roster classification status')
  }
  if (expectedSelectableNameSet.size !== expectedSelectableNames.length ||
      selectableNameSet.size !== selectableNames.length) {
    issues.push('selectable city uniqueness')
  }
  for (const name of expectedSelectableNameSet) {
    if (!selectableNameSet.has(name)) issues.push(`missing selectable city:${name}`)
  }
  for (const name of selectableNameSet) {
    if (!expectedSelectableNameSet.has(name)) issues.push(`undeclared selectable city:${name}`)
  }

  const evidenceById = new Map(EVIDENCE_REGISTRY.entries.map((entry) => [entry.id, entry]))
  const sourceByName = new Map(CITY_POPULATION_SOURCES.entries.map((entry) => [entry.name, entry]))
  if (sourceByName.size !== CITY_POPULATION_SOURCES.entries.length ||
      sourceByName.size !== expectedSelectableNameSet.size) {
    issues.push('city source uniqueness/count')
  }
  const cityEvidenceIds = new Set<string>()
  for (const city of CITIES) {
    if (city.mainEstimateStatus !== 'included_estimate' || city.pop <= 0) {
      issues.push(`unquantified selectable city:${city.name}`)
      continue
    }
    const source = sourceByName.get(city.name)
    if (source == null || source.popWan !== city.pop || source.populationYear !== city.populationYear ||
        source.sourceEvidenceId !== city.sourceEvidenceId || source.province !== city.province ||
        source.wage !== city.wage || Boolean(source.hot) !== Boolean(city.hot)) {
      issues.push(`city runtime/source mismatch:${city.name}`)
      continue
    }
    if (!isOfficialGovernmentUrl(source.sourceUrl) || source.publisher.length === 0 ||
        source.sourceTitle.length === 0 || source.directValue.length === 0 ||
        source.limitations.length === 0) {
      issues.push(`city source provenance:${city.name}`)
    }
    if (cityEvidenceIds.has(city.sourceEvidenceId)) {
      issues.push(`duplicate city evidence id:${city.sourceEvidenceId}`)
    }
    cityEvidenceIds.add(city.sourceEvidenceId)
    const evidence = evidenceById.get(city.sourceEvidenceId)
    if (evidence == null) {
      issues.push(`missing city evidence:${city.name}`)
      continue
    }
    const estimate = evidence.estimate
    if (evidence.dimensionId !== 'base.region' || evidence.modelUse !== 'anchor' ||
        evidence.grade !== 'A' || estimate.unit !== 'wan' ||
        estimate.baseline !== city.pop || estimate.conservative !== city.pop ||
        estimate.optimistic !== city.pop) {
      issues.push(`city value/evidence mismatch:${city.name}`)
    }
    if (!evidence.dataYear.startsWith(String(city.populationYear)) ||
        evidence.geography !== source.geography || evidence.publisher !== source.publisher ||
        evidence.sourceTitle !== source.sourceTitle || evidence.sourceUrl !== source.sourceUrl ||
        evidence.directValue !== source.directValue ||
        (!evidence.publisher.includes('统计') && !evidence.publisher.includes('人民政府')) ||
        !isOfficialGovernmentUrl(evidence.sourceUrl)) {
      issues.push(`city provenance mismatch:${city.name}`)
    }
    if (!evidence.transformation.includes('140,977.8724万人') ||
        !evidence.transformation.includes('1,409,778,724人') ||
        !evidence.transformation.includes('不参与该比例')) {
      issues.push(`city transformation mismatch:${city.name}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    rosterCityCount: rosterNameSet.size,
    selectableCityCount: CITIES.length,
    supportedCityCount: CITIES.length,
    evidenceCityCount: cityEvidenceIds.size,
  }
}
