import { useEffect, useRef } from 'react'
import { dayVal } from '../../engine/schedule.js'
import { projColor } from '../../engine/colors.js'
import { useBoard } from '../../context/BoardContext.jsx'
import { useBoardDnd } from './DndContext.jsx'
import { trackerNoteKind, trackerNoteFor } from '../../engine/trackerNotes.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const CLICK_DELAY_MS = 220

function findColored(board, pid) {
  const idx = board.projects.findIndex((p) => p.id === pid)
  if (idx >= 0) return { name: board.projects[idx].name, color: projColor(board.projects[idx], idx) }
  const o = board.overhead.find((x) => x.id === pid)
  if (o) return { name: o.name, color: o.color || '#94a3b8' }
  return null
}

// dayIndexes: a run of one or more consecutive day indices (within the same week) that all
// share the same assignment. Runs longer than one day render as a single wider cell, and are
// edited/cleared as a block; drag-and-drop stays scoped to single-day cells to keep the swap
// semantics unambiguous.
export default function DayCell({ personId, wkKey, dayIndexes, onOpenNote, onOpenAssign }) {
  const { board } = useBoard()
  const dnd = useBoardDnd()
  const clickTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(clickTimerRef.current), [])
  const dayIndex = dayIndexes[0]
  const isRun = dayIndexes.length > 1
  const value = dayVal(board.days, board.holidays, personId, wkKey, dayIndex)
  const isHoliday = value === '__HOL'
  const info = value && !isHoliday ? findColored(board, value) : null
  // The project tracker (PCC) writes its own day notes with a recognizable prefix (engine/
  // trackerNotes.js) — those become a dashed-border badge instead of a plain note.
  const { tracker } = trackerNoteFor(board.notes, personId, wkKey, dayIndexes)
  // Human notes are stored per day even within a merged run, so a run can have a note on just
  // one of its joined days. Only drop the day-label prefix when every day in the run shares the
  // exact same note — otherwise show which specific day the previewed note belongs to.
  const noteEntries = dayIndexes
    .map((i) => ({ i, text: board.notes[personId + '|' + wkKey + '|' + i] || '' }))
    .filter((n) => n.text && !trackerNoteKind(n.text))
  const hasNote = noteEntries.length > 0
  const notesUniform = isRun && noteEntries.length === dayIndexes.length && noteEntries.every((n) => n.text === noteEntries[0].text)
  // One line per day when notes differ (a run can carry a different note on each joined day);
  // collapse to a single untagged line only when every day in the run shares the identical note.
  const notePreviewLines = !hasNote ? [] : notesUniform ? [{ tag: '', text: noteEntries[0].text }] : noteEntries.map((n) => ({ tag: '(' + DAY_LABELS[n.i] + ') ', text: n.text }))
  const rangeLabel = isRun ? DAY_LABELS[dayIndex] + '–' + DAY_LABELS[dayIndexes[dayIndexes.length - 1]] : null

  function handleDragStart(e) {
    const ok = dnd.startDayDrag(personId, wkKey, dayIndex)
    if (!ok) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', personId + '|' + wkKey + '|' + dayIndex)
  }

  function handleDragOver(e) {
    if (isRun) return
    e.preventDefault()
    e.currentTarget.classList.add('drop-ready')
  }
  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-ready')
  }
  function handleDrop(e) {
    if (isRun) return
    e.preventDefault()
    e.currentTarget.classList.remove('drop-ready')
    dnd.dropDayAssignment(personId, wkKey, dayIndex)
  }

  function handleClick() {
    if (isHoliday) return
    // Opening the assignment editor on every click would fire on the first click of a
    // double-click too, immediately covering the cell and swallowing the second click before
    // the browser's dblclick ever reaches us. Delay it briefly so a following double-click can
    // cancel it and open the note editor instead.
    clearTimeout(clickTimerRef.current)
    clickTimerRef.current = setTimeout(() => onOpenAssign(personId, wkKey, dayIndexes), CLICK_DELAY_MS)
  }

  function handleDoubleClick(e) {
    e.stopPropagation()
    clearTimeout(clickTimerRef.current)
    onOpenNote(personId, wkKey, dayIndexes)
  }

  return (
    <td
      className={'day-cell' + (isHoliday ? ' holiday' : !value ? ' empty' : '')}
      colSpan={dayIndexes.length}
      draggable={!isRun && !!value && !isHoliday}
      onDragStart={handleDragStart}
      onDragEnd={dnd.endDayDrag}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={
        isHoliday
          ? 'Holiday'
          : info
            ? info.name +
              (rangeLabel ? ' · ' + rangeLabel : '') +
              (tracker ? ' · ' + tracker.text : '') +
              (hasNote ? '\n' + notePreviewLines.map((n) => n.tag + n.text).join('\n') : ' · double-click to add a note')
            : 'Click to assign'
      }
    >
      {isHoliday ? (
        <div className="chip" style={{ background: 'var(--na)', borderColor: 'var(--na)', color: 'var(--muted)', fontSize: 10 }}>
          Holiday
        </div>
      ) : info ? (
        <div className={'chip' + (tracker ? ' chip--' + tracker.kind : '')} style={{ '--chip-color': info.color }}>
          {info.name}
          {tracker && <span className={'chip-tracker ' + tracker.kind}>{tracker.kind === 'conflict' ? '⚠ Tracker wants here' : '📅 Tracker'}</span>}
          {hasNote && <span className="chip-note-dot" />}
          {notePreviewLines.map((n, i) => (
            <div key={i} className="chip-note-preview">
              {n.tag && <b>{n.tag}</b>}
              {n.text}
            </div>
          ))}
        </div>
      ) : null}
    </td>
  )
}
