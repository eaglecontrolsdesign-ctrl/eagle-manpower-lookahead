import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'
import { writeAudit } from './auditWrite.js'
import { userRoles, primaryRole } from '../engine/roles.js'

const AuthContext = createContext(null)

// Account -> role lives in Firestore (users/{email}), not a Firebase Auth custom claim — custom
// claims require the Admin SDK (a Cloud Function), which this app deliberately has none of. The
// doc id is the account's own lowercased email, so an admin can grant a role before that person
// has ever signed in (their Firebase Auth account still has to exist first — created in the
// Firebase console, since this app has no public sign-up flow).
export function userDocId(email) {
  return (email || '').trim().toLowerCase()
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  // All of the account's roles (engine/roles.js) — any mix of pm / coordinator / admin.
  const [roles, setRoles] = useState([])
  const [branch, setBranch] = useState('')
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!user || !user.email) {
      setRole(null)
      setRoles([])
      setBranch('')
      setRoleLoading(false)
      return
    }
    setRoleLoading(true)
    const id = userDocId(user.email)
    const ref = doc(db, 'users', id)
    // Register this account on first sign-in (and keep lastSeenAt current) so the Users page can
    // list everyone who has ever logged in. The rules let an account write only these fields on
    // its own record — never role or branch.
    setDoc(ref, { email: id, lastSeenAt: Date.now() }, { merge: true }).catch(() => {})
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.exists() ? snap.data() : {}
        const r = userRoles(data)
        setRoles(r)
        setRole(r.length ? primaryRole(r) : null)
        setBranch(data.branch || '')
        setRoleLoading(false)
      },
      () => {
        setRole(null)
        setRoles([])
        setBranch('')
        setRoleLoading(false)
      }
    )
    return unsub
  }, [user])

  async function signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    // Logged on an actual sign-in, not on every page load that restores the session.
    writeAudit(userDocId(cred.user && cred.user.email), 'auth', 'Signed in', [])
  }

  async function signOut() {
    await writeAudit(userDocId(user && user.email), 'auth', 'Signed out', [])
    await fbSignOut(auth)
  }

  const isAdmin = roles.includes('admin')
  // Project managers only see the projects assigned to them (project.pmEmail) on PM Demand.
  const isPm = roles.includes('pm')
  // Coordinators answer manpower requests for their branch (engine/requests.js).
  const isCoordinator = roles.includes('coordinator')
  // Any role may edit; an account with none is view-only (engine/roles.js).
  const canEdit = roles.length > 0

  return <AuthContext.Provider value={{ user, loading, role, roles, branch, roleLoading, isAdmin, isPm, isCoordinator, canEdit, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
