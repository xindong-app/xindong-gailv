import { useCallback, useState } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

export function useHistoryState<T>(initialValue: T, limit = 30) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    future: [],
  })

  const set = useCallback(
    (next: T | ((current: T) => T)) => {
      setHistory((current) => {
        const value = typeof next === 'function'
          ? (next as (current: T) => T)(current.present)
          : next
        if (Object.is(value, current.present)) return current
        return {
          past: [...current.past, current.present].slice(-limit),
          present: value,
          future: [],
        }
      })
    },
    [limit],
  )

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (previous === undefined) return current
      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0]
      if (next === undefined) return current
      return {
        past: [...current.past, current.present].slice(-limit),
        present: next,
        future: current.future.slice(1),
      }
    })
  }, [limit])

  const reset = useCallback((value: T) => {
    setHistory({ past: [], present: value, future: [] })
  }, [])

  return {
    value: history.present,
    set,
    reset,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
