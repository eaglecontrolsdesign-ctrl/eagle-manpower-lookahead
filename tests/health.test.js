import { describe, it, expect } from 'vitest'
import { projectHealth } from '../src/engine/health.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { makeDb, makeWeeks } from './helpers.js'

describe('projectHealth', () => {
  it('scores a fully unplanned, unscheduled project at 100-22-5=73 (AT RISK)', () => {
    // no plan (-22, nothing scheduled) and the same week also counts toward the
    // "weeks unplanned" penalty even though planned=0 (-5 for 1 of 1 weeks)
    const db = makeDb({ projects: [{ id: 'job_1' }] })
    const weeks = makeWeeks(['2026-01-05'])
    const h = projectHealth(db, { id: 'job_1' }, weeks)
    expect(h.score).toBe(73)
    expect(h.status).toBe('AT RISK')
  })

  it('penalizes harder (-38) when work is scheduled but no PM plan exists', () => {
    // -38 no-plan-but-scheduled, -5 weeks-unplanned, -5 unplanned-active-week = 52
    const db = makeDb({
      people: [{ id: 'p1' }],
      projects: [{ id: 'job_1' }],
      days: { [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1' },
    })
    const weeks = makeWeeks(['2026-01-05'])
    const h = projectHealth(db, { id: 'job_1' }, weeks)
    expect(h.score).toBe(52)
    expect(h.reasons[0]).toContain('-38')
  })

  it('clamps the score to a floor of 20 under a maximally bad plan', () => {
    const people = [{ id: 'p1', planningRole: 'Controls Technician' }]
    const days = {}
    const demands = {}
    const plannedWeeks = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26'] // draft, fully unfilled
    const unplannedActiveWeeks = ['2026-02-02', '2026-02-09', '2026-02-16', '2026-02-23', '2026-03-02', '2026-03-09']
    plannedWeeks.forEach((wk) => {
      demands['job_1|' + wk] = { pmId: '', status: 'draft', roles: [{ role: 'Controls Technician', heads: 5, hours: 40 }] }
    })
    unplannedActiveWeeks.forEach((wk) => {
      days[dayKeyOf('p1', wk, 0)] = 'job_1'
    })
    const db = makeDb({ people, projects: [{ id: 'job_1' }], days, demands })
    const weeks = makeWeeks([...plannedWeeks, ...unplannedActiveWeeks])
    const h = projectHealth(db, { id: 'job_1' }, weeks)
    expect(h.score).toBe(20)
    expect(h.status).toBe('CRITICAL')
  })

  it('a fully covered, confirmed plan across all weeks scores 100/HEALTHY', () => {
    const db = makeDb({
      people: [{ id: 'p1', planningRole: 'Controls Technician' }],
      projects: [{ id: 'job_1' }],
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 1)]: 'job_1',
      },
      demands: {
        'job_1|2026-01-05': { pmId: '', status: 'confirmed', roles: [{ role: 'Controls Technician', heads: 1, hours: 16 }] },
      },
    })
    const weeks = makeWeeks(['2026-01-05'])
    const h = projectHealth(db, { id: 'job_1' }, weeks)
    expect(h.score).toBe(100)
    expect(h.status).toBe('HEALTHY')
  })
})
