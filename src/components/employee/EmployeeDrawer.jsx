import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { useToast } from '../../context/ToastContext.jsx'
import { avColor, initials, utilColor } from '../../engine/colors.js'
import { personUtil } from '../../engine/utilization.js'
import { personPlanningRole } from '../../engine/planningRoles.js'
import { normalizeSkills } from '../../engine/skills.js'
import { dayVal } from '../../engine/schedule.js'
import UtilizationSparkline from './UtilizationSparkline.jsx'
import MoveWorkSuggestions from './MoveWorkSuggestions.jsx'

export default function EmployeeDrawer({ personId, onClose }) {
  const { board, updatePerson } = useBoard()
  const ui = useUi()
  const toast = useToast()
  const weeks = useWeeks(ui.horizonWeeks)
  const [showMove, setShowMove] = useState(false)

  const person = board.people.find((p) => p.id === personId)
  if (!person) return null

  const util = personUtil(board, person, weeks)
  const uc = utilColor(util)
  const cap = weeks.length * 40
  const hours = Math.round((util / 100) * cap)

  const items = {}
  weeks.forEach((w) => {
    for (let d = 0; d < 5; d++) {
      const v = dayVal(board.days, board.holidays, person.id, w.key, d)
      if (v) items[v] = (items[v] || 0) + 8
    }
  })
  const rows = Object.entries(items).sort((a, b) => b[1] - a[1])

  function nameOf(id) {
    const p = board.projects.find((x) => x.id === id) || board.overhead.find((x) => x.id === id)
    return p ? p.name : id
  }

  function editSkills() {
    const value = window.prompt('Skills / capabilities for ' + person.name + '\nSeparate with commas:', (person.skills || []).join(', '))
    if (value === null) return
    updatePerson(person.id, { skills: normalizeSkills(value) })
    toast(person.name + ' skills updated')
  }

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer">
        <div className="modal-head">
          <button className="icon-btn" onClick={onClose} style={{ marginLeft: 'auto' }}>
            &#10005;
          </button>
        </div>

        <div className="card-row" style={{ marginBottom: 14 }}>
          <span className="avatar" style={{ background: avColor(person.name), width: 46, height: 46, fontSize: 15 }}>
            {initials(person.name)}
          </span>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ fontSize: 17 }}>
              {person.name}
            </div>
            <div className="card-subtitle">
              {person.role || 'Team member'} · <b style={{ color: 'var(--accent)' }}>{personPlanningRole(person)}</b> · {person.office || 'Charlotte'}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: uc }}>{util}%</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{util >= 100 ? 'At capacity' : 'Utilization'}</div>
          </div>
        </div>

        <div className="panel-title">
          {weeks.length}-week capacity · {hours}h / {cap}h
        </div>
        <div className="progress-bar" style={{ marginBottom: 16 }}>
          <i style={{ width: Math.min(util, 100) + '%', background: uc }} />
        </div>

        <div className="panel-title">Skills &amp; capabilities</div>
        <div style={{ marginBottom: 8 }}>
          {(person.skills || []).length ? person.skills.map((s) => <span key={s} className="skill-chip">{s}</span>) : <span className="skill-chip empty">No skills tagged yet</span>}
        </div>
        <button className="btn" onClick={editSkills} style={{ marginBottom: 16 }}>
          Edit skills
        </button>

        <div className="panel-title">Assignments this horizon</div>
        {rows.length ? (
          rows.map(([pid, h]) => (
            <div key={pid} className="detail-row">
              <span>{nameOf(pid)}</span>
              <b>{h}h</b>
              <span>{Math.round((h / Math.max(hours, 1)) * 100)}%</span>
            </div>
          ))
        ) : (
          <div className="empty-block">No assignments in this horizon</div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={() => setShowMove((s) => !s)}>
            Move work
          </button>
          <button
            className="btn"
            onClick={() => {
              onClose()
              ui.setActiveView('board')
            }}
          >
            Edit schedule
          </button>
        </div>
        {showMove && <MoveWorkSuggestions personId={person.id} />}

        <div className="panel-title" style={{ marginTop: 18 }}>
          8-week utilization trend
        </div>
        <UtilizationSparkline person={person} />
      </div>
    </>
  )
}
