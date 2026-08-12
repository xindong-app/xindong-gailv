import { useCallback, useEffect, useRef } from 'react'
import { safeParseSelection, type ModelSelection } from '../model/schema'
import { sanitizeForSession } from '../model/selectionUtils'

const SESSION_KEY = 'heart-probability-lab:safe-draft:v2'

export function loadSafeSessionSelection(fallback: ModelSelection): ModelSelection {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    if (!value) return fallback
    const parsed = safeParseSelection(JSON.parse(value))
    // Treat storage as untrusted input. A browser extension, old build, or
    // manual script can inject a schema-valid payload that still contains
    // fields this product promises never to restore from a draft.
    return parsed.success ? sanitizeForSession(parsed.data) : fallback
  } catch {
    return fallback
  }
}

export function useSessionSelection(selection: ModelSelection) {
  const timeoutRef = useRef<number | undefined>(undefined)
  const generationRef = useRef(0)
  const skippedSelectionFingerprintRef = useRef<string | null>(null)
  useEffect(() => {
    window.clearTimeout(timeoutRef.current)
    if (skippedSelectionFingerprintRef.current != null) {
      const shouldSkip = skippedSelectionFingerprintRef.current === JSON.stringify(selection)
      skippedSelectionFingerprintRef.current = null
      if (shouldSkip) return
    }
    const generation = generationRef.current
    timeoutRef.current = window.setTimeout(() => {
      if (generation !== generationRef.current) return
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sanitizeForSession(selection)))
      } catch {
        // Storage may be unavailable in strict privacy mode; the app remains usable.
      }
    }, 250)
    return () => window.clearTimeout(timeoutRef.current)
  }, [selection])

  return useCallback((selectionToSkip?: ModelSelection) => {
    generationRef.current += 1
    window.clearTimeout(timeoutRef.current)
    skippedSelectionFingerprintRef.current = selectionToSkip == null ? null : JSON.stringify(selectionToSkip)
    clearSessionSelection()
  }, [])
}

export function clearSessionSelection() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // No-op when storage is blocked.
  }
}
