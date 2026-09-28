import { projectWeekCoverage, coverageClass } from '../../engine/demand.js'

const CLASS_COLOR = { unplanned: 'var(--muted)', draft: 'var(--warn)', short: 'var(--bad)', covered: 'var(--good)' }

export default function WeeklyDemandTable({ board, weeks }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            {weeks.map((w) => (
              <th key={w.key}>{w.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {board.projects.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {weeks.map((w) => {
                const c = projectWeekCoverage(board, p.id, w.key)
                return (
                  <td key={w.key} style={{ color: CLASS_COLOR[coverageClass(c)] }}>
                    {c.assignedHeads}
                    {c.hasPlan ? ' / ' + c.requestedHeads : ''}
                  </td>
                )
              })}
            </tr>
          ))}
          {!board.projects.length && (
            <tr>
              <td colSpan={1 + weeks.length}>No projects yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
