import { useMemo } from 'react'
import { buildWeeks } from '../engine/dates.js'

export function useWeeks(count, offset = 0) {
  return useMemo(() => buildWeeks(new Date(), count, offset), [count, offset])
}
