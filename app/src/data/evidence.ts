import { z } from 'zod'
import evidenceRegistryJson from './evidence-registry.json'
import { DIMENSION_BY_ID, type EvidenceGrade } from '../model/dimensions'

const evidenceEstimateSchema = z.object({
  baseline: z.number().finite().nullable(),
  optimistic: z.number().finite().nullable(),
  conservative: z.number().finite().nullable(),
  unit: z.enum(['share', 'people', 'wan', 'cm', 'cny_per_year', 'wan_cny']),
}).strict().refine(
  (estimate) => estimate.conservative == null || estimate.baseline == null || estimate.optimistic == null ||
    (estimate.conservative <= estimate.baseline && estimate.baseline <= estimate.optimistic),
  { message: 'estimate 必须满足 conservative ≤ baseline ≤ optimistic' },
)

export const evidenceEntrySchema = z.object({
  id: z.string().min(1),
  dimensionId: z.string().min(1),
  dimensionName: z.string().min(1),
  definition: z.string().min(1),
  classification: z.enum(['hard', 'correlated_hard', 'soft', 'entertainment']),
  applicablePopulation: z.string().min(1),
  geography: z.string().min(1),
  ageRange: z.object({ min: z.number().int().nullable(), max: z.number().int().nullable() }).strict(),
  sexBasis: z.string().min(1),
  dataYear: z.string().min(1),
  publisher: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: z.iso.date(),
  denominator: z.string().min(1),
  directValue: z.string().min(1),
  transformation: z.string().min(1),
  adjustments: z.array(z.string().min(1)),
  estimate: evidenceEstimateSchema,
  grade: z.enum(['A', 'B', 'C', 'D']),
  limitations: z.array(z.string().min(1)).min(1),
  modelVersion: z.string().min(1),
  dataVersion: z.string().min(1),
  modelUse: z.enum(['direct', 'anchor', 'calibration', 'excluded']),
}).strict()

export const evidenceRegistrySchema = z.object({
  dataVersion: z.string().min(1),
  modelVersion: z.string().min(1),
  retrievedAt: z.iso.date(),
  methodology: z.object({
    scope: z.string().min(1),
    grades: z.record(z.string(), z.string()),
    rules: z.array(z.string().min(1)).min(1),
  }).strict(),
  entries: z.array(evidenceEntrySchema).min(1),
}).strict().superRefine((registry, context) => {
  const ids = new Set<string>()
  for (const [index, entry] of registry.entries.entries()) {
    if (ids.has(entry.id)) {
      context.addIssue({ code: 'custom', message: `重复 evidence id: ${entry.id}`, path: ['entries', index, 'id'] })
    }
    ids.add(entry.id)
    if (entry.ageRange.min != null && entry.ageRange.max != null && entry.ageRange.min > entry.ageRange.max) {
      context.addIssue({ code: 'custom', message: 'ageRange.min 不能大于 max', path: ['entries', index, 'ageRange'] })
    }
    if (!entry.sourceUrl.startsWith('https://')) {
      context.addIssue({ code: 'custom', message: 'sourceUrl 必须使用 HTTPS', path: ['entries', index, 'sourceUrl'] })
    }
    if (entry.modelVersion !== registry.modelVersion || entry.dataVersion !== registry.dataVersion) {
      context.addIssue({ code: 'custom', message: '条目版本必须与顶层版本一致', path: ['entries', index] })
    }
    if (entry.retrievedAt > registry.retrievedAt) {
      context.addIssue({ code: 'custom', message: '条目 retrievedAt 不得晚于登记表构建日期', path: ['entries', index, 'retrievedAt'] })
    }
    if (entry.grade === 'D' && entry.modelUse !== 'excluded') {
      context.addIssue({ code: 'custom', message: 'D 级证据必须 excluded', path: ['entries', index, 'modelUse'] })
    }
    if (entry.modelUse === 'direct' && entry.grade === 'D') {
      context.addIssue({ code: 'custom', message: 'direct 条目不得为 D 级', path: ['entries', index, 'grade'] })
    }
    const shareUnitException = entry.id === 'evidence.economy.car.household-2025' &&
      entry.limitations.some((limitation) => limitation.includes('辆/百户'))
    if (entry.estimate.unit === 'share' && !shareUnitException) {
      for (const key of ['baseline', 'optimistic', 'conservative'] as const) {
        const value = entry.estimate[key]
        if (value != null && (value < 0 || value > 1)) {
          context.addIssue({ code: 'custom', message: 'share 必须在 [0,1]', path: ['entries', index, 'estimate', key] })
        }
      }
    }
  }
})

export type EvidenceEntry = z.infer<typeof evidenceEntrySchema>
export type EvidenceRegistry = z.infer<typeof evidenceRegistrySchema>

/**
 * Parse a candidate registry against a caller-supplied build date. Keeping the
 * date injectable makes the "no future retrieval" release gate deterministic
 * in tests instead of depending on the machine clock.
 */
export function parseEvidenceRegistry(input: unknown, buildDate: string): EvidenceRegistry {
  const registry = evidenceRegistrySchema.parse(input)
  const buildDateResult = z.iso.date().safeParse(buildDate)
  if (!buildDateResult.success) throw buildDateResult.error
  const futureEntries = registry.entries.filter((entry) => entry.retrievedAt > buildDate)
  if (registry.retrievedAt > buildDate || futureEntries.length > 0) {
    throw new Error(`证据 retrievedAt 晚于构建日期 ${buildDate}`)
  }
  return registry
}

export const EVIDENCE_DIMENSION_ALIASES: Readonly<Record<string, string>> = {
  'appearance.bmi': 'appearance.body_type',
  'economy.car': 'economy.vehicle',
  'health.exercise': 'lifestyle.exercise',
  'health.sleep': 'lifestyle.sleep_rhythm',
  'health.teeth': 'appearance.dental_neatness',
  'appearance.hairline': 'appearance.hairline_preference',
  'appearance.gray_hair': 'appearance.gray_hair_preference',
  'soft.intimacy_health': 'relationship.intimacy_health',
  'soft.stamina': 'relationship.stamina',
  'soft.currently_single': 'relationship.currently_single',
  'soft.orientation': 'relationship.orientation_compatible',
  'soft.cooking': 'lifestyle.cooking',
  'soft.family_pension': 'family.parents_pension',
  'soft.only_child': 'family.only_child',
  'soft.in_system': 'career.in_system',
  'soft.tattoo_free': 'appearance.tattoo_preference',
  'soft.mbti': 'entertainment.mbti',
}

// Some source tables directly contain more than one runtime dimension. The
// census single-age table contains total, male and female counts in every row,
// so it directly supports both age and gender even though its primary registry
// dimensionId is base.age.
const EVIDENCE_ID_ADDITIONAL_DIMENSIONS: Readonly<Record<string, readonly string[]>> = {
  'evidence.base.age.census-2020-single-year': ['base.gender'],
}

export const EVIDENCE_REGISTRY: EvidenceRegistry = parseEvidenceRegistry(
  evidenceRegistryJson,
  evidenceRegistryJson.retrievedAt,
)

export function modelDimensionIdForEvidence(entry: EvidenceEntry): string {
  return EVIDENCE_DIMENSION_ALIASES[entry.dimensionId] ?? entry.dimensionId
}

export function evidenceForDimension(dimensionId: string): readonly EvidenceEntry[] {
  return EVIDENCE_REGISTRY.entries.filter((entry) => modelDimensionIdForEvidence(entry) === dimensionId)
}

export function bestEvidenceForDimension(dimensionId: string): EvidenceEntry | null {
  const rank: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1, NA: 0 }
  return evidenceForDimension(dimensionId)
    .filter((entry) => entry.modelUse !== 'excluded')
    .sort((left, right) => rank[right.grade] - rank[left.grade])[0] ?? null
}

/** Exact registry lookup used by UI metadata and runtime-alignment tests. */
export function evidenceById(evidenceId: string): EvidenceEntry | null {
  return EVIDENCE_REGISTRY.entries.find((entry) => entry.id === evidenceId) ?? null
}

/**
 * A dimension may have strong calibration evidence and still depend on a weak
 * runtime transformation. This helper validates the exact evidenceId declared
 * by the dimension rather than promoting it to the strongest related source.
 */
export function declaredEvidenceForDimension(dimensionId: string): EvidenceEntry | null {
  const evidenceId = DIMENSION_BY_ID.get(dimensionId)?.evidenceId
  return evidenceId == null ? null : evidenceById(evidenceId)
}

export interface EvidenceValidationSummary {
  valid: boolean
  entries: number
  gradeCounts: Record<'A' | 'B' | 'C' | 'D', number>
  excludedEntries: number
  unresolvedDimensionIds: string[]
  activeModelDimensionsWithoutEvidence: string[]
  missingDeclaredEvidenceIds: string[]
  populationDimensionsUsingExcludedEvidence: string[]
  overstatedDeclaredGrades: string[]
  declaredClassificationMismatches: string[]
  declaredDimensionMismatches: string[]
}

export function validateEvidenceRegistry(): EvidenceValidationSummary {
  const gradeCounts: Record<'A' | 'B' | 'C' | 'D', number> = { A: 0, B: 0, C: 0, D: 0 }
  const unresolvedDimensionIds = new Set<string>()
  const covered = new Set<string>()
  let excludedEntries = 0
  for (const entry of EVIDENCE_REGISTRY.entries) {
    gradeCounts[entry.grade] += 1
    if (entry.modelUse === 'excluded') excludedEntries += 1
    const dimensionId = modelDimensionIdForEvidence(entry)
    if (!DIMENSION_BY_ID.has(dimensionId)) unresolvedDimensionIds.add(entry.dimensionId)
    else if (entry.modelUse !== 'excluded') covered.add(dimensionId)
  }
  const activeModelDimensionsWithoutEvidence = [...DIMENSION_BY_ID.values()]
    .filter((dimension) => dimension.population && !covered.has(dimension.id))
    .map((dimension) => dimension.id)
  const gradeRank: Record<EvidenceGrade, number> = { A: 4, B: 3, C: 2, D: 1, NA: 0 }
  const missingDeclaredEvidenceIds: string[] = []
  const populationDimensionsUsingExcludedEvidence: string[] = []
  const overstatedDeclaredGrades: string[] = []
  const declaredClassificationMismatches: string[] = []
  const declaredDimensionMismatches: string[] = []
  for (const dimension of DIMENSION_BY_ID.values()) {
    if (dimension.evidenceId == null) continue
    const declared = EVIDENCE_REGISTRY.entries.find((entry) => entry.id === dimension.evidenceId)
    if (declared == null) {
      missingDeclaredEvidenceIds.push(`${dimension.id}:${dimension.evidenceId}`)
      continue
    }
    if (dimension.population && declared.modelUse === 'excluded') {
      populationDimensionsUsingExcludedEvidence.push(dimension.id)
    }
    if (gradeRank[dimension.evidenceGrade] > gradeRank[declared.grade]) {
      overstatedDeclaredGrades.push(`${dimension.id}:${dimension.evidenceGrade}>${declared.grade}`)
    }
    const expectedClassification = dimension.classification === 'hard_filter'
      ? 'hard'
      : dimension.classification === 'soft_preference'
        ? 'soft'
        : dimension.classification
    // An excluded entry documents why a former hard field was moved to soft;
    // that historical classification is allowed only when the runtime route is
    // non-population and the entry itself is explicitly excluded.
    const excludedSoftMigration = dimension.classification === 'soft_preference' &&
      !dimension.population && declared.modelUse === 'excluded'
    if (declared.classification !== expectedClassification && !excludedSoftMigration) {
      declaredClassificationMismatches.push(`${dimension.id}:${dimension.classification}!=${declared.classification}`)
    }
    const supportedDimensions = [
      modelDimensionIdForEvidence(declared),
      ...(EVIDENCE_ID_ADDITIONAL_DIMENSIONS[declared.id] ?? []),
    ]
    if (!supportedDimensions.includes(dimension.id)) {
      declaredDimensionMismatches.push(`${dimension.id}!=${modelDimensionIdForEvidence(declared)}`)
    }
  }
  return {
    valid: unresolvedDimensionIds.size === 0 && activeModelDimensionsWithoutEvidence.length === 0 &&
      missingDeclaredEvidenceIds.length === 0 && populationDimensionsUsingExcludedEvidence.length === 0 &&
      overstatedDeclaredGrades.length === 0 && declaredClassificationMismatches.length === 0 &&
      declaredDimensionMismatches.length === 0,
    entries: EVIDENCE_REGISTRY.entries.length,
    gradeCounts,
    excludedEntries,
    unresolvedDimensionIds: [...unresolvedDimensionIds].sort(),
    activeModelDimensionsWithoutEvidence: activeModelDimensionsWithoutEvidence.sort(),
    missingDeclaredEvidenceIds: missingDeclaredEvidenceIds.sort(),
    populationDimensionsUsingExcludedEvidence: populationDimensionsUsingExcludedEvidence.sort(),
    overstatedDeclaredGrades: overstatedDeclaredGrades.sort(),
    declaredClassificationMismatches: declaredClassificationMismatches.sort(),
    declaredDimensionMismatches: declaredDimensionMismatches.sort(),
  }
}
