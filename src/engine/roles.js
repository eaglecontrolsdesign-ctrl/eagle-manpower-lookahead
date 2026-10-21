// Account roles (users/{email}). An account can hold any combination of Scheduler, PM,
// Coordinator and Admin. Any role may edit the board; none of them is a view-only Member (a
// tech checking their schedule). Stored as `roles` (array); `role` is kept alongside as the
// highest-ranking one for anything that still reads a single value.

export const ACCOUNT_ROLES = ['scheduler', 'pm', 'coordinator', 'admin']
export const ROLE_LABEL = { scheduler: 'Scheduler', pm: 'PM', coordinator: 'Coordinator', admin: 'Admin', member: 'Member (view only)' }
const RANK = { admin: 4, coordinator: 3, pm: 2, scheduler: 1 }

// View-only: no role at all. Every role, Scheduler included, may make changes.
export function canEdit(u) {
  return userRoles(u).length > 0
}

export function userRoles(u) {
  if (!u) return []
  if (Array.isArray(u.roles)) return ACCOUNT_ROLES.filter((r) => u.roles.includes(r))
  return ACCOUNT_ROLES.includes(u.role) ? [u.role] : []
}

export function hasRole(u, role) {
  return userRoles(u).includes(role)
}

// The single value to store in `role` for a set of roles (highest rank wins).
export function primaryRole(roles) {
  return [...(roles || [])].sort((a, b) => (RANK[b] || 0) - (RANK[a] || 0))[0] || 'member'
}

export function toggleRole(roles, role) {
  const set = new Set(roles || [])
  if (set.has(role)) set.delete(role)
  else set.add(role)
  return ACCOUNT_ROLES.filter((r) => set.has(r))
}

export function rolesLabel(roles) {
  return roles && roles.length ? roles.map((r) => ROLE_LABEL[r] || r).join(', ') : ROLE_LABEL.member
}

// Sort key for lists of users: PMs first, then coordinators, then admins, then members.
export function rolesSortKey(u) {
  const r = userRoles(u)
  return r.length ? Math.min(...r.map((x) => ({ pm: 0, coordinator: 1, admin: 2, scheduler: 3 })[x])) : 4
}
