export const FEATURED_EVIDENCE_LIMIT = 8

interface EvidenceProjectionInput {
  dataVersion: string
  modelVersion: string
  retrievedAt: string
  entries: Array<{
    id: string
    dimensionId: string
    grade: string
    modelUse: string
    sourceTitle: string
    sourceUrl: string
    publisher: string
    dataYear: string
  }>
}

/**
 * Keep complete display metadata only for the eight records rendered on the
 * home page. Every record still keeps its stable id, dimension, grade and
 * model use so browser-side counts remain exact. Complete provenance always
 * remains in evidence-registry.json and is release-validated.
 */
export function projectEvidenceRuntime(registry: EvidenceProjectionInput) {
  return {
    dataVersion: registry.dataVersion,
    modelVersion: registry.modelVersion,
    retrievedAt: registry.retrievedAt,
    entries: registry.entries.map((entry, index) => ({
      id: entry.id,
      dimensionId: entry.dimensionId,
      grade: entry.grade,
      modelUse: entry.modelUse,
      ...(index < FEATURED_EVIDENCE_LIMIT ? {
        sourceTitle: entry.sourceTitle,
        sourceUrl: entry.sourceUrl,
        publisher: entry.publisher,
        dataYear: entry.dataYear,
      } : {}),
    })),
  }
}
