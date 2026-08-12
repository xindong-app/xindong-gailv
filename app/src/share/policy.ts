import { DIMENSION_BY_ID } from '../model/dimensions'
import { activeConditions } from '../model/selectionUtils'
import type { ModelSelection } from '../model/schema'
import type { ShareFieldCandidate, ShareSettings } from './types'

export function listShareFieldCandidates(selection: ModelSelection): ShareFieldCandidate[] {
  return activeConditions(selection).map((condition) => {
    const dimension = DIMENSION_BY_ID.get(condition.dimensionId)
    const sensitive = dimension?.sensitive ?? true
    return {
      dimensionId: condition.dimensionId,
      label: condition.label,
      summary: condition.summary,
      sensitive,
      selectedByDefault: !sensitive && dimension?.shareDefault === true,
      requiresExplicitConsent: sensitive,
    }
  })
}

export function createDefaultShareSettings(selection: ModelSelection): ShareSettings {
  return {
    showCount: true,
    showRegion: true,
    showAge: true,
    showConditions: true,
    showEntertainment: true,
    includedDimensionIds: listShareFieldCandidates(selection)
      .filter((candidate) => candidate.selectedByDefault)
      .map((candidate) => candidate.dimensionId),
    sensitiveConsentDimensionIds: [],
  }
}
