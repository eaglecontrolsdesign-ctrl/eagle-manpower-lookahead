import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth, userDocId } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { OFFICES } from '../../engine/constants.js'
import { writeAudit } from '../../context/auditWrite.js'
import { userRoles, toggleRole, primaryRole, rolesLabel } from '../../engine/roles.js'

function lastSeen(ts) {
  if (!ts) return 'Never signed in'
  return 'Last seen ' + new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UsersAdmin() {
  const { user } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [email, setEmail] = useState('')
  const [newName, setNewName] = useState('')
  const me = userDocId(user && user.email)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id)))
    })
  }, [])

  async function save(id, patch, message) {
    try {
      await setDoc(doc(db, 'users', id), { email: id, ...patch, updatedAt: Date.now() }, { merge: true })
      writeAudit(me, 'users', message, Object.entries(patch).map(([k, v]) => id + ' — ' + k + ': ' + (Array.isArray(v) ? v.join(', ') || '(none)' : v || '(none)')))
      toast(message)
    } catch (err) {
      toast('Could not save: ' + err.message, 'error')
    }
  }

  function add(e) {
    e.preventDefault()
    const id = userDocId(email)
    if (!id) return
    save(id, { role: 'member', roles: [], name: newName.trim() }, 'Added ' + id)
    setEmail('')
    setNewName('')
  }

  async function remove(u) {
    if (!window.confirm('Remove ' + u.id + ' from this list? Their login still works; they just lose any role or branch set here.')) return
    try {
      await deleteDoc(doc(db, 'users', u.id))
      writeAudit(me, 'users', 'Removed ' + u.id + ' from the users list', [])
      toast('Removed ' + u.id)
    } catch (err) {
      toast('Could not remove: ' + err.message, 'error')
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 14 }}>
        Everyone who has signed in appears here automatically. A <b>Member</b> (no role) can only view — right for techs
        checking their schedule. <b>Scheduler</b> can edit the board and PM demand. Roles combine — a user can be a
        Scheduler and a Coordinator, or everything at once. <b>Admin</b> unlocks this Administration page. <b>PM</b>{' '}
        sees only their own projects on PM Demand (assign projects to them under Projects). <b>Coordinator</b> answers
        manpower requests for their branch (set a branch for them). Every role can edit the schedule. <b>Branch</b> limits editing: a user with a branch can only change that branch's people and
        projects (other branches are read-only for them); <i>All branches</i> is unrestricted. Accounts themselves are still
        created in Firebase Authentication — to add someone before their first sign-in, enter their email below.
      </p>

      {users === null ? (
        <div className="empty-block">Loading…</div>
      ) : users.length === 0 ? (
        <div className="empty-block">No users yet.</div>
      ) : (
        users.map((u) => {
          const self = u.id === me
          const roles = userRoles(u)
          const setRoles = (next) => save(u.id, { roles: next, role: primaryRole(next) }, u.id + ': ' + rolesLabel(next) + (next.includes('coordinator') && !u.branch ? ' — set their branch too' : ''))
          return (
            <div key={u.id} className="card-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
              <input
                key={u.id + '|' + (u.name || '')}
                className="user-name-input"
                placeholder="Name"
                defaultValue={u.name || ''}
                title="Display name — shown instead of the email on requests, the activity log and the sidebar"
                onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                onBlur={(e) => {
                  const v = e.target.value.trim()
                  if (v !== (u.name || '')) save(u.id, { name: v }, v ? u.id + ' is now shown as ' + v : 'Name cleared for ' + u.id)
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.id}
                  {self && (
                    <span className="badge info" style={{ marginLeft: 8 }}>
                      You
                    </span>
                  )}
                </div>
                <div className="person-role">{lastSeen(u.lastSeenAt)}</div>
              </div>
              <select
                className="pill-select"
                value={u.branch || ''}
                onChange={(e) => save(u.id, { branch: e.target.value }, 'Branch saved for ' + u.id)}
                title="Branch this user belongs to"
                style={{ width: 150 }}
              >
                <option value="">All branches</option>
                {OFFICES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <div className="pill-tabs" title={self ? "You can't change your own roles" : 'Toggle roles: Scheduler (edits the board) · PM (own projects only on PM Demand) · Coordinator (answers manpower requests for their branch) · Admin. None = Member, view only.'}>
                <button className={'pill-tab' + (!roles.length ? ' on' : '')} disabled={self} onClick={() => setRoles([])}>
                  Member
                </button>
                <button className={'pill-tab' + (roles.includes('scheduler') ? ' on' : '')} disabled={self} onClick={() => setRoles(toggleRole(roles, 'scheduler'))}>
                  Scheduler
                </button>
                <button className={'pill-tab' + (roles.includes('pm') ? ' on' : '')} disabled={self} onClick={() => setRoles(toggleRole(roles, 'pm'))}>
                  PM
                </button>
                <button className={'pill-tab' + (roles.includes('coordinator') ? ' on' : '')} disabled={self} onClick={() => setRoles(toggleRole(roles, 'coordinator'))}>
                  Coordinator
                </button>
                <button className={'pill-tab' + (roles.includes('admin') ? ' on' : '')} disabled={self} onClick={() => setRoles(toggleRole(roles, 'admin'))}>
                  Admin
                </button>
              </div>
              <button className="icon-btn" disabled={self} onClick={() => remove(u)} title={self ? "You can't remove yourself" : 'Remove from list'}>
                &#10005;
              </button>
            </div>
          )
        })
      )}

      <form onSubmit={add} style={{ display: 'flex', gap: 6, marginTop: 16 }}>
        <input type="email" placeholder="Add by email before first sign-in…" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 2 }} />
        <input placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
    </div>
  )
}
