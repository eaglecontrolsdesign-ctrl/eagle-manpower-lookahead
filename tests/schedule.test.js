import { describe, it, expect } from 'vitest'
import { dayVal, dayKeyOf, isOverheadId } from '../src/engine/schedule.js'

describe('schedule', () => {
  it('returns the stored day value when present', () => {
    const days = { [dayKeyOf('per_1', '2026-01-05', 0)]: 'job_1' }
    expect(dayVal(days, [], 'per_1', '2026-01-05', 0)).toBe('job_1')
  })

  it('falls back to __HOL on an unassigned holiday date', () => {
    const days = {}
    const holidays = [{ key: 'christmas', label: 'Christmas' }]
    expect(dayVal(days, holidays, 'per_1', '2026-12-21', 4)).toBe('__HOL') // Mon Dec21 + 4 = Fri Dec25
  })

  it('returns empty string for an unassigned non-holiday day', () => {
    expect(dayVal({}, [], 'per_1', '2026-01-05', 0)).toBe('')
  })

  it('isOverheadId recognizes the __ prefix convention', () => {
    expect(isOverheadId('__PTO')).toBe(true)
    expect(isOverheadId('job_abc123')).toBe(false)
  })
})
