import { describe, it, expect } from 'vitest'
import { isRestricted, personEditable, projectEditable, mapKeyEditable, partitionMapPatch, readOnlyReason } from '../src/engine/permissions.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { demandKey } from '../src/engine/demand.js'
import { makeDb } from './helpers.js'

const clt = { id: 'p1', name: 'Ann', office: 'Charlotte' }
const nash = { id: 'p2', name: 'Bob', office: 'Nashville' }
const noOffice = { id: 'p3', name: 'Cy' }
const nashUser = { isAdmin: false, branch: 'Nashville', me: 'pm@x.com' }

describe('permissions', () => {
  it('admins and users with no branch are unrestricted', () => {
    expect(isRestricted({ isAdmin: true, branch: 'Nashville' })).toBe(false)
    expect(isRestricted({ isAdmin: false, branch: '' })).toBe(false)
    expect(personEditable(nash, { isAdmin: true, branch: 'Charlotte' })).toBe(true)
    expect(personEditable(nash, { isAdmin: false, branch: '' })).toBe(true)
    expect(isRestricted(nashUser)).toBe(true)
  })

  it('a branch user can only edit people in their branch (missing office = Charlotte)', () => {
    expect(personEditable(nash, nashUser)).toBe(true)
    expect(personEditable(clt, nashUser)).toBe(false)
    expect(personEditable(noOffice, nashUser)).toBe(false)
    expect(personEditable(noOffice, { isAdmin: false, branch: 'Charlotte' })).toBe(true)
    expect(personEditable(undefined, nashUser)).toBe(false)
  })

  it('projects: own branch, shared, or managed by the user are editable', () => {
    expect(projectEditable({ id: 'j', office: 'Nashville' }, nashUser)).toBe(true)
    expect(projectEditable({ id: 'j', office: '' }, nashUser)).toBe(true)
    expect(projectEditable({ id: 'j', office: 'Charlotte' }, nashUser)).toBe(false)
    expect(projectEditable({ id: 'j', office: 'Charlotte', pmEmail: 'PM@x.com' }, nashUser)).toBe(true)
    expect(projectEditable(undefined, nashUser)).toBe(false)
  })

  it('map keys resolve to the person or project they belong to', () => {
    const db = makeDb({ people: [clt, nash], projects: [{ id: 'j1', office: 'Charlotte' }, { id: 'j2', office: '' }] })
    expect(mapKeyEditable(db, 'days', dayKeyOf('p2', '2026-01-05', 0), nashUser)).toBe(true)
    expect(mapKeyEditable(db, 'notes', dayKeyOf('p1', '2026-01-05', 0), nashUser)).toBe(false)
    expect(mapKeyEditable(db, 'demands', demandKey('j1', '2026-01-05'), nashUser)).toBe(false)
    expect(mapKeyEditable(db, 'demands', demandKey('j2', '2026-01-05'), nashUser)).toBe(true)
    expect(mapKeyEditable(db, 'days', dayKeyOf('p1', '2026-01-05', 0), { isAdmin: true, branch: 'Nashville' })).toBe(true)
  })

  it('partitionMapPatch keeps allowed entries and counts the blocked ones', () => {
    const db = makeDb({ people: [clt, nash] })
    const entries = { [dayKeyOf('p1', 'w', 0)]: 'j', [dayKeyOf('p2', 'w', 0)]: 'j', [dayKeyOf('p2', 'w', 1)]: undefined }
    const { allowed, blocked } = partitionMapPatch(db, 'days', entries, nashUser)
    expect(Object.keys(allowed)).toEqual([dayKeyOf('p2', 'w', 0), dayKeyOf('p2', 'w', 1)])
    expect(blocked).toBe(1)
  })

  it('readOnlyReason names the person and both branches', () => {
    expect(readOnlyReason(clt, nashUser)).toContain('Charlotte')
    expect(readOnlyReason(clt, nashUser)).toContain('Nashville')
    expect(readOnlyReason(nash, nashUser)).toBe('')
  })
})
