import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase.js'

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
        setRole(data.role || null)
        setBranch(data.branch || '')
        setRoleLoading(false)
      },
      () => {
        setRole(null)
        setBranch('')
        setRoleLoading(false)
      }
    )
    return unsub
  }, [user])

  async function signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signOut() {
    await fbSignOut(auth)
  }

  const isAdmin = role === 'admin'

  return <AuthContext.Provider value={{ user, loading, role, branch, roleLoading, isAdmin, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
