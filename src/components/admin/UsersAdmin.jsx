import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth, userDocId } from '../../context/AuthContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { OFFICES } from '../../engine/constants.js'

function lastSeen(ts) {
  if (!ts) return 'Never signed in'
  return 'Last seen ' + new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function UsersAdmin() {
  const { user } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState(null)
  const [email, setEmail] = useState('')
  const me = userDocId(user && user.email)

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.id.localeCompare(b.id)))
    })
  }, [])

  async function save(id, patch, message) {
    try {
      await setDoc(doc(db, 'users', id), { email: id, ...patch, updatedAt: Date.now() }, { merge: true })
      toast(message)
    } catch (err) {
      toast('Could not save: ' + err.message, 'error')
    }
  }

  function add(e) {
    e.preventDefault()
    const id = userDocId(email)
    if (!id) return
    save(id, { role: 'member' }, 'Added ' + id)
    setEmail('')
  }

  async function remove(u) {
    if (!window.confirm('Remove ' + u.id + ' from this list? Their login still works; they just lose any role or branch set here.')) return
    try {
      await deleteDoc(doc(db, 'users', u.id))
      toast('Removed ' + u.id)
    } catch (err) {
      toast('Could not remove: ' + err.message, 'error')
    }
  }

  return (
    <div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 0, marginBottom: 14 }}>
        Everyone who has signed in appears here automatically. <b>Admin</b> unlocks this Administration page. <b>PM</b>{' '}
        sees only their own projects on PM Demand (assign projects to them under Projects). Everyone keeps full
        scheduling access. <b>Branch</b> is the office a user belongs to. Accounts themselves are still
        created in Firebase Authentication — to add someone before their first sign-in, enter their email below.
      </p>

      {users === null ? (
        <div className="empty-block">Loading…</div>
      ) : users.length === 0 ? (
        <div className="empty-block">No users yet.</div>
      ) : (
        users.map((u) => {
          const self = u.id === me
          const role = u.role === 'admin' || u.role === 'pm' ? u.role : 'member'
          return (
            <div key={u.id} className="card-row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
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
              <div className="pill-tabs" title={self ? "You can't change your own role" : 'Member · PM (own projects only on PM Demand) · Admin'}>
                <button className={'pill-tab' + (role === 'member' ? ' on' : '')} disabled={self} onClick={() => save(u.id, { role: 'member' }, u.id + ' is now a member')}>
                  Member
                </button>
                <button className={'pill-tab' + (role === 'pm' ? ' on' : '')} disabled={self} onClick={() => save(u.id, { role: 'pm' }, u.id + ' is now a project manager')}>
                  PM
                </button>
                <button className={'pill-tab' + (role === 'admin' ? ' on' : '')} disabled={self} onClick={() => save(u.id, { role: 'admin' }, u.id + ' is now an admin')}>
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
        <input type="email" placeholder="Add by email before first sign-in…" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ flex: 1 }} />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
    </div>
  )
}
