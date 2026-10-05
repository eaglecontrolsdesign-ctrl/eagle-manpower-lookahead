import { describe, it, expect } from 'vitest'
import { trackerNoteKind, trackerNoteFor } from '../src/engine/trackerNotes.js'

const SCHED = '📅 PCC · C11314 AWS CLT-100 — scheduled by the tracker: 1035 Install BAS network backbone & switches'
const CLASH =
  "⚠ PCC · C11314 AWS CLT-100 — the tracker's schedule has Ryan Breen on this job today: 1035 Install BAS network backbone & switches. Kept as booked here (PTO / Vacation)."

describe('tracker notes', () => {
  it('tells the tracker’s notes from people’s own', () => {
    expect(trackerNoteKind(SCHED)).toBe('scheduled')
    expect(trackerNoteKind(CLASH)).toBe('conflict')
    expect(trackerNoteKind('Badge pickup 7am')).toBe(null)
    expect(trackerNoteKind(undefined)).toBe(null)
  })

  it('over a run of days: the clash wins, and an own note is still flagged', () => {
    const notes = {
      'per_r|2026-10-05|0': SCHED,
      'per_r|2026-10-05|1': CLASH,
      'per_r|2026-10-05|2': 'Badge pickup 7am',
    }
    expect(trackerNoteFor(notes, 'per_r', '2026-10-05', [0])).toEqual({ tracker: { kind: 'scheduled', text: SCHED }, ownNote: false })
    expect(trackerNoteFor(notes, 'per_r', '2026-10-05', [0, 1, 2])).toEqual({
      tracker: { kind: 'conflict', text: CLASH },
      ownNote: true,
    })
    expect(trackerNoteFor(notes, 'per_r', '2026-10-05', [3])).toEqual({ tracker: null, ownNote: false })
  })
})
