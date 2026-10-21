import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { usePermissions } from '../../hooks/usePermissions.js'
import { useRequests } from '../../context/RequestsContext.jsx'
import { openRequestsByCell } from '../../engine/requests.js'
import RequestModal from '../requests/RequestModal.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { personJobUtil, personOverheadUtil } from '../../engine/utilization.js'
import { avColor, initials, utilColor, projColor } from '../../engine/colors.js'
import { dayVal } from '../../engine/schedule.js'
import { useBoardDnd } from './DndContext.jsx'
import DayCell from './DayCell.jsx'
import WeekDemandSummary from './WeekDemandSummary.jsx'
import NoteModal from '../modals/NoteModal.jsx'
import AssignmentModal from '../modals/AssignmentModal.jsx'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

// Groups a person's Mon–Fri assignments for one week into runs of consecutive identical
// values, so the board can render one wide cell instead of repeating the same chip. Empty
// (unassigned) days are kept as individual single-day cells so they stay clickable targets.
// Runs never cross a week boundary — this is called separately per week.
function computeRuns(board, personId, wkKey) {
  const runs = []
  let i = 0
  while (i < 5) {
    const v = dayVal(board.days, board.holidays, personId, wkKey, i)
    if (!v) {
      runs.push([i])
      i++
      continue
    }
    let j = i + 1
    while (j < 5 && dayVal(board.days, board.holidays, personId, wkKey, j) === v) j++
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

  return (
    <div className="board-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th className="person-th" rowSpan={2}>
              Person
            </th>
            {weeks.map((w) => (
              <th key={w.key} colSpan={5}>
                {w.label}
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
                const v = dayVal(board.days, board.holidays, person.id, w.key, d)
                if (v && v.indexOf('__') !== 0) projectIds.add(v)
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
