import { useAuth, userDocId } from '../context/AuthContext.jsx'
import { useBoard } from '../context/BoardContext.jsx'
import { isRestricted, isViewer, isLimited, personEditable, projectEditable, readOnlyReason } from '../engine/permissions.js'

// What the signed-in user may edit on the board (engine/permissions.js). Admins and users with
// no branch may edit everything; a branch user only their branch.
export function usePermissions() {
  const { user, isAdmin, role, roles, branch, canEdit } = useAuth()
  const { board } = useBoard()
  const scope = { isAdmin, role, roles, branch: branch || '', me: userDocId(user && user.email), viewer: !canEdit }
  // restricted: branch-limited; viewer: no editing at all; limited: either.
  const restricted = isRestricted(scope)
  const viewer = isViewer(scope)
  const limited = isLimited(scope)
  const findPerson = (id) => (board ? board.people.find((p) => p.id === id) : null)
  return {
    scope,
    restricted,
    viewer,
    limited,
    branch: scope.branch,
    canEditPerson: (personId) => !limited || personEditable(findPerson(personId), scope),
    canEditProject: (projectId) => !limited || projectEditable(board && board.projects.find((p) => p.id === projectId), scope),
    lockReason: (personId) => (limited ? readOnlyReason(findPerson(personId), scope) : ''),
  }
}
