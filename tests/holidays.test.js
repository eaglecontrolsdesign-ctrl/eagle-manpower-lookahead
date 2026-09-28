import { describe, it, expect } from 'vitest'
import { holidayFor, resolveHolidayInput } from '../src/engine/holidays.js'

describe('holidays', () => {
  it('matches a named recurring holiday on its exact date', () => {
    expect(holidayFor(new Date(2026, 11, 25), [{ key: 'christmas', label: 'Christmas' }])).toBe('Christmas')
    expect(holidayFor(new Date(2026, 11, 24), [{ key: 'christmas', label: 'Christmas' }])).toBeNull()
  })

  it('shifts a weekend holiday to the observed weekday', () => {
    // July 4th 2026 is a Saturday -> observed Friday July 3rd
    expect(holidayFor(new Date(2026, 6, 3), [{ key: '4thofjuly', label: 'Independence Day' }])).toBe('Independence Day')
    expect(holidayFor(new Date(2026, 6, 4), [{ key: '4thofjuly', label: 'Independence Day' }])).toBeNull()
  })

  it('does not shift a floating weekday holiday like Thanksgiving', () => {
    // Thanksgiving 2026 = 4th Thursday of November = Nov 26
    expect(holidayFor(new Date(2026, 10, 26), [{ key: 'thanksgiving', label: 'Thanksgiving' }])).toBe('Thanksgiving')
  })

  it('supports a custom fixed month/day holiday', () => {
    expect(holidayFor(new Date(2026, 2, 17), [{ m: 2, d: 17, label: "St. Patrick's Day" }])).toBe("St. Patrick's Day")
  })

  it('resolveHolidayInput recognizes named aliases and dates', () => {
    expect(resolveHolidayInput('xmas')).toEqual({ recurring: true, key: 'christmas', label: 'Christmas' })
    expect(resolveHolidayInput('2026-07-04').date.getFullYear()).toBe(2026)
    expect(resolveHolidayInput('12/24')).toEqual({ recurring: true, m: 11, d: 24, label: '' })
  })
})
