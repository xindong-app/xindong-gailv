import { describe, expect, it } from 'vitest'
import { DIMENSION_REGISTRY, dimensionsByClass } from '../../src/model/dimensions'
import { SOFT_PREFERENCE_IDS } from '../../src/model/schema'
import evidenceRegistryJson from '../../src/data/evidence-registry.json'
import { EVIDENCE_REGISTRY, parseEvidenceRegistry, validateEvidenceRegistry } from '../../src/data/evidence'

describe('dimension registry', () => {
  it('has unique machine ids and all four required classes', () => {
    const ids = DIMENSION_REGISTRY.map((dimension) => dimension.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const classification of ['hard_filter', 'correlated_hard', 'soft_preference', 'entertainment'] as const) {
      expect(dimensionsByClass(classification).length).toBeGreaterThan(0)
    }
  })

  it('keeps population/match/entertainment routing coherent', () => {
    for (const dimension of DIMENSION_REGISTRY) {
      if (dimension.classification === 'soft_preference') {
        expect(dimension.population, dimension.id).toBe(false)
        expect(dimension.match, dimension.id).toBe(true)
      }
      if (dimension.classification === 'entertainment') {
        expect(dimension.population, dimension.id).toBe(false)
        expect(dimension.entertainment, dimension.id).toBe(true)
      }
      if (dimension.sensitive) expect(dimension.shareDefault, dimension.id).toBe(false)
    }
  })

  it('registers every selectable soft preference exactly once', () => {
    const registrySoftIds = new Set(dimensionsByClass('soft_preference').flatMap((dimension) =>
      dimension.binding === 'softPreferenceIds' ? dimension.options.map((option) => option.value) : [dimension.id],
    ))
    expect([...SOFT_PREFERENCE_IDS].filter((id) => !registrySoftIds.has(id))).toEqual([])
  })
})

describe('machine-readable evidence registry', () => {
  it('validates every source URL, estimate range, and model mapping', () => {
    const summary = validateEvidenceRegistry()
    expect(summary.valid).toBe(true)
    expect(summary.entries).toBe(EVIDENCE_REGISTRY.entries.length)
    expect(summary.entries).toBeGreaterThanOrEqual(40)
    expect(summary.unresolvedDimensionIds).toEqual([])
    expect(summary.activeModelDimensionsWithoutEvidence).toEqual([])
    expect(summary.missingDeclaredEvidenceIds).toEqual([])
    expect(summary.populationDimensionsUsingExcludedEvidence).toEqual([])
    expect(summary.overstatedDeclaredGrades).toEqual([])
    expect(summary.declaredClassificationMismatches).toEqual([])
    expect(summary.declaredDimensionMismatches).toEqual([])
  })

  it('keeps weak evidence out of population calculations', () => {
    const weakActive = EVIDENCE_REGISTRY.entries.filter((entry) => entry.grade === 'D' && entry.modelUse !== 'excluded')
    expect(weakActive).toEqual([])
  })

  it('keeps registry versions, HTTPS URLs, D exclusions, and share bounds consistent', () => {
    for (const entry of EVIDENCE_REGISTRY.entries) {
      expect(entry.modelVersion).toBe(EVIDENCE_REGISTRY.modelVersion)
      expect(entry.dataVersion).toBe(EVIDENCE_REGISTRY.dataVersion)
      expect(entry.sourceUrl.startsWith('https://')).toBe(true)
      if (entry.grade === 'D') expect(entry.modelUse).toBe('excluded')
      const shareUnitException = entry.id === 'evidence.economy.car.household-2025' &&
        entry.limitations.some((limitation) => limitation.includes('辆/百户'))
      if (entry.estimate.unit === 'share' && !shareUnitException) {
        for (const value of [entry.estimate.conservative, entry.estimate.baseline, entry.estimate.optimistic]) {
          if (value != null) expect(value).toBeGreaterThanOrEqual(0)
          if (value != null) expect(value).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('rejects evidence retrieved after an injectable build date', () => {
    expect(() => parseEvidenceRegistry(evidenceRegistryJson, '2026-08-12')).toThrow(/晚于构建日期/)
    expect(parseEvidenceRegistry(evidenceRegistryJson, '2026-08-13')).toEqual(EVIDENCE_REGISTRY)
  })
})
