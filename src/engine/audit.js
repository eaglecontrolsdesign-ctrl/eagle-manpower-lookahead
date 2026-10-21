// Activity log: a readable record of who changed what, when.
//
// Every write the app makes also creates an entry in the audit collection (one document each,
// append-only, readable by everyone, expiring after a year). For the board the Firestore rules
// require the entry: a board update is only accepted when the same batch creates an audit
// entry authored by the signed-in user (boards/main.lastAuditId points at it). Everything else
// (users, requests, sign-ins) is logged by the same client code without that hard requirement.
//
// This module is pure: it turns raw changes into the lines people read.

import { dateOf } from './dates.js'

export const RETENTION_DAYS = 365
export const AUDIT_AREAS = {
  board: 'Manpower Board',
  demand: 'PM Demand',
  admin: 'Administration',
  users: 'Users',
  requests: 'Requests',
  auth: 'Sign-in',
}
const ARRAY_LABEL = { people: 'Roster', projects: 'Projects', overhead: 'Overhead', staffingRoles: 'Staffing roles', holidays: 'Holidays' }
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export function buildAuditEntry({ by, area, action, lines, at }) {
  const now = at || Date.now()
  return {
    by,
    at: now,
    area,
    action,
    lines: (lines || []).filter(Boolean),
    expiresAtMs: now + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  }
}

function fmtDay(wkKey, di) {
  const d = dateOf(wkKey, di)
  return DAY_NAMES[di] + ' ' + d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtWeek(wkKey) {
  return 'week of ' + dateOf(wkKey, 0).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function personName(board, id) {
  const p = (board.people || []).find((x) => x.id === id)
  return p ? p.name : id
}

function jobName(board, id) {
  if (!id) return 'free'
  if (id === '__HOL') return 'Holiday'
  const p = (board.projects || []).find((x) => x.id === id) || (board.overhead || []).find((x) => x.id === id)
  return p ? p.name : id
}

function dayRange(wkKey, dis) {
  const sorted = [...dis].sort((a, b) => a - b)
  if (sorted.length === 1) return fmtDay(wkKey, sorted[0])
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  if (contiguous) return fmtDay(wkKey, sorted[0]) + ' – ' + fmtDay(wkKey, sorted[sorted.length - 1])
  return sorted.map((di) => fmtDay(wkKey, di)).join(', ')
}

function clip(text, n = 90) {
  const t = String(text).replace(/\s+/g, ' ').trim()
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

function demandSummary(rec) {
  if (!rec) return 'cleared'
  const roles = (rec.roles || []).map((r) => r.heads + ' × ' + r.role + ' @ ' + r.hours + 'h').join(', ')
  return (rec.status === 'confirmed' ? 'confirmed' : 'draft') + (roles ? ' · ' + roles : ' · no roles') + (rec.notes ? ' · "' + clip(rec.notes, 60) + '"' : '')
}

// entries: { key: newValue | undefined }, before: { key: oldValue } (as of the last confirmed snapshot).
export function describeMapChanges(board, field, entries, before = {}) {
  const lines = []
  if (field === 'days') {
    // One line per person/week/transition, with the days merged into a range.
    const groups = new Map()
    Object.entries(entries).forEach(([key, after]) => {
      const [pid, wk, di] = key.split('|')
      const from = jobName(board, before[key])
      const to = jobName(board, after)
      if (from === to) return
      const gk = pid + '|' + wk + '|' + from + '→' + to
      if (!groups.has(gk)) groups.set(gk, { pid, wk, from, to, dis: [] })
      groups.get(gk).dis.push(Number(di))
    })
    groups.forEach((g) => lines.push(personName(board, g.pid) + ' · ' + dayRange(g.wk, g.dis) + ': ' + g.from + ' → ' + g.to))
  } else if (field === 'notes') {
    Object.entries(entries).forEach(([key, after]) => {
      const [pid, wk, di] = key.split('|')
      const who = personName(board, pid) + ' · ' + fmtDay(wk, Number(di))
      if ((after || '') === (before[key] || '')) return // no-op (an untouched day saved as empty)
      if (!after) lines.push('Removed note for ' + who + (before[key] ? ' ("' + clip(before[key], 60) + '")' : ''))
      else lines.push((before[key] ? 'Changed' : 'Added') + ' note for ' + who + ': "' + clip(after) + '"')
    })
  } else if (field === 'demands') {
    Object.entries(entries).forEach(([key, after]) => {
      const [pid, wk] = key.split('|')
      if (!after && !before[key]) return
      lines.push('PM demand · ' + jobName(board, pid) + ' · ' + fmtWeek(wk) + ': ' + demandSummary(after) + (before[key] ? ' (was ' + demandSummary(before[key]) + ')' : ''))
    })
  }
  return lines
}

function show(v) {
  if (v == null || v === '') return '(none)'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '(none)'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// Roster / projects / overhead / staffing roles / holidays: whole arrays replaced at once, so
// diff them by id (objects) or by value (strings) into added / removed / changed lines.
export function describeArrayChanges(field, beforeArr, afterArr) {
  const label = ARRAY_LABEL[field] || field
  const b = beforeArr || []
  const a = afterArr || []
  const lines = []
  const objects = a.concat(b).some((x) => x && typeof x === 'object')
  if (!objects) {
    a.filter((x) => !b.includes(x)).forEach((x) => lines.push(label + ': added ' + show(x)))
    b.filter((x) => !a.includes(x)).forEach((x) => lines.push(label + ': removed ' + show(x)))
    return lines
  }
  const bById = new Map(b.map((x) => [x.id, x]))
  const aById = new Map(a.map((x) => [x.id, x]))
  a.forEach((x) => {
    if (!bById.has(x.id)) lines.push(label + ': added ' + (x.name || x.id))
  })
  b.forEach((x) => {
    if (!aById.has(x.id)) lines.push(label + ': removed ' + (x.name || x.id))
  })
  a.forEach((x) => {
    const prev = bById.get(x.id)
    if (!prev) return
    const keys = [...new Set([...Object.keys(prev), ...Object.keys(x)])].filter((k) => k !== 'id' && JSON.stringify(prev[k]) !== JSON.stringify(x[k]))
    if (keys.length) lines.push(label + ': ' + (x.name || x.id) + ' — ' + keys.map((k) => k + ': ' + show(prev[k]) + ' → ' + show(x[k])).join('; '))
  })
  return lines
}

// Which area a board flush belongs to, from the fields it touches.
export function areaForFields(fields) {
  if (fields.some((f) => ARRAY_LABEL[f])) return 'admin'
  if (fields.includes('demands') && !fields.includes('days') && !fields.includes('notes')) return 'demand'
  return 'board'
}

export function auditSearchText(e) {
  return [e.by, AUDIT_AREAS[e.area] || e.area, e.action, ...(e.lines || [])].join(' ').toLowerCase()
}

export function auditToCsv(entries) {
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const rows = [['When', 'User', 'Area', 'Action', 'Details'].map(esc).join(',')]
  entries.forEach((e) => {
    rows.push([new Date(e.at).toISOString(), e.by, AUDIT_AREAS[e.area] || e.area, e.action, (e.lines || []).join(' | ')].map(esc).join(','))
  })
  return rows.join('\r\n')
}
