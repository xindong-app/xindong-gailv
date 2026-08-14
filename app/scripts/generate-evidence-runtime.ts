import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import evidenceRegistry from '../src/data/evidence-registry.json'

const projection = {
  dataVersion: evidenceRegistry.dataVersion,
  modelVersion: evidenceRegistry.modelVersion,
  retrievedAt: evidenceRegistry.retrievedAt,
  entries: evidenceRegistry.entries.map((entry) => ({
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

const target = resolve(process.cwd(), 'src/data/evidence-runtime.json')
writeFileSync(target, `${JSON.stringify(projection, null, 2)}\n`, 'utf8')
console.log(`Generated ${projection.entries.length} runtime evidence records at ${target}`)
