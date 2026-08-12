import { performance } from 'node:perf_hooks'
import { computeModel } from '../src/engine/modelEngine'
import evidenceRegistryJson from '../src/data/evidence-registry.json'
import { parseEvidenceRegistry, validateEvidenceRegistry } from '../src/data/evidence'
import { DIMENSION_REGISTRY } from '../src/model/dimensions'
import { validatePopulationTable } from '../src/data/population'
import { GOLDEN_SCENARIOS } from '../tests/model/scenarios'

const buildDate = process.env.BUILD_DATE ?? new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date())

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

const timings: number[] = []
for (const scenario of GOLDEN_SCENARIOS) {
  const start = performance.now()
  const result = computeModel(scenario.input)
  timings.push(performance.now() - start)
  if (!Number.isFinite(result.population.estimate) || result.population.estimate < 0 || result.population.estimate > result.population.base) {
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
