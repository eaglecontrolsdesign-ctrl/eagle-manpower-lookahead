import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { getAttentionAlerts, groupAlerts } from '../../engine/alerts.js'

export default function AlertsDrawer() {
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks)
  const people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
  const alerts = getAttentionAlerts(board, weeks, people)
  const { counts, groups } = groupAlerts(alerts)

  function act(alert) {
    if (alert.kind === 'project') ui.openDemand(alert.id)
    else if (alert.kind === 'person') ui.openEmployee(alert.id)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Attention Center</div>
          <div className="page-subtitle">{ui.officeFilter || 'All offices'} · {weeks.length}-week horizon</div>
        </div>
      </div>

      <div className="alert-summary-grid">
        <div className="alert-summary-card" style={{ '--ac': '#fb7185' }}>
          <b>{counts.critical}</b>
          <span>Critical gaps</span>
        </div>
        <div className="alert-summary-card" style={{ '--ac': '#fbbf24' }}>
          <b>{counts.warning}</b>
          <span>At capacity</span>
        </div>
        <div className="alert-summary-card" style={{ '--ac': '#a78bfa' }}>
          <b>{counts.planning}</b>
          <span>Plans needed</span>
        </div>
        <div className="alert-summary-card" style={{ '--ac': '#38bdf8' }}>
          <b>{counts.capacity}</b>
          <span>Capacity leads</span>
        </div>
      </div>

      {!alerts.length && (
        <div className="empty-block">
          <b>No active staffing alerts</b>
          The active horizon is balanced and planned.
        </div>
      )}

      {groups.map((g) => {
        if (!g.rows.length) return null
        const scrollable = g.key !== 'critical'
        const rows = g.rows.map((a, i) => (
          <div key={i} className="alert-center-row" style={{ '--ac': a.c }} onClick={() => act(a)}>
            <div className="alert-center-copy">
              <b>{a.title}</b>
              <span>{a.detail}</span>
            </div>
            <span className="alert-center-action">{a.action} &rarr;</span>
          </div>
        ))
        return (
          <div key={g.key} className="card alert-center-section">
            <h3>
              {g.label} · {g.rows.length}
            </h3>
            {scrollable ? <div className="alert-list-scroll">{rows}</div> : rows}
          </div>
        )
      })}
    </div>
  )
}
