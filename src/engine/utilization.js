import { dayVal } from './schedule.js'
import { projectWeekCoverage } from './demand.js'

// % of weekdays across `weeks` that have any assignment (job or overhead) — matches the
// original's "simple" utilization calc used for KPI cards, board chips, and the AI planner.
export function personUtil(db, person, weeks) {
  let assigned = 0
  const capacity = weeks.length * 5
  weeks.forEach((w) => {
    for (let i = 0; i < 5; i++) if (dayVal(db.days, db.holidays, person.id, w.key, i)) assigned++
  })
  return capacity ? Math.round((assigned / capacity) * 100) : 0
}

// % of weekdays assigned to an actual job (excludes overhead/holiday) — used by reports.
export function personJobUtil(db, person, weeks) {
  let job = 0
  let total = 0
  weeks.forEach((w) => {
    for (let i = 0; i < 5; i++) {
      total++
      const v = dayVal(db.days, db.holidays, person.id, w.key, i)
      if (v && v.indexOf('__') !== 0) job++
    }
  })
  return total ? Math.round((job / total) * 100) : 0
}

export function weekOpsStats(db, week, officeFilter) {
  const ppl = officeFilter ? db.people.filter((p) => (p.office || 'Charlotte') === officeFilter) : db.people
  const projects = db.projects.filter((p) => !officeFilter || !p.office || p.office === officeFilter)
  const capacity = ppl.length * 40
  let scheduled = 0
  let demand = 0
  let gap = 0
  let draft = 0
  let unplannedActive = 0
  ppl.forEach((per) => {
    for (let d = 0; d < 5; d++) if (dayVal(db.days, db.holidays, per.id, week.key, d)) scheduled += 8
  })
  projects.forEach((p) => {
    const c = projectWeekCoverage(db, p.id, week.key)
    if (c.hasPlan) {
      demand += c.demand
      gap += c.gap
      if (c.status === 'draft') draft++
    } else if (c.assigned) unplannedActive++
  })
  const pressure = capacity ? Math.round((Math.max(scheduled, demand) / capacity) * 100) : demand ? 999 : 0
  const scheduledUtil = capacity ? Math.round((scheduled / capacity) * 100) : 0
  const demandUtil = capacity ? Math.round((demand / capacity) * 100) : 0
  return { w: week, capacity, scheduled, demand, gap, draft, unplannedActive, pressure, scheduledUtil, demandUtil, open: Math.max(0, capacity - scheduled) }
}
