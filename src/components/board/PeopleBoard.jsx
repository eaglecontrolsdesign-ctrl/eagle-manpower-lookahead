import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { usePermissions } from '../../hooks/usePermissions.js'
import { useFitToViewport } from '../../hooks/useFitToViewport.js'
import { useRequests } from '../../context/RequestsContext.jsx'
import { openRequestsByCell } from '../../engine/requests.js'
import RequestModal from '../requests/RequestModal.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { personJobUtil, personOverheadUtil } from '../../engine/utilization.js'
import { avColor, initials, utilColor, projColor } from '../../engine/colors.js'
import { daySegments, daySignature } from '../../engine/segments.js'
import { useBoardDnd } from './DndContext.jsx'
import DayCell from './DayCell.jsx'
import WeekDemandSummary from './WeekDemandSummary.jsx'
import NoteModal from '../modals/NoteModal.jsx'
import AssignmentModal from '../modals/AssignmentModal.jsx'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
// Day-column widths (px): every week equal by default; with a week expanded, that week's days
// get WIDE and the rest COMPACT. The table uses fixed layout, so content never changes widths.
const PERSON_COL = 190
const COL_EQUAL = 84
const COL_WIDE = 118
const COL_COMPACT = 58
const COL_MIN = 34
const FIT_WEEKS = 4

// Groups a person's Mon–Fri assignments for one week into runs of consecutive identical
// values, so the board can render one wide cell instead of repeating the same chip. Empty
// (unassigned) days are kept as individual single-day cells so they stay clickable targets.
// Runs never cross a week boundary — this is called separately per week.
function computeRuns(board, personId, wkKey) {
  const runs = []
  let i = 0
  const sig = (d) => daySignature(daySegments(board, personId, wkKey, d))
  while (i < 5) {
    const v = sig(i)
    if (!v) {
      runs.push([i])
      i++
      continue
    }
    let j = i + 1
    while (j < 5 && sig(j) === v) j++
    runs.push(Array.from({ length: j - i }, (_, k) => i + k))
    i = j
  }
  return runs
}

export default function PeopleBoard({ people, weeks }) {
  const { board } = useBoard()
  const ui = useUi()
  const dnd = useBoardDnd()
  const perms = usePermissions()
  const { requests } = useRequests()
  const requestedByCell = openRequestsByCell(requests)
  const [requestTarget, setRequestTarget] = useState(null)
  const [noteTarget, setNoteTarget] = useState(null)
  const [assignTarget, setAssignTarget] = useState(null)
  const focus = weeks.length > 1 && weeks.some((w) => w.key === ui.focusWeek) ? ui.focusWeek : null
  // Day columns are sized from the board's actual width so the weeks always fit side by side:
  // equal shares by default, or double weight for the expanded week. Below COL_MIN per day the
  // board scrolls sideways instead of squeezing further.
  const wrapRef = useRef(null)
  useFitToViewport(wrapRef)
  const [wrapWidth, setWrapWidth] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // Also tell the stylesheet how tall the first header row is, so the day-names row can stick
    // just below it instead of sliding over it when the board scrolls.
    const measure = () => {
      setWrapWidth(el.clientWidth)
      const hdr = el.querySelector('thead tr')
      if (hdr) el.style.setProperty('--hdr1', Math.round(hdr.getBoundingClientRect().height) + 'px')
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [])
  // At most FIT_WEEKS weeks share the board's width; longer horizons keep that same week width
  // and scroll sideways, rather than squeezing twelve weeks into the screen.
  const fitWeeks = Math.min(weeks.length, FIT_WEEKS)
  const dayCount = fitWeeks * 5
  const available = Math.max(0, wrapWidth - PERSON_COL)
  const unit = wrapWidth ? available / (focus ? dayCount + 5 : dayCount) : 0
  const colWidth = (w) => {
    if (!wrapWidth) return !focus ? COL_EQUAL : w.key === focus ? COL_WIDE : COL_COMPACT
    return Math.max(COL_MIN, Math.floor(focus && w.key === focus ? unit * 2 : unit))
  }
  const tableMinWidth = PERSON_COL + weeks.reduce((s, w) => s + colWidth(w) * 5, 0)

  return (
    <div className="board-wrap" ref={wrapRef}>
      <table className="board-table fixed" style={{ minWidth: tableMinWidth }}>
        <colgroup>
          <col style={{ width: PERSON_COL }} />
          {weeks.map((w) => DAY_LABELS.map((d) => <col key={w.key + d} style={{ width: colWidth(w) }} />))}
        </colgroup>
        <thead>
          <tr>
            <th className="person-th" rowSpan={2}>
              Person
            </th>
            {weeks.map((w) => (
              <th key={w.key} colSpan={5} className={focus === w.key ? 'week-focused' : ''}>
                {weeks.length > 1 ? (
                  <span
                    className={'week-label' + (focus === w.key ? ' on' : '')}
                    onClick={() => ui.toggleFocusWeek(w.key)}
                    title={focus === w.key ? 'Click to give every week equal room again' : 'Click to expand this week'}
                  >
                    {w.label}
                    {focus === w.key ? ' ▾' : ''}
                  </span>
                ) : (
                  w.label
                )}
                <WeekDemandSummary wkKey={w.key} />
              </th>
            ))}
          </tr>
          <tr>
            {weeks.map((w) =>
              DAY_LABELS.map((d) => (
                <th key={w.key + d} style={{ fontWeight: 700 }}>
                  {d}
                </th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const lock = perms.lockReason(person.id)
            const jobUtil = personJobUtil(board, person, weeks)
            const overheadUtil = personOverheadUtil(board, person, weeks)
            const projectIds = new Set()
            weeks.forEach((w) => {
              for (let d = 0; d < 5; d++) {
                daySegments(board, person.id, w.key, d).forEach((s) => {
                  if (s.id.indexOf('__') !== 0) projectIds.add(s.id)
                })
              }
            })
            const legend = [...projectIds].map((pid) => {
              const idx = board.projects.findIndex((p) => p.id === pid)
              const project = board.projects[idx]
              return project ? { pid, name: project.name, color: projColor(project, Math.max(idx, 0)) } : null
            }).filter(Boolean)
            return (
              <tr
                key={person.id}
                onDragOver={(e) => dnd.dragAssignment && e.preventDefault()}
                onDrop={(e) => {
                  if (!dnd.dragAssignment) return
                  e.preventDefault()
                  dnd.dropAssignment(person.id, weeks)
                }}
              >
                <td className="person-cell">
                  <div className="person-cell-inner" style={{ cursor: 'pointer' }} onClick={() => ui.openEmployee(person.id)} title="Open employee detail">
                    <span className="avatar" style={{ background: avColor(person.name) }}>
                      {initials(person.name)}
                    </span>
                    <div>
                      <div className="person-name">{person.name}</div>
                      <div className="person-role">
                        {person.office || 'Charlotte'}
                        {lock && !perms.viewer ? ' · read-only' : ''}
                      </div>
                    </div>
                    <div className="util-pill-group">
                      <span className="util-pill" style={{ background: utilColor(jobUtil) }} title={'Project / job utilization: ' + jobUtil + '%'}>
                        {jobUtil}%
                      </span>
                      <span className="util-pill office" title={'Office / overhead utilization: ' + overheadUtil + '%'}>
                        {overheadUtil}%
                      </span>
                    </div>
                  </div>
                  {legend.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                      {legend.map((l) => (
                        <span
                          key={l.pid}
                          className="skill-chip"
                          style={{
                            '--chip-color': l.color,
                            background: 'color-mix(in srgb, var(--chip-color) 10%, var(--panel2) 90%)',
                            border: '1.5px solid var(--chip-color)',
                            color: 'color-mix(in srgb, var(--chip-color) 78%, var(--text) 22%)',
                            cursor: 'grab',
                          }}
                          draggable={!lock}
                          title={'Click for PM demand' + (lock ? '' : ' · drag to reassign all ' + l.name + ' work this horizon')}
                          onClick={() => ui.openDemand(l.pid)}
                          onDragStart={(e) => {
                            if (lock) return e.preventDefault()
                            dnd.startAssignmentDrag(person.id, l.pid)
                            e.dataTransfer.effectAllowed = 'move'
                            e.dataTransfer.setData('text/plain', l.pid)
                          }}
                          onDragEnd={dnd.endAssignmentDrag}
                        >
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                {weeks.map((w) =>
                  computeRuns(board, person.id, w.key).map((dayIndexes) => (
                    <DayCell
                      key={w.key + dayIndexes[0]}
                      personId={person.id}
                      wkKey={w.key}
                      dayIndexes={dayIndexes}
                      onOpenNote={(pid, wk, dis) => setNoteTarget({ pid, wk, dis })}
                      onOpenAssign={(pid, wk, dis) => setAssignTarget({ pid, wk, dis })}
                      locked={lock}
                      compact={!!focus && focus !== w.key}
                      requested={dayIndexes.map((di) => requestedByCell[person.id + '|' + w.key + '|' + di]).find(Boolean) || null}
                      onRequest={perms.restricted && !perms.viewer ? (pid, wk, dis) => setRequestTarget({ pid, wk, dis }) : undefined}
                    />
                  ))
                )}
              </tr>
            )
          })}
          {!people.length && (
            <tr>
              <td colSpan={1 + weeks.length * 5} className="empty-block">
                No one matches the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {noteTarget && <NoteModal personId={noteTarget.pid} wkKey={noteTarget.wk} dayIndexes={noteTarget.dis} onClose={() => setNoteTarget(null)} />}
      {requestTarget && <RequestModal personId={requestTarget.pid} wkKey={requestTarget.wk} dayIndexes={requestTarget.dis} onClose={() => setRequestTarget(null)} />}
      {assignTarget && <AssignmentModal personId={assignTarget.pid} wkKey={assignTarget.wk} dayIndexes={assignTarget.dis} onClose={() => setAssignTarget(null)} />}
    </div>
  )
}
