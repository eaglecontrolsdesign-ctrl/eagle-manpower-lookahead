import { jobHoursOnDay, dayHours } from './segments.js'
import { personPlanningRoles } from './planningRoles.js'
import { projColor } from './colors.js'

export function demandKey(projectId, wkKey) {
  return projectId + '|' + wkKey
}

export function demandRecord(db, projectId, wkKey) {
  const r = db.demands[demandKey(projectId, wkKey)]
  return r && Array.isArray(r.roles) ? r : null
}

export function demandHours(record) {
  return record ? record.roles.reduce((s, r) => s + Math.max(0, +r.heads || 0) * Math.max(0, +r.hours || 0), 0) : 0
}

// Assigned hours + demand coverage for one project in one week, broken out per staffing role.
export function projectWeekCoverage(db, projectId, wkKey) {
  const record = demandRecord(db, projectId, wkKey)
  // What the PM asked for, per role — needed first so a person who holds several planning
  // roles can be counted toward whichever of them this week still needs.
  const roleNeeds = {}
  if (record) {
    record.roles.forEach((r) => {
      if (!roleNeeds[r.role]) roleNeeds[r.role] = { role: r.role, needed: 0, heads: 0, hours: +r.hours || 0 }
      roleNeeds[r.role].needed += (+r.heads || 0) * (+r.hours || 0)
      roleNeeds[r.role].heads += +r.heads || 0
    })
  }
  const remaining = {}
  Object.values(roleNeeds).forEach((r) => (remaining[r.role] = r.needed))
  const roleAssigned = {}
  const assignedPeople = new Set()
  let assigned = 0
  db.people.forEach((per) => {
    let hours = 0
    for (let d = 0; d < 5; d++) hours += jobHoursOnDay(db, per.id, wkKey, d, projectId)
    if (hours) {
      assigned += hours
      assignedPeople.add(per.id)
      const roles = personPlanningRoles(per)
      // Prefer a role of theirs that is still short, then any role the plan asks for, then their primary.
      const role = roles.find((r) => remaining[r] > 0) || roles.find((r) => roleNeeds[r]) || roles[0]
      roleAssigned[role] = (roleAssigned[role] || 0) + hours
      if (remaining[role] != null) remaining[role] = Math.max(0, remaining[role] - hours)
    }
  })
  if (!record) {
    return {
      hasPlan: false,
      status: 'unplanned',
      demand: 0,
      assigned,
      gap: null,
      coverage: 0,
      requestedHeads: 0,
      assignedHeads: assignedPeople.size,
      roleGaps: [],
      record: null,
    }
  }
  const demand = demandHours(record)
  const roleGaps = Object.values(roleNeeds).map((r) => {
    const covered = roleAssigned[r.role] || 0
    return { ...r, covered, gap: Math.max(0, r.needed - covered) }
  })
  const gap = roleGaps.reduce((s, g) => s + g.gap, 0)
  const coverage = demand ? Math.round((Math.max(0, demand - gap) / demand) * 100) : 0
  return {
    hasPlan: true,
    status: record.status || 'draft',
    demand,
    assigned,
    gap,
    coverage,
    requestedHeads: record.roles.reduce((s, r) => s + (+r.heads || 0), 0),
    assignedHeads: assignedPeople.size,
    roleGaps,
    record,
  }
}

export function coverageClass(c) {
  return !c.hasPlan ? 'unplanned' : c.status === 'draft' ? 'draft' : c.gap > 0 ? 'short' : 'covered'
}

export function coverageLabel(c) {
  return !c.hasPlan ? 'PM plan needed' : c.status === 'draft' ? 'Draft · ' + c.coverage + '%' : c.gap > 0 ? 'Needs ' + c.gap + 'h' : c.coverage + '% covered'
}

// Per-project rollup across a set of weeks, optionally scoped to one office.
export function projectDemandData(db, weeks, officeFilter) {
  return db.projects
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => !officeFilter || !p.office || p.office === officeFilter)
    .map(({ p, i }) => {
      let assigned = 0
      let plannedAssigned = 0
      let demand = 0
      let gap = 0
      let plannedWeeks = 0
      let draftWeeks = 0
      const missingRoles = []
      weeks.forEach((w) => {
        const c = projectWeekCoverage(db, p.id, w.key)
        assigned += c.assigned
        if (c.hasPlan) {
          plannedWeeks++
          plannedAssigned += c.assigned
          demand += c.demand
          gap += c.gap
          if (c.status === 'draft') draftWeeks++
          c.roleGaps.filter((g) => g.gap > 0).forEach((g) => missingRoles.push(g))
        }
      })
      return {
        p,
        color: projColor(p, i),
        assigned,
        plannedAssigned,
        demand,
        gap: plannedWeeks ? gap : null,
        coverage: demand ? Math.round((Math.max(0, demand - gap) / demand) * 100) : 0,
        plannedWeeks,
        draftWeeks,
        unplannedWeeks: weeks.length - plannedWeeks,
        missingRoles,
      }
    })
}

export function weekDemandSummary(db, wkKey, officeFilter) {
  let demand = 0
  let gap = 0
  let draft = 0
  db.projects
    .filter((p) => !officeFilter || !p.office || p.office === officeFilter)
    .forEach((p) => {
      const c = projectWeekCoverage(db, p.id, wkKey)
      if (c.hasPlan) {
        demand += c.demand
        gap += c.gap
        if (c.status === 'draft') draft++
      }
    })
  const ppl = officeFilter ? db.people.filter((p) => (p.office || 'Charlotte') === officeFilter) : db.people
  const capacity = ppl.length * 40
  let scheduled = 0
  ppl.forEach((per) => {
    for (let d = 0; d < 5; d++) scheduled += dayHours(db, per.id, wkKey, d)
  })
  return { demand, gap, draft, open: Math.max(0, capacity - scheduled) }
}
