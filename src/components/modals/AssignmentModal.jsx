import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { dateOf } from '../../engine/dates.js'
import { projColor } from '../../engine/colors.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const ALL_DAYS = [0, 1, 2, 3, 4]

function labelDays(indexes) {
  const sorted = [...indexes].sort((a, b) => a - b)
  if (sorted.length === 1) return DAY_LABELS[sorted[0]]
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  return contiguous ? DAY_LABELS[sorted[0]] + '–' + DAY_LABELS[sorted[sorted.length - 1]] : sorted.map((i) => DAY_LABELS[i]).join(', ')
}

export default function AssignmentModal({ personId, wkKey, dayIndexes, onClose }) {
  const { board, setDay } = useBoard()
  const person = board.people.find((p) => p.id === personId)
  const firstDay = dayIndexes[0]
  const currentValue = board.days[personId + '|' + wkKey + '|' + firstDay] || ''
  // Which day(s) this edit applies to — defaults to whatever cell was clicked (one day, or a
  // whole run), but the day pills below always offer the full week so a brand-new assignment
  // can be spread across as many days as needed in one go, not just the day that was clicked.
  const [selected, setSelected] = useState(dayIndexes)
  const isMulti = selected.length > 1
  const date = dateOf(wkKey, selected[0])
  const anySelectedAssigned = selected.some((di) => !!board.days[personId + '|' + wkKey + '|' + di])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleDay(di) {
    setSelected((prev) => {
      if (prev.includes(di)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== di)
      }
      return [...prev, di].sort((a, b) => a - b)
    })
  }

  function choose(id) {
    selected.forEach((di) => setDay(personId, wkKey, di, id))
    onClose()
  }

  if (!person) return null

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">{person.name}</div>
            <div className="card-subtitle">
              {isMulti ? labelDays(selected) + ' · week of ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="panel-title">Apply to</div>
        <div className="pill-tabs" style={{ marginBottom: 14 }}>
          {ALL_DAYS.map((di) => (
            <button key={di} className={'pill-tab' + (selected.includes(di) ? ' on' : '')} onClick={() => toggleDay(di)}>
              {DAY_LABELS[di]}
            </button>
          ))}
        </div>

        <div className="panel-title">Jobs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {board.projects.map((p, i) => (
            <button
              key={p.id}
              className="btn"
              style={{ background: projColor(p, i), color: '#071018', borderColor: 'transparent', opacity: currentValue === p.id ? 1 : 0.85 }}
              onClick={() => choose(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="panel-title">Overhead</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {board.overhead
            .filter((o) => o.id !== '__HOL')
            .map((o) => (
              <button key={o.id} className="btn" style={{ background: o.color, color: '#071018', borderColor: 'transparent' }} onClick={() => choose(o.id)}>
                {o.name}
              </button>
            ))}
        </div>

        <div className="modal-actions">
          {anySelectedAssigned && (
            <button className="btn danger" onClick={() => choose(null)}>
              {isMulti ? 'Clear ' + labelDays(selected) : 'Clear day'}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
