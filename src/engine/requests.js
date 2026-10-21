// Manpower requests: asking another branch's coordinator for one of their people.
//
// A request names a person, specific days in one week, and the project the requester wants
// them on. It goes to the coordinator(s) of the person's branch (users with the coordinator
// role and that branch); admins see everything. Approving applies the schedule change.
// Each request is its own Firestore document (requests/{id}), so the rules enforce who may
// create, reply to, and resolve it.

import { DEFAULT_OFFICE } from './permissions.js'
import { hasRole } from './roles.js'

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
export const REQUEST_STATUS = { open: 'Open', approved: 'Approved', declined: 'Declined', cancelled: 'Cancelled' }

export function labelDays(indexes) {
  const sorted = [...indexes].sort((a, b) => a - b)
  if (!sorted.length) return ''
  if (sorted.length === 1) return DAY_LABELS[sorted[0]]
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  return contiguous ? DAY_LABELS[sorted[0]] + '–' + DAY_LABELS[sorted[sorted.length - 1]] : sorted.map((i) => DAY_LABELS[i]).join(', ')
}

export function branchOf(person) {
  return (person && person.office) || DEFAULT_OFFICE
}

export function coordinatorsFor(users, branch) {
  return (users || []).filter((u) => hasRole(u, 'coordinator') && u.branch === branch)
}

// Who may approve or decline: the branch's coordinator, or an admin. scope = { isAdmin, roles, branch }.
export function canResolve(req, scope) {
  if (!req || !scope) return false
  if (scope.isAdmin) return true
  return hasRole(scope, 'coordinator') && !!scope.branch && scope.branch === req.toBranch
}

export function requestCellKeys(req) {
  return (req.dayIndexes || []).map((i) => req.personId + '|' + req.wkKey + '|' + i)
}

// Open requests indexed by the day cells they cover, for the board badges.
export function openRequestsByCell(requests) {
  const out = {}
  ;(requests || []).forEach((r) => {
    if (r.status !== 'open') return
    requestCellKeys(r).forEach((k) => {
      if (!out[k]) out[k] = r
    })
  })
  return out
}

export function needsMyAction(requests, scope) {
  return (requests || []).filter((r) => r.status === 'open' && canResolve(r, scope))
}

export function myRequests(requests, me) {
  return (requests || []).filter((r) => r.fromEmail === me)
}

// Requests of mine that were resolved and I haven't looked at yet.
export function unseenResolved(requests, me) {
  return myRequests(requests, me).filter((r) => r.status !== 'open' && !r.requesterSeen)
}

export function buildRequest({ me, person, wkKey, dayIndexes, project, message, currentValues }) {
  const days = [...dayIndexes].sort((a, b) => a - b)
  return {
    status: 'open',
    fromEmail: me,
    toBranch: branchOf(person),
    personId: person.id,
    personName: person.name,
    wkKey,
    dayIndexes: days,
    projectId: project.id,
    projectName: project.name,
    // What those days held when the request was made, for the coordinator's context.
    currentValues: currentValues || {},
    message: (message || '').trim(),
    thread: [],
    requesterSeen: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}
