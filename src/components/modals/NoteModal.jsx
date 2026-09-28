import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { dateOf } from '../../engine/dates.js'

export default function NoteModal({ personId, wkKey, dayIndex, onClose }) {
  const { board, setNote } = useBoard()
  const person = board.people.find((p) => p.id === personId)
  const date = dateOf(wkKey, dayIndex)
  const [text, setText] = useState(board.notes[personId + '|' + wkKey + '|' + dayIndex] || '')

  function save() {
    setNote(personId, wkKey, dayIndex, text.trim())
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
  }, [text])

  if (!person) return null

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">Note · {person.name}</div>
            <div className="card-subtitle">{date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>
        <textarea
          autoFocus
          rows={4}
          style={{ width: '100%' }}
          placeholder="Arrival time, site contact, travel notes…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save note
          </button>
        </div>
      </div>
    </div>
  )
}
