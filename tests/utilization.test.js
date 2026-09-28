import { describe, it, expect } from 'vitest'
import { personUtil, personJobUtil, weekOpsStats } from '../src/engine/utilization.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { makeDb, makeWeeks } from './helpers.js'

describe('utilization', () => {
  it('personUtil counts any assigned weekday (job or overhead) out of weeks*5', () => {
    const db = makeDb({
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 1)]: '__PTO',
      },
    })
    const weeks = makeWeeks(['2026-01-05'])
    expect(personUtil(db, { id: 'p1' }, weeks)).toBe(40) // 2 of 5 weekdays
  })

  it('personJobUtil excludes overhead/holiday days', () => {
    const db = makeDb({
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 1)]: '__PTO',
      },
    })
    const weeks = makeWeeks(['2026-01-05'])
    expect(personJobUtil(db, { id: 'p1' }, weeks)).toBe(20) // only 1 of 5 is a real job
  })

  it('weekOpsStats aggregates capacity/scheduled/demand/pressure for a week', () => {
    const db = makeDb({
      people: [{ id: 'p1', office: 'Charlotte' }, { id: 'p2', office: 'Charlotte' }],
      projects: [{ id: 'job_1', office: '' }],
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 1)]: 'job_1',
      },
      demands: { 'job_1|2026-01-05': { pmId: '', status: 'confirmed', roles: [{ role: 'Controls Technician', heads: 1, hours: 40 }] } },
    })
    const stats = weekOpsStats(db, { key: '2026-01-05' })
    expect(stats.capacity).toBe(80) // 2 people * 40h
    expect(stats.scheduled).toBe(16) // 2 days * 8h
    expect(stats.demand).toBe(40)
    expect(stats.pressure).toBe(50) // max(16,40)/80
  })
})
