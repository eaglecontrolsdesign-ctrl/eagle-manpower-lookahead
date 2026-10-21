import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { projColor } from '../../engine/colors.js'
import { projectWeekCoverage, coverageClass } from '../../engine/demand.js'
import WeekDemandSummary from './WeekDemandSummary.jsx'
import { trackerDemand, rolesLine, TRACKER_DEMAND_LABEL } from '../../engine/trackerNotes.js'

const CLASS_COLOR = { unplanned: 'var(--muted)', draft: 'var(--warn)', short: 'var(--bad)', covered: 'var(--good)' }

// projectFilter (optional): extra predicate on top of the office filter — PM Demand uses it to
// show a project manager only their own projects.
export default function ProjectsBoard({ weeks, projectFilter, emptyMessage }) {
  const { board } = useBoard()
  const ui = useUi()
  const projects = board.projects
    .map((p, i) => ({ p, i })) // i: position in board.projects, so colours match the people board
    .filter(({ p }) => (!ui.officeFilter || !p.office || p.office === ui.officeFilter) && (!projectFilter || projectFilter(p)))
  // Service work (project.kind === 'service', set on Administration > Projects) sits in its own
  // section under the projects; the headers only appear once there is something to separate.
  const groups = [
    { key: 'project', title: 'Projects', items: projects.filter(({ p }) => p.kind !== 'service') },
    { key: 'service', title: 'Service', items: projects.filter(({ p }) => p.kind === 'service') },
  ].filter((g) => g.items.length)
  const showHeaders = groups.length > 1

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
          {groups.map((g) => [
            showHeaders && (
              <tr key={'section-' + g.key} className="board-section">
                <td colSpan={1 + weeks.length}>
                  {g.title} · {g.items.length}
                </td>
              </tr>
            ),
            ...g.items.map(({ p, i }) => (
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
            )),
          ])}
          {!projects.length && (
            <tr>
              <td colSpan={1 + weeks.length} className="empty-block">
                {emptyMessage || 'No projects match the current filters.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
