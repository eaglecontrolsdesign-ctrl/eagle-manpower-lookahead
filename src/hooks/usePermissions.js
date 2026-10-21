import { useAuth, userDocId } from '../context/AuthContext.jsx'
import { useBoard } from '../context/BoardContext.jsx'
import { isRestricted, personEditable, projectEditable, readOnlyReason } from '../engine/permissions.js'

// What the signed-in user may edit on the board (engine/permissions.js). Admins and users with
// no branch may edit everything; a branch user only their branch.
export function usePermissions() {
  const { user, isAdmin, role, branch } = useAuth()
  const { board } = useBoard()
  const scope = { isAdmin, role, branch: branch || '', me: userDocId(user && user.email) }
  const restricted = isRestricted(scope)
  const findPerson = (id) => (board ? board.people.find((p) => p.id === id) : null)
  return {
    scope,
    restricted,
    branch: scope.branch,
    canEditPerson: (personId) => !restricted || personEditable(findPerson(personId), scope),
    canEditProject: (projectId) => !restricted || projectEditable(board && board.projects.find((p) => p.id === projectId), scope),
    lockReason: (personId) => (restricted ? readOnlyReason(findPerson(personId), scope) : ''),
  }
}
