import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useRequests } from '../../context/RequestsContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { usePermissions } from '../../hooks/usePermissions.js'
import { dateOf } from '../../engine/dates.js'
import { projColor } from '../../engine/colors.js'
import { projectEditable } from '../../engine/permissions.js'
import { DAY_LABELS, labelDays, branchOf, buildRequest } from '../../engine/requests.js'
import { displayName } from '../../engine/userNames.js'

const ALL_DAYS = [0, 1, 2, 3, 4]

// Ask the branch coordinator for one of their people: pick the days, the job you need them
// on, and say why. Opens from a day cell the user can't edit (another branch's person).
export default function RequestModal({ personId, wkKey, dayIndexes, onClose }) {
  const { board } = useBoard()
  const perms = usePermissions()
  const rq = useRequests()
  const toast = useToast()
  const person = board.people.find((p) => p.id === personId)
  const [selected, setSelected] = useState(dayIndexes)
  const [projectId, setProjectId] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!person) return null

  const branch = branchOf(person)
  const coordinators = rq.coordinatorsFor(branch)
  // Jobs the requester themselves could schedule: their branch's, shared, or ones they manage.
  const jobs = board.projects.filter((p) => projectEditable(p, perms.scope))
  const date = dateOf(wkKey, [...selected].sort((a, b) => a - b)[0])

  function nameOf(id) {
    const p = board.projects.find((x) => x.id === id) || board.overhead.find((x) => x.id === id)
    return p ? p.name : id === '__HOL' ? 'Holiday' : id
  }

  function toggleDay(di) {
    setSelected((prev) => {
      if (prev.includes(di)) return prev.length === 1 ? prev : prev.filter((d) => d !== di)
      return [...prev, di].sort((a, b) => a - b)
    })
  }

  async function send() {
    const project = board.projects.find((p) => p.id === projectId)
    if (!project) return toast('Pick the job you need ' + person.name + ' on', 'error')
    const currentValues = {}
    selected.forEach((di) => {
      const v = board.days[personId + '|' + wkKey + '|' + di]
      if (v) currentValues[String(di)] = v
    })
    setSending(true)
    try {
      await rq.createRequest(buildRequest({ me: rq.me, person, wkKey, dayIndexes: selected, project, message, currentValues }))
      toast('Request sent to the ' + branch + ' coordinator' + (coordinators.length === 1 ? ' (' + displayName(coordinators[0]) + ')' : ''))
      onClose()
    } catch (err) {
      toast('Could not send: ' + err.message, 'error')
      setSending(false)
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>Manpower request</div>
            <div className="card-title">{person.name}</div>
            <div className="card-subtitle">
              {branch} branch · {labelDays(selected)} · week of {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="panel-title">Days</div>
        <div className="pill-tabs" style={{ marginBottom: 6 }}>
          {ALL_DAYS.map((di) => (
            <button key={di} className={'pill-tab' + (selected.includes(di) ? ' on' : '')} onClick={() => toggleDay(di)}>
              {DAY_LABELS[di]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
          Currently:{' '}
          {selected
            .map((di) => DAY_LABELS[di] + ' ' + (board.days[personId + '|' + wkKey + '|' + di] ? nameOf(board.days[personId + '|' + wkKey + '|' + di]) : 'free'))
            .join(' · ')}
        </div>

        <div className="panel-title">Needed on</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {jobs.map((p) => {
            const idx = board.projects.indexOf(p)
            const on = projectId === p.id
            return (
              <button
                key={p.id}
                className="btn"
                style={{ background: projColor(p, idx), color: '#071018', borderColor: on ? 'var(--text)' : 'transparent', opacity: on || !projectId ? 1 : 0.55 }}
                onClick={() => setProjectId(p.id)}
              >
                {p.name}
              </button>
            )
          })}
          {!jobs.length && <span className="skill-chip empty">No jobs you can schedule</span>}
        </div>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div className="panel-title">Message</div>
          <textarea rows={3} style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Why you need them, how long, anything the coordinator should know…" />
        </label>

        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
          {coordinators.length ? (
            <>
              Goes to the {branch} coordinator{coordinators.length > 1 ? 's' : ''}: <b>{coordinators.map(displayName).join(', ')}</b>. Approving moves these days to the job you picked.
            </>
          ) : (
            <span style={{ color: 'var(--warn)' }}>No coordinator is assigned to {branch} yet — only administrators will see this request.</span>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={sending || !projectId} onClick={send}>
            Send request
          </button>
        </div>
      </div>
    </div>
  )
}
