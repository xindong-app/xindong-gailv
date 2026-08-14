/**
 * Public version identifiers shown beside every estimate.
 *
 * Model versions change when calculation semantics change. Data versions change
 * when an evidence anchor or population table changes. Keeping them separate
 * makes a shared result auditable without implying false precision.
 */
export const MODEL_VERSION = '4.0.0'
export const DATA_VERSION = '2026.08.14.3'

/** Evidence catalog consumed by the v4 probability layer. */
export const EVIDENCE_CATALOG_MODEL_VERSION = '3.1.0'
export const EVIDENCE_CATALOG_DATA_VERSION = '2026.08.14.2'

export const MODEL_RELEASED_AT = '2026-08-14'
