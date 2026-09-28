import { dayVal } from '../../engine/schedule.js'
import { projColor } from '../../engine/colors.js'
import { useBoard } from '../../context/BoardContext.jsx'
import { useBoardDnd } from './DndContext.jsx'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

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
  const dayIndex = dayIndexes[0]
  const isRun = dayIndexes.length > 1
  const value = dayVal(board.days, board.holidays, personId, wkKey, dayIndex)
  const isHoliday = value === '__HOL'
  const info = value && !isHoliday ? findColored(board, value) : null
  const hasNote = dayIndexes.some((i) => !!board.notes[personId + '|' + wkKey + '|' + i])
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
    onOpenAssign(personId, wkKey, dayIndexes)
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
      onDoubleClick={(e) => {
        e.stopPropagation()
        onOpenNote(personId, wkKey, dayIndex)
      }}
      title={isHoliday ? 'Holiday' : info ? info.name + (rangeLabel ? ' · ' + rangeLabel : '') + ' · double-click to add a note' : 'Click to assign'}
    >
      {isHoliday ? (
        <div className="chip" style={{ background: 'var(--na)', borderColor: 'var(--na)', color: 'var(--muted)', fontSize: 10 }}>
          Holiday
        </div>
      ) : info ? (
        <div className="chip" style={{ '--chip-color': info.color }}>
          {info.name}
          {hasNote && <span className="chip-note-dot" />}
        </div>
      ) : null}
    </td>
  )
}
