import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import registry from '../src/data/dimension-probability-registry.json'
import {
  projectDimensionProbabilityRuntime,
  type FullDimensionProbabilityRegistry,
} from './dimension-probability-runtime-projection'

const outputPath = fileURLToPath(new URL('../src/data/dimension-probability-runtime.json', import.meta.url))
const runtime = projectDimensionProbabilityRuntime(registry as FullDimensionProbabilityRegistry)

await writeFile(outputPath, `${JSON.stringify(runtime)}\n`, 'utf8')
console.log(`Generated ${runtime.e.length} compact dimension probability policies at ${outputPath}`)
