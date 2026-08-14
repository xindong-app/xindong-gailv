import runtimeEvidenceRegistry from './evidence-runtime.json'

export type RuntimeEvidenceGrade = 'A' | 'B' | 'C' | 'D'
export type RuntimeEvidenceModelUse = 'direct' | 'anchor' | 'calibration' | 'excluded'

export interface RuntimeEvidenceEntry {
  id: string
  dimensionId: string
  grade: RuntimeEvidenceGrade
  modelUse: RuntimeEvidenceModelUse
  /** Present for the featured records rendered on the home page. */
  sourceTitle?: string
  sourceUrl?: string
  publisher?: string
  dataYear?: string
}

export interface RuntimeEvidenceRegistry {
  dataVersion: string
  modelVersion: string
  retrievedAt: string
  entries: RuntimeEvidenceEntry[]
}

/**
 * Browser-safe display projection. All records retain countable policy fields;
 * only the featured records retain verbose display metadata. The complete
 * definitions, denominators, transformations, estimates and limitations remain
 * in evidence-registry.json and are validated during every release check.
 */
export const EVIDENCE_REGISTRY = runtimeEvidenceRegistry as RuntimeEvidenceRegistry
