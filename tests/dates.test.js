import { describe, it, expect } from 'vitest'
import { mondayOf, weekKey, dateOf, buildWeeks } from '../src/engine/dates.js'

describe('dates', () => {
  it('mondayOf rolls back to the Monday of the week', () => {
    expect(weekKey(mondayOf(new Date(2026, 0, 1)))).toBe('2025-12-29') // Thu Jan 1 2026 -> Mon Dec 29 2025
    expect(weekKey(mondayOf(new Date(2026, 0, 5)))).toBe('2026-01-05') // Mon stays put
  })

  it('dateOf adds dayIndex days onto the week-key Monday', () => {
    const d = dateOf('2026-01-05', 4)
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(9)
  })

  it('buildWeeks returns `count` consecutive Monday-keyed weeks from the anchor', () => {
    const weeks = buildWeeks(new Date(2026, 0, 5), 3)
    expect(weeks.map((w) => w.key)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19'])
  })

  it('buildWeeks honors an offset', () => {
    const weeks = buildWeeks(new Date(2026, 0, 5), 2, 2)
    expect(weeks.map((w) => w.key)).toEqual(['2026-01-19', '2026-01-26'])
  })
})
