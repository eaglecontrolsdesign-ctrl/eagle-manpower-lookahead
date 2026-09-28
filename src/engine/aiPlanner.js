import { dayVal } from './schedule.js'
import { dateOf } from './dates.js'
import { personUtil } from './utilization.js'
import { projectDemandData } from './demand.js'
import { skillMatchScore } from './skills.js'

function findProjectOrSpecial(db, id) {
  return db.projects.find((p) => p.id === id) || (db.overhead || []).find((s) => s.id === id) || null
}

// Heuristic (not an LLM) single-day reassignment proposal.
export function runAIPlanner(db, weeks, { office = '', weekKey, projectId = '', query = '' } = {}) {
  const wk = weekKey || weeks[0].key
  const q = (query || '').toLowerCase()
  const pool = db.people.filter((p) => !office || (p.office || 'Charlotte') === office)
  const pd = projectDemandData(db, weeks, office || undefined)
  const gapSorted = pd.filter((x) => x.gap > 0).sort((a, b) => b.gap - a.gap)
  const queryProject = q
    ? db.projects.find((p) => q.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(/\s+/).some((t) => t.length > 5 && q.includes(t)))
    : null
  const priority = findProjectOrSpecial(db, projectId) || queryProject || (gapSorted[0] && gapSorted[0].p) || null

  let sources = pool
    .map((p) => ({ p, u: personUtil(db, p, weeks), days: [0, 1, 2, 3, 4].filter((d) => dayVal(db.days, db.holidays, p.id, wk, d) === (priority && priority.id)) }))
    .filter((x) => x.days.length)
    .sort((a, b) => b.u - a.u)
  let source = sources[0]
  if (!source) {
    source = pool
      .map((p) => ({ p, u: personUtil(db, p, weeks), days: [0, 1, 2, 3, 4].filter((d) => dayVal(db.days, db.holidays, p.id, wk, d)) }))
      .filter((x) => x.days.length)
      .sort((a, b) => b.u - a.u)[0]
  }

  const candidates = pool
    .filter((p) => !source || p.id !== source.p.id)
    .map((p) => ({ p, u: personUtil(db, p, weeks), match: skillMatchScore(p, priority), open: [0, 1, 2, 3, 4].filter((d) => !dayVal(db.days, db.holidays, p.id, wk, d)) }))
    .filter((x) => source && x.open.some((d) => source.days.includes(d)))
    .sort((a, b) => b.match - a.match || a.u - b.u)
  const target = candidates[0]

  if (!source || !target) {
    const avail = pool
      .map((p) => ({ p, u: personUtil(db, p, weeks) }))
      .sort((a, b) => a.u - b.u)
      .slice(0, 4)
    return { ok: false, avail }
  }

  let day = source.days.find((d) => target.open.includes(d))
  if (day === undefined) day = target.open[0]
  const pid = dayVal(db.days, db.holidays, source.p.id, wk, day)
  const project = findProjectOrSpecial(db, pid)
  const delta = Math.round(100 / (Math.max(1, weeks.length) * 5))
  const sourceAfter = Math.max(0, source.u - delta)
  const targetAfter = target.u + delta
  const risk = targetAfter > 100 ? 'High risk' : targetAfter >= 85 ? 'Tight capacity' : 'Low risk'
  const date = dateOf(wk, day)

  return {
    ok: true,
    source,
    target,
    project,
    office,
    day,
    pid,
    weekKey: wk,
    delta,
    sourceAfter,
    targetAfter,
    risk,
    date,
    proposal: {
      sourceId: source.p.id,
      targetId: target.p.id,
      pid,
      weekKey: wk,
      day,
      label: (project ? project.name : 'assignment') + ' · ' + date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    },
  }
}

// Re-validates the proposal against the current `db` (it may be stale) and returns a
// { days, aiHistory } patch to apply, capped at 20 undo entries — never mutates `db`.
export function applyProposal(db, proposal) {
  const s = proposal.sourceId + '|' + proposal.weekKey + '|' + proposal.day
  const t = proposal.targetId + '|' + proposal.weekKey + '|' + proposal.day
  if (db.days[s] !== proposal.pid) return { ok: false, reason: 'source-changed' }
  if (db.days[t]) return { ok: false, reason: 'target-taken' }

  const days = { ...db.days }
  const historyEntry = { sourceKey: s, targetKey: t, pid: proposal.pid, targetPrevious: db.days[t] || '', label: proposal.label, at: Date.now() }
  days[t] = proposal.pid
  delete days[s]
  let aiHistory = [...(db.aiHistory || []), historyEntry]
  if (aiHistory.length > 20) aiHistory = aiHistory.slice(aiHistory.length - 20)

  return { ok: true, patch: { days, aiHistory } }
}

export function undoLastProposal(db) {
  const aiHistory = [...(db.aiHistory || [])]
  const h = aiHistory.pop()
  if (!h) return { ok: false }

  const days = { ...db.days }
  days[h.sourceKey] = h.pid
  if (h.targetPrevious) days[h.targetKey] = h.targetPrevious
  else delete days[h.targetKey]

  return { ok: true, patch: { days, aiHistory } }
}
