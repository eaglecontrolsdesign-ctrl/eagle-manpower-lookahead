import { describe, it, expect } from 'vitest'
import { trackerNoteKind, trackerNoteFor, demandSig, trackerDemand, rolesLine } from '../src/engine/trackerNotes.js'

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

// The same record and the same expected signature are pinned in the PCC's tools/test.js
// (functions/lookahead-sync.js demandSig): if either side changes, both tests have to.
const REC = {
  pmId: 'per_a',
  status: 'draft',
  notes: 'From the PCC',
  roles: [
    { role: 'Programmer', heads: 5, hours: 38 },
    { role: 'Controls Technician', heads: 1, hours: 40 },
  ],
}
const SIG =
  '{"notes":"From the PCC","pmId":"per_a","roles":[{"heads":5,"hours":38,"role":"Programmer"},{"heads":1,"hours":40,"role":"Controls Technician"}],"status":"draft"}'

describe('PM demand from the tracker', () => {
  it('signs a record exactly as the PCC does', () => {
    expect(demandSig(REC)).toBe(SIG)
  })
  it('draft while untouched; edited or confirmed once a PM changes it; entered here is not the tracker’s', () => {
    expect(trackerDemand({ ...REC, source: 'pcc', pccSig: SIG })).toEqual({ state: 'draft', notes: 'From the PCC' })
    expect(trackerDemand({ ...REC, source: 'pcc', pccSig: SIG, roles: [{ role: 'Programmer', heads: 2, hours: 40 }] }).state).toBe('edited')
    expect(trackerDemand({ ...REC, source: 'pcc', pccSig: SIG, status: 'confirmed' }).state).toBe('confirmed')
    expect(trackerDemand(REC)).toBe(null)
    expect(trackerDemand(null)).toBe(null)
  })
  it('lists the roles as people × hours', () => {
    expect(rolesLine(REC)).toBe('Programmer 5 × 38h · Controls Technician 1 × 40h')
  })
})
