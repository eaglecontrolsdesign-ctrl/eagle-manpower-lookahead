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
