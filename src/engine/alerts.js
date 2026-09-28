import { personUtil } from './utilization.js'
import { projectDemandData } from './demand.js'

const SEVERITY_ORDER = { critical: 0, warning: 1, planning: 2, capacity: 3 }

// people: pre-filtered roster (office/job/etc.) the alerts should scope to.
export function getAttentionAlerts(db, weeks, people) {
  const pd = projectDemandData(db, weeks)
  const alerts = []

  people.forEach((p) => {
    const u = personUtil(db, p, weeks)
    if (u >= 100) {
      alerts.push({
        sev: u > 100 ? 'critical' : 'warning',
        c: u > 100 ? '#fb7185' : '#fbbf24',
        title: p.name + (u > 100 ? ' is over capacity' : ' is at capacity'),
        detail: u + '% utilized across ' + weeks.length + (weeks.length === 1 ? ' week' : ' weeks') + ' · review assignments before adding work',
        kind: 'person',
        id: p.id,
        action: 'Open employee',
      })
    }
  })

  pd.filter((x) => x.gap > 0).forEach((x) => {
    const roles = (x.missingRoles || [])
      .filter((g) => g.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .map((g) => g.role + ' ' + g.gap + 'h')
      .join(' · ')
    alerts.push({
      sev: 'critical',
      c: '#fb7185',
      title: x.p.name + ' needs ' + x.gap + 'h',
      detail: (roles || 'PM requested hours are not fully covered') + ' · ' + x.coverage + '% demand coverage',
      kind: 'project',
      id: x.p.id,
      action: 'Open demand',
    })
  })

  pd.filter((x) => !x.plannedWeeks).forEach((x) =>
    alerts.push({
      sev: 'planning',
      c: '#a78bfa',
      title: x.p.name + ' needs a PM demand plan',
      detail: 'No role-based PM demand has been entered for the active horizon',
      kind: 'project',
      id: x.p.id,
      action: 'Build plan',
    })
  )

  people.forEach((p) => {
    const u = personUtil(db, p, weeks)
    if (u < 50) {
      alerts.push({
        sev: 'capacity',
        c: '#38bdf8',
        title: p.name + ' has ' + Math.max(0, 100 - u) + '% capacity',
        detail: u + '% utilized · potential staffing source for uncovered project demand',
        kind: 'person',
        id: p.id,
        action: 'Open employee',
      })
    }
  })

  alerts.sort((a, b) => (SEVERITY_ORDER[a.sev] ?? 9) - (SEVERITY_ORDER[b.sev] ?? 9) || a.title.localeCompare(b.title))
  return alerts
}

export function groupAlerts(alerts) {
  const counts = { critical: 0, warning: 0, planning: 0, capacity: 0 }
  alerts.forEach((a) => (counts[a.sev] = (counts[a.sev] || 0) + 1))
  const groups = [
    ['critical', 'Staffing gaps'],
    ['warning', 'Capacity warnings'],
    ['planning', 'Planning required'],
    ['capacity', 'Available capacity'],
  ].map(([key, label]) => ({ key, label, rows: alerts.filter((a) => a.sev === key) }))
  return { counts, groups }
}
