import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { projColor } from '../../engine/colors.js'
import { projectWeekCoverage, coverageClass } from '../../engine/demand.js'
import WeekDemandSummary from './WeekDemandSummary.jsx'
import { trackerDemand, rolesLine, TRACKER_DEMAND_LABEL } from '../../engine/trackerNotes.js'

const CLASS_COLOR = { unplanned: 'var(--muted)', draft: 'var(--warn)', short: 'var(--bad)', covered: 'var(--good)' }

export default function ProjectsBoard({ weeks }) {
  const { board } = useBoard()
  const ui = useUi()
  const projects = board.projects.filter((p) => !ui.officeFilter || !p.office || p.office === ui.officeFilter)

  return (
    <div className="board-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th className="person-th">Project</th>
            {weeks.map((w) => (
              <th key={w.key}>
                {w.label}
                <WeekDemandSummary wkKey={w.key} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((p, i) => (
            <tr key={p.id}>
              <td className="person-cell">
                <div className="person-cell-inner" style={{ cursor: 'pointer' }} onClick={() => ui.openDemand(p.id)} title="View PM demand">
                  <span className="avatar" style={{ background: projColor(p, i), width: 10, height: 10, borderRadius: 3 }} />
                  <div className="person-name">{p.name}</div>
                </div>
              </td>
              {weeks.map((w) => {
                const c = projectWeekCoverage(board, p.id, w.key)
                const cls = coverageClass(c)
                const trk = trackerDemand(c.record)
                return (
                  <td
                    key={w.key}
                    className="week-cell"
                    style={{ cursor: 'pointer' }}
                    onClick={() => ui.openDemand(p.id, w.key)}
                    title={
                      c.hasPlan
                        ? c.assigned +
                          'h scheduled / ' +
                          c.demand +
                          'h PM demand\n' +
                          rolesLine(c.record) +
                          (trk ? '\n' + TRACKER_DEMAND_LABEL[trk.state] + ' — from the Project Command Center schedule' : '')
                        : 'PM demand not entered'
                    }
                  >
                    <div style={{ fontWeight: 700, color: CLASS_COLOR[cls] }}>
                      {c.assigned}h{c.hasPlan ? ' / ' + c.demand + 'h' : ' / plan'}
                    </div>
                    {trk && <span className={'demand-tracker ' + trk.state}>{TRACKER_DEMAND_LABEL[trk.state]}</span>}
                  </td>
                )
              })}
            </tr>
          ))}
          {!projects.length && (
            <tr>
              <td colSpan={1 + weeks.length} className="empty-block">
                No projects match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
