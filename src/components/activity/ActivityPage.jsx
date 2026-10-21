import { useEffect, useMemo, useState } from 'react'
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useAuth, userDocId } from '../../context/AuthContext.jsx'
import { AUDIT_AREAS, auditSearchText, auditToCsv } from '../../engine/audit.js'

const RANGES = [
  { key: 7, label: '7 days' },
  { key: 30, label: '30 days' },
  { key: 90, label: '90 days' },
  { key: 0, label: 'All' },
]
const AREA_BADGE = { board: 'info', demand: 'info', admin: 'warn', users: 'warn', requests: 'good', auth: 'na' }

function when(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Everyone can read the activity log (engine/audit.js); nothing in it can be changed.
export default function ActivityPage() {
  const { user } = useAuth()
  const me = userDocId(user && user.email)
  const [entries, setEntries] = useState(null)
  const [who, setWho] = useState('')
  const [area, setArea] = useState('')
  const [days, setDays] = useState(30)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'audit'), orderBy('at', 'desc'), limit(500))
    return onSnapshot(
      q,
      (snap) => setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setEntries([])
    )
  }, [])

  const users = useMemo(() => [...new Set((entries || []).map((e) => e.by))].sort(), [entries])
  const filtered = useMemo(() => {
    const since = days ? Date.now() - days * 86400000 : 0
    const needle = search.trim().toLowerCase()
    return (entries || []).filter((e) => (!who || e.by === who) && (!area || e.area === area) && e.at >= since && (!needle || auditSearchText(e).includes(needle)))
  }, [entries, who, area, days, search])

  function exportCsv() {
    const blob = new Blob([auditToCsv(filtered)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'activity-' + new Date().toISOString().slice(0, 10) + '.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Activity</div>
          <div className="page-subtitle">Who changed what, and when · kept for one year · entries can't be edited or removed</div>
        </div>
        <button className="btn" onClick={exportCsv} disabled={!filtered.length}>
          Export CSV
        </button>
      </div>

      <div className="board-toolbar">
        <div className="pill-tabs">
          <button className={'pill-tab' + (!area ? ' on' : '')} onClick={() => setArea('')}>
            All areas
          </button>
          {Object.entries(AUDIT_AREAS).map(([k, label]) => (
            <button key={k} className={'pill-tab' + (area === k ? ' on' : '')} onClick={() => setArea(k)}>
              {label}
            </button>
          ))}
        </div>
        <div className="pill-tabs">
          {RANGES.map((r) => (
            <button key={r.key} className={'pill-tab' + (days === r.key ? ' on' : '')} onClick={() => setDays(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
        <select className="pill-select" value={who} onChange={(e) => setWho(e.target.value)} title="Filter by user">
          <option value="">Everyone</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u === me ? u + ' (you)' : u}
            </option>
          ))}
        </select>
        <input placeholder="Search people, jobs, notes…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 220 }} />
      </div>

      {entries === null ? (
        <div className="empty-block">Loading…</div>
      ) : !filtered.length ? (
        <div className="empty-block">{entries.length ? 'Nothing matches these filters.' : 'No activity recorded yet.'}</div>
      ) : (
        <div className="activity-list">
          {filtered.map((e) => (
            <div key={e.id} className="activity-row">
              <div className="activity-when">{when(e.at)}</div>
              <div className="activity-body">
                <div className="activity-head">
                  <b>{e.by === me ? 'You' : e.by}</b>
                  <span className={'badge ' + (AREA_BADGE[e.area] || 'na')}>{AUDIT_AREAS[e.area] || e.area}</span>
                  <span>{e.action}</span>
                </div>
                {(e.lines || []).length > 0 && (
                  <ul className="activity-lines">
                    {e.lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
          {entries.length >= 500 && <div className="empty-block">Showing the most recent 500 entries.</div>}
        </div>
      )}
    </div>
  )
}
