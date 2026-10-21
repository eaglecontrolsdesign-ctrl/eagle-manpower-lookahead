import { describe, it, expect } from 'vitest'
import { buildAuditEntry, describeMapChanges, describeArrayChanges, areaForFields, auditToCsv, RETENTION_DAYS } from '../src/engine/audit.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { demandKey } from '../src/engine/demand.js'
import { makeDb } from './helpers.js'

const db = makeDb({
  people: [{ id: 'p1', name: 'Ann Lee', office: 'Charlotte' }],
  projects: [{ id: 'j1', name: 'Job One' }, { id: 'j2', name: 'Job Two' }],
  overhead: [{ id: '__PTO', name: 'PTO' }],
})
const WK = '2026-10-19'

describe('audit', () => {
  it('buildAuditEntry stamps the author, time and a one-year expiry', () => {
    const e = buildAuditEntry({ by: 'me@x', area: 'board', action: 'Updated schedule', lines: ['a', '', 'b'], at: 1000 })
    expect(e.by).toBe('me@x')
    expect(e.lines).toEqual(['a', 'b'])
    expect(e.expiresAtMs - e.at).toBe(RETENTION_DAYS * 86400000)
  })

  it('merges consecutive day changes for one person into a range line', () => {
    const entries = { [dayKeyOf('p1', WK, 1)]: 'j1', [dayKeyOf('p1', WK, 2)]: 'j1', [dayKeyOf('p1', WK, 4)]: undefined }
    const before = { [dayKeyOf('p1', WK, 4)]: '__PTO' }
    const lines = describeMapChanges(db, 'days', entries, before)
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/^Ann Lee · Tue Oct 20 – Wed Oct 21: free → Job One$/)
    expect(lines[1]).toMatch(/^Ann Lee · Fri Oct 23: PTO → free$/)
  })

  it('skips day changes that end up the same as before', () => {
    const key = dayKeyOf('p1', WK, 0)
    expect(describeMapChanges(db, 'days', { [key]: 'j1' }, { [key]: 'j1' })).toEqual([])
  })

  it('describes notes and PM demand changes', () => {
    const nk = dayKeyOf('p1', WK, 0)
    expect(describeMapChanges(db, 'notes', { [nk]: 'Bring the lift' }, {})[0]).toBe('Added note for Ann Lee · Mon Oct 19: "Bring the lift"')
    expect(describeMapChanges(db, 'notes', { [nk]: undefined }, { [nk]: 'old' })[0]).toBe('Removed note for Ann Lee · Mon Oct 19 ("old")')
    // An untouched day saved as empty by the note editor is not a change.
    expect(describeMapChanges(db, 'notes', { [nk]: undefined }, {})).toEqual([])
    expect(describeMapChanges(db, 'notes', { [nk]: 'same' }, { [nk]: 'same' })).toEqual([])
    expect(describeMapChanges(db, 'demands', { [demandKey('j1', WK)]: undefined }, {})).toEqual([])
    const dk = demandKey('j2', WK)
    const line = describeMapChanges(db, 'demands', { [dk]: { status: 'confirmed', roles: [{ role: 'Tech', heads: 2, hours: 40 }] } }, {})[0]
    expect(line).toBe('PM demand · Job Two · week of Oct 19: confirmed · 2 × Tech @ 40h')
    expect(describeMapChanges(db, 'demands', { [dk]: undefined }, { [dk]: { status: 'draft', roles: [] } })[0]).toContain('cleared')
  })

  it('diffs roster-style arrays into added / removed / changed lines', () => {
    const before = [{ id: 'a', name: 'Ann', office: 'Charlotte' }, { id: 'b', name: 'Bob', office: 'Charlotte', skills: [] }]
    const after = [{ id: 'a', name: 'Ann', office: 'Nashville' }, { id: 'c', name: 'Cy', office: 'Charlotte' }]
    const lines = describeArrayChanges('people', before, after)
    expect(lines).toEqual(['Roster: added Cy', 'Roster: removed Bob', 'Roster: Ann — office: Charlotte → Nashville'])
    expect(describeArrayChanges('staffingRoles', ['Tech'], ['Tech', 'Lead'])).toEqual(['Staffing roles: added Lead'])
  })

  it('picks the area from the fields touched and exports CSV', () => {
    expect(areaForFields(['days'])).toBe('board')
    expect(areaForFields(['demands'])).toBe('demand')
    expect(areaForFields(['days', 'demands'])).toBe('board')
    expect(areaForFields(['projects'])).toBe('admin')
    const csv = auditToCsv([{ at: 0, by: 'me@x', area: 'board', action: 'Updated', lines: ['a "q"', 'b'] }])
    expect(csv.split('\r\n')[1]).toBe('"1970-01-01T00:00:00.000Z","me@x","Manpower Board","Updated","a ""q"" | b"')
  })
})
