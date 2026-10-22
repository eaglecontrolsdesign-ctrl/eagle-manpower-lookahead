import { dayHoursSplit } from './segments.js'
import { projectWeekCoverage } from './demand.js'

// Utilization is hours-based (engine/segments.js): a day can hold several jobs for any number
// of hours, so capacity is weeks × 5 days × 8h and a 10-hour day counts as 10h. Overtime can push
// a person past 100%.
const DAY_CAPACITY = 8

function hoursOver(db, person, weeks) {
  let job = 0
  let overhead = 0
  weeks.forEach((w) => {
    for (let i = 0; i < 5; i++) {
      const h = dayHoursSplit(db, person.id, w.key, i)
      job += h.job
      overhead += h.overhead
    }
  })
  return { job, overhead, total: job + overhead, capacity: weeks.length * 5 * DAY_CAPACITY }
}

// % of capacity across `weeks` with any assignment (job or overhead) — KPI cards, board chips,
// and the AI planner.
export function personUtil(db, person, weeks) {
  const h = hoursOver(db, person, weeks)
  return h.capacity ? Math.round((h.total / h.capacity) * 100) : 0
}

// % of capacity on actual jobs (excludes overhead/holiday) — reports and the first board pill.
export function personJobUtil(db, person, weeks) {
  const h = hoursOver(db, person, weeks)
  return h.capacity ? Math.round((h.job / h.capacity) * 100) : 0
}

// % of capacity on overhead categories (PTO, Office, Remote, Sales, Holiday) — the second pill.
export function personOverheadUtil(db, person, weeks) {
  const h = hoursOver(db, person, weeks)
  return h.capacity ? Math.round((h.overhead / h.capacity) * 100) : 0
}

export function personHours(db, person, weeks) {
  return hoursOver(db, person, weeks)
}

export function weekOpsStats(db, week, officeFilter) {
  const ppl = officeFilter ? db.people.filter((p) => (p.office || 'Charlotte') === officeFilter) : db.people
  const projects = db.projects.filter((p) => !officeFilter || !p.office || p.office === officeFilter)
  const capacity = ppl.length * 5 * DAY_CAPACITY
  let scheduled = 0
  let demand = 0
  let gap = 0
  let draft = 0
  let unplannedActive = 0
  ppl.forEach((per) => {
    for (let d = 0; d < 5; d++) scheduled += dayHoursSplit(db, per.id, week.key, d).total
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
