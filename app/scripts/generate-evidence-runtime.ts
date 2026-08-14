import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import evidenceRegistry from '../src/data/evidence-registry.json'
import { projectEvidenceRuntime } from './evidence-runtime-projection'

const projection = projectEvidenceRuntime(evidenceRegistry)

const target = resolve(process.cwd(), 'src/data/evidence-runtime.json')
writeFileSync(target, `${JSON.stringify(projection, null, 2)}\n`, 'utf8')
console.log(`Generated ${projection.entries.length} runtime evidence records at ${target}`)
