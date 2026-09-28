import { useEffect } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { dateOf } from '../../engine/dates.js'
import { projColor } from '../../engine/colors.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

export default function AssignmentModal({ personId, wkKey, dayIndexes, onClose }) {
  const { board, setDay } = useBoard()
  const person = board.people.find((p) => p.id === personId)
  const firstDay = dayIndexes[0]
  const date = dateOf(wkKey, firstDay)
  const isRun = dayIndexes.length > 1
  const rangeLabel = isRun ? DAY_LABELS[firstDay] + '–' + DAY_LABELS[dayIndexes[dayIndexes.length - 1]] : null
  const currentValue = board.days[personId + '|' + wkKey + '|' + firstDay] || ''

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function choose(id) {
    dayIndexes.forEach((di) => setDay(personId, wkKey, di, id))
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
              {isRun ? rangeLabel + ' · week of ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
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
          {currentValue && (
            <button className="btn danger" onClick={() => choose(null)}>
              {isRun ? 'Clear ' + rangeLabel : 'Clear day'}
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
