// The Project Command Center (the project tracker) fills this board from each project's schedule
// and marks every day it touched with a day note (its functions/lookahead-sync.js):
//   '📅 PCC · <job> — scheduled by the tracker: <schedule rows>'  — it put the person there
//   '⚠ PCC · <job> — the tracker's schedule has <name> on this job today: … Kept as booked here (…)'
//                                                                 — it wanted them, someone booked otherwise
// The board shows those as badges on the day's chip instead of a plain note dot.

export const TRACKER_SCHEDULED = '📅 PCC · '
export const TRACKER_CONFLICT = '⚠ PCC · '

export function trackerNoteKind(text) {
  if (typeof text !== 'string') return null
  if (text.startsWith(TRACKER_SCHEDULED)) return 'scheduled'
  if (text.startsWith(TRACKER_CONFLICT)) return 'conflict'
  return null
}

// ---- PM demand the tracker wrote ----
// A week's demand record the PCC wrote carries source 'pcc' and pccSig, a signature of what it
// wrote. While the record still matches it, the PCC keeps it up to date from the schedule; once a
// PM edits or confirms it here, the PCC leaves that week alone. demandSig must stay the same as
// the PCC's (functions/lookahead-sync.js) — both repos' tests pin the same value.
function stableJson(v) {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']'
  return (
    '{' +
    Object.keys(v)
      .filter((k) => v[k] !== undefined)
      .sort()
      .map((k) => JSON.stringify(k) + ':' + stableJson(v[k]))
      .join(',') +
    '}'
  )
}
export function demandSig(rec) {
  return stableJson({ roles: rec.roles || [], status: rec.status || '', notes: rec.notes || '', pmId: rec.pmId || '' })
}
// → null (entered here) | { state: 'draft' | 'confirmed' | 'edited', notes }
export function trackerDemand(rec) {
  if (!rec || rec.source !== 'pcc') return null
  const pristine = rec.pccSig === demandSig(rec) && rec.status !== 'confirmed'
  return { state: pristine ? 'draft' : rec.status === 'confirmed' ? 'confirmed' : 'edited', notes: rec.notes || '' }
}
export const TRACKER_DEMAND_LABEL = {
  draft: '📅 PCC draft',
  confirmed: '📅 PCC · confirmed',
  edited: '📅 PCC · edited',
}
export function rolesLine(rec) {
  return ((rec && rec.roles) || []).map((r) => `${r.role} ${r.heads} × ${r.hours}h`).join(' · ')
}

// Over a run of days (one chip can span several): the tracker's note, a clash first, and whether
// any day also carries somebody's own note.
export function trackerNoteFor(notes, personId, wkKey, dayIndexes) {
  let tracker = null
  let ownNote = false
  dayIndexes.forEach((i) => {
    const text = (notes || {})[personId + '|' + wkKey + '|' + i]
    if (!text) return
    const kind = trackerNoteKind(text)
    if (!kind) ownNote = true
    else if (!tracker || (kind === 'conflict' && tracker.kind !== 'conflict')) tracker = { kind, text }
  })
  return { tracker, ownNote }
}
