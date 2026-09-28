import { describe, it, expect } from 'vitest'
import { getAttentionAlerts, groupAlerts } from '../src/engine/alerts.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { makeDb, makeWeeks } from './helpers.js'

describe('alerts', () => {
  it('flags a person at or over 100% utilization', () => {
    const db = makeDb({
      people: [{ id: 'p1', name: 'Busy Bea' }],
      days: {
        [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 1)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 2)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 3)]: 'job_1',
        [dayKeyOf('p1', '2026-01-05', 4)]: 'job_1',
      },
    })
    const weeks = makeWeeks(['2026-01-05'])
    const alerts = getAttentionAlerts(db, weeks, db.people)
    expect(alerts.some((a) => a.sev === 'warning' && a.title.includes('at capacity'))).toBe(true)
  })

  it('flags a project with an unfilled PM demand gap as critical', () => {
    const db = makeDb({
      people: [],
      projects: [{ id: 'job_1', name: 'Big Job' }],
      demands: { 'job_1|2026-01-05': { pmId: '', status: 'confirmed', roles: [{ role: 'Controls Technician', heads: 1, hours: 40 }] } },
    })
    const weeks = makeWeeks(['2026-01-05'])
    const alerts = getAttentionAlerts(db, weeks, db.people)
    expect(alerts.some((a) => a.sev === 'critical' && a.kind === 'project')).toBe(true)
  })

  it('groupAlerts buckets by severity with counts', () => {
    const alerts = [{ sev: 'critical' }, { sev: 'critical' }, { sev: 'capacity' }]
    const { counts, groups } = groupAlerts(alerts)
    expect(counts.critical).toBe(2)
    expect(counts.capacity).toBe(1)
    expect(groups.find((g) => g.key === 'critical').rows.length).toBe(2)
  })
})
