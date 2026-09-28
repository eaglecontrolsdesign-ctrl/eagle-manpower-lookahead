import { projectWeekCoverage } from '../../engine/demand.js'

export default function RolePressure({ board, projects, weeks8 }) {
  const roleMap = {}
  weeks8.forEach((w) =>
    projects.forEach((p) => {
      const c = projectWeekCoverage(board, p.id, w.key)
      c.roleGaps.filter((g) => g.gap > 0).forEach((g) => (roleMap[g.role] = (roleMap[g.role] || 0) + g.gap))
    })
  )
  const roles = Object.entries(roleMap).sort((a, b) => b[1] - a[1])
  const maxRole = Math.max(1, ...roles.map((x) => x[1]))

  if (!roles.length) return <div className="empty-block">No role gaps detected in the next {weeks8.length} weeks.</div>

  return (
    <div>
      {roles.slice(0, 7).map(([role, hours]) => (
        <div key={role} className="role-pressure-row">
          <b>{role}</b>
          <span>{hours}h</span>
          <div className="role-pressure-track" style={{ '--rw': Math.round((hours / maxRole) * 100) + '%' }}>
            <i />
          </div>
          <div className="role-pressure-note">Equivalent to {(hours / 40).toFixed(1)} person-weeks of uncovered demand</div>
        </div>
      ))}
    </div>
  )
}
