import { dayVal } from './schedule.js'
import { personPlanningRole } from './planningRoles.js'
import { projColor } from './colors.js'
import { projectWeekCoverage } from './demand.js'

function findProjectOrSpecial(db, id) {
  return db.projects.find((p) => p.id === id) || (db.overhead || []).find((s) => s.id === id) || null
}

export function nameOf(db, pid) {
  const p = findProjectOrSpecial(db, pid)
  return p ? p.name : pid
}

export function weekAgg(db, personId, wkKey) {
  const counts = {}
  for (let i = 0; i < 7; i++) {
    const v = dayVal(db.days, db.holidays, personId, wkKey, i)
    if (v) counts[v] = (counts[v] || 0) + 1
  }
  return Object.entries(counts).map(([pid, count]) => {
    const p = findProjectOrSpecial(db, pid)
    const idx = db.projects.findIndex((x) => x.id === pid)
    return { pid, count, name: p ? p.name : pid, color: p ? projColor(p, Math.max(idx, 0)) : '#7f8db0' }
  })
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          v = String(v ?? '')
          return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v
        })
        .join(',')
    )
    .join('\r\n')
}

// people: pre-filtered roster (office/job filters etc.) to include as rows.
export function buildScheduleRows(db, weeks, people) {
  const rows = [['SCHEDULE'], ['Tech', 'Job title', 'Planning role', 'Office'].concat(weeks.map((w) => w.label))]
  people.forEach((per) => {
    rows.push(
      [per.name, per.role || '', personPlanningRole(per), per.office || 'Charlotte'].concat(
        weeks.map((w) => weekAgg(db, per.id, w.key).map((a) => a.name + (a.count < 5 ? ' x' + a.count : '')).join(' / '))
      )
    )
  })
  return rows
}

export function buildDemandRows(db, weeks) {
  const rows = [[], ['PM DEMAND'], ['Project', 'Week', 'PM / Owner', 'Status', 'Role', 'People', 'Hours each', 'Demand hours', 'Scheduled hours', 'Gap hours', 'Notes']]
  db.projects.forEach((p) =>
    weeks.forEach((w) => {
      const c = projectWeekCoverage(db, p.id, w.key)
      const r = c.record
      if (!r) return
      const pm = db.people.find((x) => x.id === r.pmId)
      r.roles.forEach((role, idx) =>
        rows.push([
          p.name,
          w.label,
          pm ? pm.name : '',
          r.status || 'draft',
          role.role,
          role.heads,
          role.hours,
          (+role.heads || 0) * (+role.hours || 0),
          idx === 0 ? c.assigned : '',
          idx === 0 ? c.gap : '',
          idx === 0 ? r.notes || '' : '',
        ])
      )
    })
  )
  return rows
}

export function buildFullCsv(db, weeks, people) {
  return toCsv([...buildScheduleRows(db, weeks, people), ...buildDemandRows(db, weeks)])
}
