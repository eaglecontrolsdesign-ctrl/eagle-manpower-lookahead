// Branch-restricted editing (app-level).
//
// A user with a branch set on their users/{email} record may only change the schedule of people
// in that branch, and PM demand for projects in that branch (shared projects, and projects they
// manage, stay editable). Admins and users with no branch ("All branches") are unrestricted.
//
// This is enforced in the app — the board context refuses the write and the UI shows the cells
// as read-only — not in Firestore rules: the whole board lives in one document that the Project
// Command Center sync reads, so it cannot be split into per-branch documents without changing
// that integration.

export const DEFAULT_OFFICE = 'Charlotte'

// scope = { isAdmin, branch, me, viewer } — me is the user's lowercased email (for
// project.pmEmail); viewer is true for an account with no role at all (engine/roles.js).
export function isViewer(scope) {
  return !!(scope && scope.viewer)
}

// Branch-limited: may edit only their own branch.
export function isRestricted(scope) {
  return !!(scope && scope.branch && !scope.isAdmin)
}

// Anything less than full editing rights — the board context and the UI gate on this.
export function isLimited(scope) {
  return isViewer(scope) || isRestricted(scope)
}

export const VIEW_ONLY_REASON = 'Your account is view-only — ask an administrator for the Scheduler role to make changes'

export function personEditable(person, scope) {
  if (isViewer(scope)) return false
  if (!isRestricted(scope)) return true
  if (!person) return false
  return (person.office || DEFAULT_OFFICE) === scope.branch
}

export function projectEditable(project, scope) {
  if (isViewer(scope)) return false
  if (!isRestricted(scope)) return true
  if (!project) return false
  if (!project.office || project.office === scope.branch) return true
  return !!(scope.me && project.pmEmail && project.pmEmail.trim().toLowerCase() === scope.me)
}

// Map-field keys: days/notes are "personId|week|day", demands are "projectId|week".
export function personIdOfKey(key) {
  return String(key).split('|')[0]
}

export function mapKeyEditable(board, field, key, scope) {
  if (isViewer(scope)) return false
  if (!isRestricted(scope)) return true
  const id = personIdOfKey(key)
  if (field === 'demands') return projectEditable(board.projects.find((p) => p.id === id), scope)
  return personEditable(board.people.find((p) => p.id === id), scope)
}

// Split a map-field patch into the entries this user may write and the ones they may not.
export function partitionMapPatch(board, field, entries, scope) {
  const allowed = {}
  let blocked = 0
  Object.entries(entries).forEach(([k, v]) => {
    if (mapKeyEditable(board, field, k, scope)) allowed[k] = v
    else blocked++
  })
  return { allowed, blocked }
}

export function readOnlyReason(person, scope) {
  if (isViewer(scope)) return VIEW_ONLY_REASON
  if (!person || personEditable(person, scope)) return ''
  return person.name + ' is in the ' + (person.office || DEFAULT_OFFICE) + ' branch — read-only for you (' + scope.branch + ')'
}
