import { useEffect, useRef } from 'react'
import { projColor } from '../../engine/colors.js'
import { daySegments, hoursLabel, overtimeHours, FULL_DAY, HOLIDAY } from '../../engine/segments.js'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useBoardDnd } from './DndContext.jsx'
import { trackerNoteKind, trackerNoteFor } from '../../engine/trackerNotes.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const CLICK_DELAY_MS = 220
const MAX_CHIPS = 3

function findColored(board, pid) {
  const idx = board.projects.findIndex((p) => p.id === pid)
  if (idx >= 0) return { name: board.projects[idx].name, color: projColor(board.projects[idx], idx) }
  const o = board.overhead.find((x) => x.id === pid)
  if (o) return { name: o.name, color: o.color || '#94a3b8' }
  return { name: pid, color: '#94a3b8' }
}

// dayIndexes: a run of one or more consecutive day indices (within the same week) that all
// carry the identical assignment(s). Runs longer than one day render as a single wider cell and
// are edited as a block; drag-and-drop stays scoped to single-day cells.
// A day can hold several jobs for any number of hours (engine/segments.js): each one is its own
// chip inside the cell, and each chip drags on its own — only that job's hours move.
// locked: a read-only reason (engine/permissions.js readOnlyReason) when this person is outside
// the user's branch — the cell then neither opens an editor nor takes part in drag-and-drop.
// requested: an open manpower request covers one of these days (engine/requests.js).
// onRequest: open the request modal — used instead of the editor when the cell is locked.
export default function DayCell({ personId, wkKey, dayIndexes, onOpenNote, onOpenAssign, locked, requested, onRequest }) {
  const { board } = useBoard()
  const dnd = useBoardDnd()
  const toast = useToast()
  const clickTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(clickTimerRef.current), [])
  const dayIndex = dayIndexes[0]
  const isRun = dayIndexes.length > 1
  const segments = daySegments(board, personId, wkKey, dayIndex)
  const isHoliday = segments.length === 1 && segments[0].id === HOLIDAY && !board.days[personId + '|' + wkKey + '|' + dayIndex]
  const hasValue = segments.length > 0
  const total = segments.reduce((s, x) => s + x.hours, 0)
  const isPlainFullDay = segments.length === 1 && segments[0].hours === FULL_DAY
  const overtime = overtimeHours(segments)
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
  const notePreviewLines = !hasNote ? [] : notesUniform ? [{ tag: '', text: noteEntries[0].text }] : noteEntries.map((n) => ({ tag: '(' + DAY_LABELS[n.i] + ') ', text: n.text }))
  const rangeLabel = isRun ? DAY_LABELS[dayIndex] + '–' + DAY_LABELS[dayIndexes[dayIndexes.length - 1]] : null
  const summary = segments.map((s) => findColored(board, s.id).name + (isPlainFullDay ? '' : ' ' + hoursLabel(s.hours))).join(' + ')

  function startSegmentDrag(e, seg) {
    const ok = !locked && !isRun && !isHoliday && dnd.startDayDrag(personId, wkKey, dayIndex, seg.id)
    if (!ok) {
      e.preventDefault()
      return
    }
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', personId + '|' + wkKey + '|' + dayIndex + '|' + seg.id)
  }

  function handleDragOver(e) {
    if (isRun || locked) return
    e.preventDefault()
    e.currentTarget.classList.add('drop-ready')
  }
  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drop-ready')
  }
  function handleDrop(e) {
    if (isRun || locked) return
    e.preventDefault()
    e.currentTarget.classList.remove('drop-ready')
    dnd.dropDayAssignment(personId, wkKey, dayIndex)
  }

  function handleClick() {
    if (isHoliday) return
    if (locked) {
      if (onRequest) onRequest(personId, wkKey, dayIndexes)
      else toast(locked, 'error')
      return
    }
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
    if (locked) {
      toast(locked, 'error')
      return
    }
    onOpenNote(personId, wkKey, dayIndexes)
  }

  const shown = segments.slice(0, MAX_CHIPS)
  const hidden = segments.length - shown.length

  return (
    <td
      className={
        'day-cell' +
        (isHoliday ? ' holiday' : !hasValue ? ' empty' : '') +
        (segments.length > 1 ? ' split' : '') +
        (locked ? ' locked' : '') +
        (requested ? ' requested' : '')
      }
      colSpan={dayIndexes.length}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      title={
        (requested ? '✉ Manpower request pending' + (requested.fromEmail ? ' from ' + requested.fromEmail : '') + ' — ' + requested.projectName + '\n' : '') +
        (locked ? '🔒 ' + locked + (onRequest ? ' · click to request them' : '') + '\n' : '') +
        (isHoliday
          ? 'Holiday'
          : hasValue
            ? summary +
              (isPlainFullDay ? '' : ' · ' + hoursLabel(total) + (overtime ? ' (' + hoursLabel(overtime) + ' overtime)' : '')) +
              (rangeLabel ? ' · ' + rangeLabel : '') +
              (tracker ? ' · ' + tracker.text : '') +
              (hasNote ? '\n' + notePreviewLines.map((n) => n.tag + n.text).join('\n') : ' · double-click to add a note')
            : 'Click to assign')
      }
    >
      {isHoliday ? (
        <div className="chip" style={{ background: 'var(--na)', borderColor: 'var(--na)', color: 'var(--muted)', fontSize: 10 }}>
          Holiday
        </div>
      ) : hasValue ? (
        <div className={'chip-stack' + (segments.length > 1 ? ' multi' : '')}>
          {shown.map((seg, si) => {
            const info = findColored(board, seg.id)
            const first = si === 0
            return (
              <div
                key={seg.id}
                className={'chip' + (first && tracker ? ' chip--' + tracker.kind : '') + (segments.length > 1 ? ' chip--part' : '')}
                style={{ '--chip-color': info.color }}
                draggable={!isRun && !isHoliday && !locked}
                onDragStart={(e) => startSegmentDrag(e, seg)}
                onDragEnd={dnd.endDayDrag}
              >
                <span className="chip-name">
                  <span className="chip-label">{info.name}</span>
                  {!isPlainFullDay && <span className={'chip-hours' + (first && overtime ? ' ot' : '')}>{hoursLabel(seg.hours)}</span>}
                </span>
                {first && tracker && <span className={'chip-tracker ' + tracker.kind}>{tracker.kind === 'conflict' ? '⚠ Tracker wants here' : '📅 Tracker'}</span>}
                {first && requested && <span className="chip-request">✉ Requested</span>}
                {first && hasNote && <span className="chip-note-dot" />}
                {first &&
                  notePreviewLines.map((n, i) => (
                    <div key={i} className="chip-note-preview">
                      {n.tag && <b>{n.tag}</b>}
                      {n.text}
                    </div>
                  ))}
              </div>
            )
          })}
          {hidden > 0 && <div className="chip-more">+{hidden} more · {hoursLabel(total)}</div>}
        </div>
      ) : requested ? (
        <span className="chip-request floating">✉ Requested</span>
      ) : null}
    </td>
  )
}
