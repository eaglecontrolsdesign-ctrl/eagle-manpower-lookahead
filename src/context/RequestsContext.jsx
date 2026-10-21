import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { addDoc, arrayUnion, collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore'
import { db } from '../firebase.js'
import { useAuth, userDocId } from './AuthContext.jsx'
import { useToast } from './ToastContext.jsx'
import { canResolve, needsMyAction, unseenResolved, coordinatorsFor, labelDays } from '../engine/requests.js'
import { writeAudit } from './auditWrite.js'

const RequestsContext = createContext(null)

// Manpower requests (engine/requests.js) live in their own collection, requests/{id}, one
// document each — so, unlike the board, the Firestore rules can say exactly who may create,
// answer, and resolve each one. Everyone sees the list; what they can do with it is decided
// by their role and branch (users/{email}).
export function RequestsProvider({ children }) {
  const { user, role, roles, branch, isAdmin } = useAuth()
  const toast = useToast()
  const [requests, setRequests] = useState([])
  const [users, setUsers] = useState([])
  const [ready, setReady] = useState(false)
  const me = userDocId(user && user.email)
  const scope = { isAdmin, role, roles, branch: branch || '', me }
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const seenRef = useRef(null)

  useEffect(() => {
    if (!user) {
      setRequests([])
      setReady(false)
      seenRef.current = null
      return
    }
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(300))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setRequests(list)
        setReady(true)
        // Announce requests that arrive for me while the app is open (not the initial load).
        if (seenRef.current) {
          snap.docChanges().forEach((c) => {
            if (c.type !== 'added' || seenRef.current.has(c.doc.id)) return
            const r = c.doc.data()
            if (r.status === 'open' && r.fromEmail !== scopeRef.current.me && canResolve(r, scopeRef.current)) {
              toast('New manpower request from ' + r.fromEmail + ': ' + r.personName + ' for ' + r.projectName, 'default', 6000)
            }
          })
        }
        seenRef.current = new Set(snap.docs.map((d) => d.id))
      },
      () => setReady(true)
    )
    return unsub
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user) return
    return onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => {}
    )
  }, [user])

  function describe(r) {
    return r.personName + ' · ' + labelDays(r.dayIndexes || []) + ' · week of ' + r.wkKey + ' · for ' + r.projectName + ' · ' + r.toBranch + ' coordinator'
  }

  async function createRequest(data) {
    await addDoc(collection(db, 'requests'), data)
    writeAudit(me, 'requests', 'Sent a manpower request', [describe(data), data.message ? '"' + data.message + '"' : ''])
  }

  function entry(text) {
    return { by: me, text, at: Date.now() }
  }

  async function reply(id, text) {
    await updateDoc(doc(db, 'requests', id), { thread: arrayUnion(entry(text)), updatedAt: Date.now() })
  }

  // Coordinator / admin outcome. The schedule change itself is applied by the caller (it needs
  // the board context); this only records the decision.
  async function resolve(id, status, note) {
    const patch = { status, resolvedBy: me, resolvedAt: Date.now(), updatedAt: Date.now(), requesterSeen: false }
    if (note) patch.thread = arrayUnion(entry(note))
    await updateDoc(doc(db, 'requests', id), patch)
    const r = requests.find((x) => x.id === id)
    writeAudit(me, 'requests', (status === 'approved' ? 'Approved' : 'Declined') + ' a manpower request from ' + (r ? r.fromEmail : '?'), [r ? describe(r) : id, note || ''])
  }

  async function cancel(id) {
    await updateDoc(doc(db, 'requests', id), { status: 'cancelled', updatedAt: Date.now() })
    const r = requests.find((x) => x.id === id)
    writeAudit(me, 'requests', 'Withdrew a manpower request', [r ? describe(r) : id])
  }

  async function markSeen(ids) {
    await Promise.all(ids.map((id) => updateDoc(doc(db, 'requests', id), { requesterSeen: true }).catch(() => {})))
  }

  const actionable = needsMyAction(requests, scope)
  const unseen = unseenResolved(requests, me)

  const value = {
    requests,
    ready,
    users,
    me,
    scope,
    actionable,
    unseen,
    badgeCount: actionable.length + unseen.length,
    canResolve: (r) => canResolve(r, scope),
    coordinatorsFor: (b) => coordinatorsFor(users, b),
    createRequest,
    reply,
    resolve,
    cancel,
    markSeen,
  }

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>
}

export function useRequests() {
  const ctx = useContext(RequestsContext)
  if (!ctx) throw new Error('useRequests must be used within RequestsProvider')
  return ctx
}
