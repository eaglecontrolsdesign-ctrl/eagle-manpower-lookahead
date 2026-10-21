import { describe, it, expect } from 'vitest'
import { labelDays, branchOf, coordinatorsFor, canResolve, openRequestsByCell, needsMyAction, unseenResolved, buildRequest } from '../src/engine/requests.js'

const nashCoord = { isAdmin: false, role: 'coordinator', branch: 'Nashville' }
const cltCoord = { isAdmin: false, role: 'coordinator', branch: 'Charlotte' }
const member = { isAdmin: false, role: 'member', branch: 'Nashville' }
const admin = { isAdmin: true, role: 'admin', branch: '' }

describe('requests', () => {
  it('labelDays collapses contiguous runs', () => {
    expect(labelDays([1, 2, 3])).toBe('Tue–Thu')
    expect(labelDays([0, 2])).toBe('Mon, Wed')
    expect(labelDays([4])).toBe('Fri')
  })

  it('branchOf defaults to Charlotte and coordinatorsFor matches role + branch', () => {
    expect(branchOf({ id: 'p' })).toBe('Charlotte')
    expect(branchOf({ id: 'p', office: 'Nashville' })).toBe('Nashville')
    const users = [
      { id: 'a', role: 'coordinator', branch: 'Nashville' },
      { id: 'b', role: 'coordinator', branch: 'Charlotte' },
      { id: 'c', role: 'member', branch: 'Nashville' },
      { id: 'd', roles: ['pm', 'coordinator'], branch: 'Nashville' },
    ]
    expect(coordinatorsFor(users, 'Nashville').map((u) => u.id)).toEqual(['a', 'd'])
  })

  it('only the branch coordinator or an admin can resolve', () => {
    const req = { status: 'open', toBranch: 'Nashville' }
    expect(canResolve(req, nashCoord)).toBe(true)
    // Roles can be combined: a PM who is also the Nashville coordinator.
    expect(canResolve(req, { isAdmin: false, roles: ['pm', 'coordinator'], branch: 'Nashville' })).toBe(true)
    expect(canResolve(req, { isAdmin: false, roles: ['pm'], branch: 'Nashville' })).toBe(false)
    expect(canResolve(req, cltCoord)).toBe(false)
    expect(canResolve(req, member)).toBe(false)
    expect(canResolve(req, admin)).toBe(true)
  })

  it('openRequestsByCell indexes only open requests by their day cells', () => {
    const open = { id: 'r1', status: 'open', personId: 'p1', wkKey: 'w', dayIndexes: [1, 2] }
    const done = { id: 'r2', status: 'approved', personId: 'p1', wkKey: 'w', dayIndexes: [3] }
    const map = openRequestsByCell([open, done])
    expect(Object.keys(map)).toEqual(['p1|w|1', 'p1|w|2'])
    expect(map['p1|w|1'].id).toBe('r1')
  })

  it('needsMyAction and unseenResolved pick the right requests', () => {
    const reqs = [
      { id: 'a', status: 'open', toBranch: 'Nashville', fromEmail: 'x@y' },
      { id: 'b', status: 'open', toBranch: 'Charlotte', fromEmail: 'me@y' },
      { id: 'c', status: 'declined', toBranch: 'Charlotte', fromEmail: 'me@y', requesterSeen: false },
      { id: 'd', status: 'approved', toBranch: 'Charlotte', fromEmail: 'me@y', requesterSeen: true },
    ]
    expect(needsMyAction(reqs, nashCoord).map((r) => r.id)).toEqual(['a'])
    expect(needsMyAction(reqs, admin).map((r) => r.id)).toEqual(['a', 'b'])
    expect(unseenResolved(reqs, 'me@y').map((r) => r.id)).toEqual(['c'])
  })

  it('buildRequest fills the document from the person, week, days and project', () => {
    const r = buildRequest({ me: 'me@y', person: { id: 'p1', name: 'Ann', office: 'Nashville' }, wkKey: 'w', dayIndexes: [2, 0], project: { id: 'j1', name: 'Job' }, message: ' hi ' })
    expect(r.status).toBe('open')
    expect(r.toBranch).toBe('Nashville')
    expect(r.dayIndexes).toEqual([0, 2])
    expect(r.projectName).toBe('Job')
    expect(r.message).toBe('hi')
    expect(r.requesterSeen).toBe(true)
  })
})
