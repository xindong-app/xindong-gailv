import { performance } from 'node:perf_hooks'
import { computeModel } from '../src/engine/modelEngine'
import evidenceRegistryJson from '../src/data/evidence-registry.json'
import { parseEvidenceRegistry, validateEvidenceRegistry } from '../src/data/evidence-validation'
import runtimeEvidenceRegistry from '../src/data/evidence-runtime.json'
import { DIMENSION_REGISTRY } from '../src/model/dimensions'
import {
  CENSUS_2020_MAINLAND_POPULATION_WAN,
  NATIONAL_POPULATION_WAN,
  validatePopulationTable,
} from '../src/data/population'
import { CITIES } from '../src/data/cities'
import {
  isCityMainEstimateSupported,
  POPULATION_QUANTIFICATION_POLICY,
} from '../src/data/population-policy'
import { GOLDEN_SCENARIOS } from '../tests/model/scenarios'
import { validateRelationshipData } from '../src/data/relationship'

const buildDate = process.env.BUILD_DATE ?? new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

const relationshipData = validateRelationshipData(buildDate)
if (!relationshipData.valid) {
  console.error('Relationship evidence and scenario validation failed', relationshipData.issues)
  process.exitCode = 1
} else {
  console.log(`Relationship evidence: ${relationshipData.sourceCount} sources; ${relationshipData.scenarioCount} scenarios; versions, dates, URLs, document paths and source references valid`)
}

// This is the release entry point, so validate against the real/injected build
// date instead of trusting the registry's own date as its ceiling.
parseEvidenceRegistry(evidenceRegistryJson, buildDate)
console.log(`Evidence retrieval dates: no later than build date ${buildDate}`)

const evidence = validateEvidenceRegistry()
if (!evidence.valid) {
  console.error('Evidence registry validation failed', evidence)
  process.exitCode = 1
} else {
  console.log(`Evidence registry: ${evidence.entries} entries; A=${evidence.gradeCounts.A}, B=${evidence.gradeCounts.B}, C=${evidence.gradeCounts.C}, D=${evidence.gradeCounts.D}; excluded=${evidence.excludedEntries}`)
}

const runtimeProjection = {
  dataVersion: evidenceRegistryJson.dataVersion,
  modelVersion: evidenceRegistryJson.modelVersion,
  retrievedAt: evidenceRegistryJson.retrievedAt,
  entries: evidenceRegistryJson.entries.map((entry) => ({
    id: entry.id,
    dimensionId: entry.dimensionId,
    grade: entry.grade,
    modelUse: entry.modelUse,
    sourceTitle: entry.sourceTitle,
    sourceUrl: entry.sourceUrl,
    publisher: entry.publisher,
    dataYear: entry.dataYear,
  })),
}
if (JSON.stringify(runtimeEvidenceRegistry) !== JSON.stringify(runtimeProjection)) {
  console.error('Runtime evidence projection is stale; run npm run generate:evidence-runtime')
  process.exitCode = 1
} else {
  console.log(`Runtime evidence projection: ${runtimeProjection.entries.length} entries synchronized with full registry`)
}

const population = validatePopulationTable()
if (!population.valid) {
  console.error('Population table validation failed', population)
  process.exitCode = 1
} else {
  console.log(`Population table: ${population.rowCount} direct single-age rows; total=${population.totals.total.toLocaleString('en-US')}; male+female conserved`)
}

const dimensionIds = DIMENSION_REGISTRY.map((dimension) => dimension.id)
if (new Set(dimensionIds).size !== dimensionIds.length) {
  console.error('Dimension registry contains duplicate ids')
  process.exitCode = 1
} else {
  console.log(`Dimension registry: ${dimensionIds.length} unique entries`)
}

const evidenceIds = new Set(evidenceRegistryJson.entries.map((entry) => entry.id))
const dimensionsById = new Map(DIMENSION_REGISTRY.map((dimension) => [dimension.id, dimension]))
const expectedScenarioMethods: Readonly<Record<string, string>> = {
  'base.region': 'city_structure_multiplier',
  'base.marital': 'five_year_group_mapping',
  'appearance.height': 'height_parameter_endpoints',
  'lifestyle.smoking': 'all_age_to_target_age_multiplier',
  'lifestyle.drinking': 'drinking_raking_endpoints',
}
const invalidPopulationPolicies = Object.entries(POPULATION_QUANTIFICATION_POLICY).filter(([dimensionId, policy]) => {
  const dimension = dimensionsById.get(dimensionId)
  const range = policy.scenarioRange
  const multiplierMethod = policy.scenarioMethod === 'city_structure_multiplier' ||
    policy.scenarioMethod === 'all_age_to_target_age_multiplier'
  return policy.dimensionId !== dimensionId || dimension == null ||
    policy.evidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId)) ||
    dimension.populationUse !== (policy.mainEstimateEffect === 'apply' ? 'included' : 'unquantified') ||
    (expectedScenarioMethods[dimensionId] != null &&
      policy.scenarioMethod !== expectedScenarioMethods[dimensionId]) ||
    multiplierMethod !== (range != null) ||
    (policy.mainEstimateEffect === 'do_not_apply' && policy.scenarioMethod !== 'not_applied') ||
    (range != null && (
      range.isConfidenceInterval !== false ||
      range.conservativeMultiplier < 0 || range.conservativeMultiplier > 1 ||
      range.optimisticMultiplier < 1
    ))
})
const includedDimensionsWithoutPolicy = DIMENSION_REGISTRY.filter(
  (dimension) => dimension.populationUse === 'included' &&
    POPULATION_QUANTIFICATION_POLICY[dimension.id]?.mainEstimateEffect !== 'apply',
)
if (invalidPopulationPolicies.length > 0 || includedDimensionsWithoutPolicy.length > 0) {
  console.error('Population quantification policy validation failed', {
    invalidPopulationPolicies: invalidPopulationPolicies.map(([dimensionId]) => dimensionId),
    includedDimensionsWithoutPolicy: includedDimensionsWithoutPolicy.map((dimension) => dimension.id),
  })
  process.exitCode = 1
} else {
  console.log(`Population quantification policy: ${Object.keys(POPULATION_QUANTIFICATION_POLICY).length} policies traceable and dimension-aligned`)
}

const invalidCityPolicies = CITIES.filter((city) => {
  if (city.mainEstimateStatus === 'included_estimate') {
    return city.populationStatus !== 'official_resident_anchor' || city.pop <= 0 ||
      city.sourceEvidenceId == null || !evidenceIds.has(city.sourceEvidenceId) ||
      city.populationSourceUrl == null || !city.populationSourceUrl.startsWith('https://')
  }
  return city.populationStatus !== 'unsupported' || city.pop !== 0 || city.sourceEvidenceId != null ||
    city.populationSourceUrl != null || isCityMainEstimateSupported(city.name)
})
if (invalidCityPolicies.length > 0) {
  console.error('City population policy validation failed', invalidCityPolicies.map((city) => city.name))
  process.exitCode = 1
} else {
  const supportedCities = CITIES.filter((city) => isCityMainEstimateSupported(city.name)).length
  console.log(`City population policy: ${supportedCities} supported official resident anchors; ${CITIES.length - supportedCities} explicitly unavailable`)
}

const censusDenominatorEvidence = evidenceRegistryJson.entries.find(
  (entry) => entry.id === 'evidence.base.region.census-mainland-total-2020',
)
const national2025CalibrationEvidence = evidenceRegistryJson.entries.find(
  (entry) => entry.id === 'evidence.base.region.population-2025',
)
const supportedCityEvidence = CITIES
  .filter((city) => city.mainEstimateStatus === 'included_estimate')
  .map((city) => ({
    city,
    evidence: evidenceRegistryJson.entries.find((entry) => entry.id === city.sourceEvidenceId),
  }))
const censusDenominatorAligned =
  censusDenominatorEvidence?.estimate.unit === 'people' &&
  censusDenominatorEvidence.estimate.baseline === CENSUS_2020_MAINLAND_POPULATION_WAN * 10_000 &&
  censusDenominatorEvidence.estimate.optimistic === censusDenominatorEvidence.estimate.baseline &&
  censusDenominatorEvidence.estimate.conservative === censusDenominatorEvidence.estimate.baseline &&
  censusDenominatorEvidence.modelUse === 'direct'
const national2025CalibrationAligned =
  national2025CalibrationEvidence?.estimate.baseline === NATIONAL_POPULATION_WAN * 10_000 &&
  national2025CalibrationEvidence.modelUse === 'calibration' &&
  national2025CalibrationEvidence.transformation.includes('不以本条为分母')
const cityTransformationsAligned = supportedCityEvidence.every(({ evidence: cityEvidence }) =>
  cityEvidence?.modelUse === 'anchor' &&
  cityEvidence.transformation.includes('141,177.8724万人') &&
  cityEvidence.transformation.includes('1,411,778,724人') &&
  cityEvidence.transformation.includes('2025全国人口只作宏观校准') &&
  cityEvidence.transformation.includes('不参与该比例'),
)
if (!censusDenominatorAligned || !national2025CalibrationAligned || !cityTransformationsAligned) {
  console.error('Census city-scaling denominator alignment failed', {
    censusDenominatorAligned,
    national2025CalibrationAligned,
    invalidCityTransformations: supportedCityEvidence
      .filter(({ evidence: cityEvidence }) => cityEvidence == null ||
        !cityEvidence.transformation.includes('141,177.8724万人') ||
        !cityEvidence.transformation.includes('1,411,778,724人') ||
        !cityEvidence.transformation.includes('2025全国人口只作宏观校准') ||
        !cityEvidence.transformation.includes('不参与该比例'))
      .map(({ city }) => city.name),
  })
  process.exitCode = 1
} else {
  console.log(`Census city-scaling denominator: ${CENSUS_2020_MAINLAND_POPULATION_WAN.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} wan; 2025 national total is calibration-only; ${supportedCityEvidence.length} city transformations aligned`)
}

const timings: number[] = []
for (const scenario of GOLDEN_SCENARIOS) {
  const start = performance.now()
  const result = computeModel(scenario.input)
  timings.push(performance.now() - start)
  if (result.population.status === 'unavailable' || !Number.isFinite(result.population.estimate) ||
    result.population.estimate < 0 || result.population.estimate > result.population.base ||
    result.population.range.conservative > result.population.estimate ||
    result.population.range.optimistic < result.population.estimate ||
    result.groups.some((group) => group.after > group.before + 1e-6 || group.factor < 0 || group.factor > 1)) {
    console.error(`Invalid scenario result: ${scenario.id}`, result.population)
    process.exitCode = 1
  }
  console.log([
    scenario.id.padEnd(18),
    `base=${Math.round(result.population.base).toLocaleString('en-US').padStart(14)}`,
    `estimate=${Math.round(result.population.estimate).toLocaleString('en-US').padStart(14)}`,
    `range=${Math.round(result.population.range.conservative).toLocaleString('en-US')}–${Math.round(result.population.range.optimistic).toLocaleString('en-US')}`,
    `confidence=${result.confidence.grade}/${result.confidence.score.toFixed(2)}`,
    `resolution=${result.population.resolutionExceeded ? 'exceeded' : 'ok'}`,
  ].join(' | '))
}
timings.sort((left, right) => left - right)
console.log(`Scenario calculation p95=${timings[Math.floor(timings.length * 0.95)].toFixed(3)}ms`)
