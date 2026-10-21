import { addDoc, collection, doc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase.js'
import { buildAuditEntry } from '../engine/audit.js'

// Writing activity-log entries (engine/audit.js). Entries are append-only and expire after a
// year via the expiresAt field (a Firestore TTL policy on the audit collection).

export function auditDoc(entry) {
  const { expiresAtMs, ...rest } = entry
  return { ...rest, expiresAt: Timestamp.fromMillis(expiresAtMs) }
}

// A fresh reference for an entry that will be created inside a batch (see BoardContext).
export function newAuditRef() {
  return doc(collection(db, 'audit'))
}

// Fire-and-forget log for actions outside the board document (users, requests, sign-ins).
export function writeAudit(by, area, action, lines) {
  if (!by) return Promise.resolve()
  return addDoc(collection(db, 'audit'), auditDoc(buildAuditEntry({ by, area, action, lines }))).catch(() => {})
}
