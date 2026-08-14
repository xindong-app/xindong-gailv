import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

interface CountsBySex {
  total: number
  male: number
  female: number
}

interface SourceRow {
  age: number
  population: CountsBySex
  junior_college: CountsBySex
  bachelor: CountsBySex
  master: CountsBySex
  doctorate: CountsBySex
}

interface SourceDataset {
  dataVersion: string
  rows: SourceRow[]
}

const sourcePath = fileURLToPath(new URL('../src/data/education-by-age.json', import.meta.url))
const runtimePath = fileURLToPath(new URL('../src/data/education-runtime.json', import.meta.url))
const source = JSON.parse(readFileSync(sourcePath, 'utf8')) as SourceDataset

// The authoritative file keeps provenance, totals, and five-year source checks.
// Production needs only the exact male/female integer cells. Totals are derived
// from the same cells at runtime, so the compact projection loses no model data.
const runtime = {
  dataVersion: source.dataVersion,
  columns: [
    'age',
    'population_male', 'population_female',
    'junior_college_male', 'junior_college_female',
    'bachelor_male', 'bachelor_female',
    'master_male', 'master_female',
    'doctorate_male', 'doctorate_female',
  ],
  rows: source.rows.map((row) => [
    row.age,
    row.population.male, row.population.female,
    row.junior_college.male, row.junior_college.female,
    row.bachelor.male, row.bachelor.female,
    row.master.male, row.master.female,
    row.doctorate.male, row.doctorate.female,
  ]),
}

writeFileSync(runtimePath, `${JSON.stringify(runtime)}\n`, 'utf8')
console.log(`Generated ${runtime.rows.length} education runtime rows -> ${runtimePath}`)
