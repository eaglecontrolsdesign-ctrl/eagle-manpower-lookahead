import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { dateOf } from '../../engine/dates.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function labelDays(indexes) {
  const sorted = [...indexes].sort((a, b) => a - b)
  if (sorted.length === 1) return DAY_LABELS[sorted[0]]
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  return contiguous ? DAY_LABELS[sorted[0]] + '–' + DAY_LABELS[sorted[sorted.length - 1]] : sorted.map((i) => DAY_LABELS[i]).join(', ')
}

// dayIndexes is the run the clicked chip represents (one day, or several joined days sharing
// the same assignment) — notes are stored per day regardless, so a joined chip gets one textarea
// per day here, letting each day carry its own dispatch note instead of one shared note.
export default function NoteModal({ personId, wkKey, dayIndexes, onClose }) {
  const { board, setNote } = useBoard()
  const person = board.people.find((p) => p.id === personId)
  const isMulti = dayIndexes.length > 1
  const [texts, setTexts] = useState(() =>
    dayIndexes.reduce((acc, i) => {
      acc[i] = board.notes[personId + '|' + wkKey + '|' + i] || ''
      return acc
    }, {})
  )

  function save() {
    dayIndexes.forEach((i) => setNote(personId, wkKey, i, (texts[i] || '').trim()))
    onClose()
  }

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texts])

  if (!person) return null

  const firstDate = dateOf(wkKey, dayIndexes[0])

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">Note · {person.name}</div>
            <div className="card-subtitle">
              {isMulti
                ? labelDays(dayIndexes) + ' · week of ' + firstDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : firstDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        {dayIndexes.map((i, idx) => {
          const d = dateOf(wkKey, i)
          return (
            <div key={i} style={{ marginBottom: idx === dayIndexes.length - 1 ? 0 : 12 }}>
              {isMulti && (
                <div className="panel-title">
                  {DAY_LABELS[i]} · {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
              )}
              <textarea
                autoFocus={idx === 0}
                rows={isMulti ? 2 : 4}
                style={{ width: '100%' }}
                placeholder="Arrival time, site contact, travel notes…"
                value={texts[i] || ''}
                onChange={(e) => setTexts((prev) => ({ ...prev, [i]: e.target.value }))}
              />
            </div>
          )
        })}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            {isMulti ? 'Save notes' : 'Save note'}
          </button>
        </div>
      </div>
    </div>
  )
}
