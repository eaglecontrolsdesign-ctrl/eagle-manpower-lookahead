import { describe, it, expect } from 'vitest'
import { projectWeekCoverage, coverageClass, coverageLabel, demandHours } from '../src/engine/demand.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { makeDb } from './helpers.js'

describe('demand', () => {
  it('reports unplanned when no PM demand record exists', () => {
    const db = makeDb({ people: [{ id: 'p1' }], projects: [{ id: 'job_1' }] })
    const c = projectWeekCoverage(db, 'job_1', '2026-01-05')
    expect(c.hasPlan).toBe(false)
    expect(coverageClass(c)).toBe('unplanned')
    expect(coverageLabel(c)).toBe('PM plan needed')
  })

  it('computes a per-role gap when assigned hours fall short of demand', () => {
    const db = makeDb({
      people: [{ id: 'p1', role: 'Controls Engineer', planningRole: 'Controls Engineer' }],
      projects: [{ id: 'job_1' }],
      days: { [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1' }, // 8h assigned
      demands: {
        'job_1|2026-01-05': { pmId: '', status: 'confirmed', roles: [{ role: 'Controls Engineer', heads: 1, hours: 40 }] },
      },
    })
    const c = projectWeekCoverage(db, 'job_1', '2026-01-05')
    expect(c.hasPlan).toBe(true)
    expect(c.demand).toBe(40)
    expect(c.assigned).toBe(8)
    expect(c.gap).toBe(32)
    expect(coverageClass(c)).toBe('short')
  })

  it('a person with several planning roles counts toward whichever the plan still needs', () => {
    const db = makeDb({
      people: [
        { id: 'p1', planningRoles: ['Controls Technician', 'Programmer'] },
        { id: 'p2', planningRoles: ['Controls Technician', 'Programmer'] },
      ],
      projects: [{ id: 'job_1' }],
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1', // 8h
        [dayKeyOf('p2', '2026-01-05', 0)]: 'job_1', // 8h
      },
      demands: {
        'job_1|2026-01-05': {
          status: 'confirmed',
          roles: [
            { role: 'Controls Technician', heads: 1, hours: 8 },
            { role: 'Programmer', heads: 1, hours: 8 },
          ],
        },
      },
    })
    const c = projectWeekCoverage(db, 'job_1', '2026-01-05')
    // p1 fills the technician need, p2 is then counted as the programmer — no gap either way.
    expect(c.gap).toBe(0)
    expect(c.roleGaps.map((g) => g.role + ':' + g.covered)).toEqual(['Controls Technician:8', 'Programmer:8'])
    // With only one person, the second role stays short.
    delete db.days[dayKeyOf('p2', '2026-01-05', 0)]
    expect(projectWeekCoverage(db, 'job_1', '2026-01-05').gap).toBe(8)
  })

  it('a shortfall in one role counts even if another role is overstaffed', () => {
    const db = makeDb({
      people: [
        { id: 'p1', planningRole: 'Controls Engineer' },
        { id: 'p2', planningRole: 'Controls Engineer' },
      ],
      projects: [{ id: 'job_1' }],
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p2', '2026-01-05', 0)]: 'job_1',
      },
      demands: {
        'job_1|2026-01-05': {
          pmId: '',
          status: 'confirmed',
          roles: [
            { role: 'Controls Engineer', heads: 1, hours: 8 }, // fully covered, "overstaffed"
            { role: 'Project Manager', heads: 1, hours: 40 }, // completely uncovered
          ],
        },
      },
    })
    const c = projectWeekCoverage(db, 'job_1', '2026-01-05')
    expect(c.gap).toBe(40) // the PM gap still counts in full
  })

  it('demandHours sums heads*hours across role rows', () => {
    expect(demandHours({ roles: [{ heads: 2, hours: 40 }, { heads: 1, hours: 20 }] })).toBe(100)
    expect(demandHours(null)).toBe(0)
  })
})
