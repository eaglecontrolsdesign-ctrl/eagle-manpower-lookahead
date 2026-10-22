// Hours within a day.
//
// A person-day can carry more than one job, each for a number of hours (a half day here, two
// hours of service there, a 10-hour day with overtime). Storage keeps two map fields on the
// board, both keyed "personId|week|day":
//   days[key]      the day's primary job id (the one with the most hours) — unchanged shape, so
//                  everything that only needs "what is this person mostly on" keeps working,
//                  including the Project Command Center sync, which reads this map.
//   segments[key]  [{ id, hours }, ...] — only present when the day is not a plain 8-hour day on
//                  one job. Absent means "days[key] for a full day".
// Every reader goes through daySegments(); every writer goes through dayPatchFor().

import { dayKeyOf, dayVal } from './schedule.js'

export const FULL_DAY = 8
export const HOLIDAY = '__HOL'

function num(h) {
  const n = +h
  return Number.isFinite(n) && n > 0 ? Math.round(n * 4) / 4 : 0 // quarter-hour steps
}

// The assignments on one day, in order: [{ id, hours }]. Empty for an unassigned day.
export function daySegments(db, personId, wkKey, dayIndex) {
  const key = dayKeyOf(personId, wkKey, dayIndex)
  const stored = db.segments && db.segments[key]
  if (Array.isArray(stored) && stored.length) {
    const list = stored.map((s) => ({ id: s && s.id, hours: num(s && s.hours) })).filter((s) => s.id && s.hours > 0)
    if (list.length) return list
  }
  const v = dayVal(db.days || {}, db.holidays || [], personId, wkKey, dayIndex)
  return v ? [{ id: v, hours: FULL_DAY }] : []
}

export function dayHours(db, personId, wkKey, dayIndex) {
  return daySegments(db, personId, wkKey, dayIndex).reduce((s, x) => s + x.hours, 0)
}

export function jobHoursOnDay(db, personId, wkKey, dayIndex, jobId) {
  return daySegments(db, personId, wkKey, dayIndex)
    .filter((x) => x.id === jobId)
    .reduce((s, x) => s + x.hours, 0)
}

export function isOverheadId(id) {
  return typeof id === 'string' && id.indexOf('__') === 0
}

// Hours on real jobs vs. overhead categories for one day.
export function dayHoursSplit(db, personId, wkKey, dayIndex) {
  let job = 0
  let overhead = 0
  daySegments(db, personId, wkKey, dayIndex).forEach((s) => (isOverheadId(s.id) ? (overhead += s.hours) : (job += s.hours)))
  return { job, overhead, total: job + overhead }
}

// Identical-day test for merging consecutive days into one wide cell.
export function daySignature(segments) {
  return (segments || []).map((s) => s.id + ':' + s.hours).join(',')
}

// Merge duplicates, drop empties, keep order of first appearance.
export function normalizeSegments(list) {
  const out = []
  ;(list || []).forEach((s) => {
    if (!s || !s.id) return
    const hours = num(s.hours)
    if (!hours) return
    const hit = out.find((x) => x.id === s.id)
    if (hit) hit.hours = Math.round((hit.hours + hours) * 4) / 4
    else out.push({ id: s.id, hours })
  })
  return out
}

export function primaryOf(segments) {
  let best = null
  ;(segments || []).forEach((s) => {
    if (!best || s.hours > best.hours) best = s
  })
  return best ? best.id : undefined
}

// What to store for a day given its segments: { day, segments } where undefined means
// "delete this key". A plain full day on one job is stored the old way (days only).
export function dayPatchFor(list) {
  const segs = normalizeSegments(list)
  if (!segs.length) return { day: undefined, segments: undefined }
  if (segs.length === 1 && segs[0].hours === FULL_DAY) return { day: segs[0].id, segments: undefined }
  return { day: primaryOf(segs), segments: segs }
}

// Set one job's hours on a day (replacing that job's previous hours; 0 removes it).
export function withJobHours(segments, jobId, hours) {
  const h = num(hours)
  const rest = (segments || []).filter((s) => s.id !== jobId)
  if (!h) return rest
  const idx = (segments || []).findIndex((s) => s.id === jobId)
  const entry = { id: jobId, hours: h }
  if (idx < 0) return [...rest, entry]
  const out = [...(segments || [])]
  out[idx] = entry
  return out
}

export function withoutJob(segments, jobId) {
  return (segments || []).filter((s) => s.id !== jobId)
}

export function hoursLabel(h) {
  const n = num(h)
  return (Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, '')) + 'h'
}

export function overtimeHours(segments) {
  const total = (segments || []).reduce((s, x) => s + x.hours, 0)
  return Math.max(0, Math.round((total - FULL_DAY) * 4) / 4)
}
