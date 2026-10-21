import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { dayVal } from '../../engine/schedule.js'
import { personUtil } from '../../engine/utilization.js'
import { projectDemandData } from '../../engine/demand.js'
import { getAttentionAlerts } from '../../engine/alerts.js'
import KpiCard from './KpiCard.jsx'
import UtilizationGauge from './UtilizationGauge.jsx'
import HorizonPulse from './HorizonPulse.jsx'
import NeedsAttentionList from './NeedsAttentionList.jsx'

export default function Dashboard() {
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks)
  const forecastWeeks = useWeeks(4)

  const people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
  const capacity = Math.max(people.length * weeks.length * 40, 1)
  let assigned = 0
  people.forEach((per) => weeks.forEach((w) => { for (let d = 0; d < 5; d++) if (dayVal(board.days, board.holidays, per.id, w.key, d)) assigned += 8 }))
  const util = Math.round((assigned / capacity) * 100)
  const over = people.filter((p) => personUtil(board, p, weeks) >= 100)
  const under = people.filter((p) => personUtil(board, p, weeks) < 50)
  const open = Math.max(0, capacity - assigned)
  const pd = projectDemandData(board, weeks, ui.officeFilter)
  const gaps = pd.reduce((s, x) => s + (x.gap || 0), 0)
  const totalDemand = pd.reduce((s, x) => s + x.demand, 0)
  const alerts = getAttentionAlerts(board, weeks, people)

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{ui.officeFilter || 'All offices'} · {weeks.length}-week horizon</div>
        </div>
      </div>

      <div className="stat-row">
        <KpiCard label="Company utilization" value={util + '%'} onClick={() => ui.applyKpiFilter('')} />
        <KpiCard label="At capacity" value={over.length} sub="≥100% utilized" active={ui.utilizationFilter === 'over'} onClick={() => { ui.applyKpiFilter('over'); ui.setActiveView('board') }} />
        <KpiCard label="Under assigned" value={under.length} sub="<50% utilized" active={ui.utilizationFilter === 'under'} onClick={() => { ui.applyKpiFilter('under'); ui.setActiveView('board') }} />
        <KpiCard label="Total PM demand" value={totalDemand + 'h'} onClick={() => ui.setActiveView('pmdemand')} />
        <KpiCard label="Open capacity" value={open + 'h'} active={ui.utilizationFilter === 'available'} onClick={() => { ui.applyKpiFilter('available'); ui.setActiveView('board') }} />
        <KpiCard label="Unstaffed demand" value={gaps + 'h'} onClick={() => ui.setActiveView('pmdemand')} />
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: '220px 1fr' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div className="panel-title">Company utilization</div>
          <UtilizationGauge util={util} />
        </div>
        <div className="card">
          <div className="panel-title">Next 4 weeks · capacity pressure</div>
          <HorizonPulse board={board} weeks={forecastWeeks} officeFilter={ui.officeFilter} onSelectWeek={() => ui.setActiveView('board')} />
        </div>
      </div>

      <NeedsAttentionList alerts={alerts} onOpenAlert={(a) => (a.kind === 'project' ? ui.openDemand(a.id) : a.kind === 'person' ? ui.openEmployee(a.id) : null)} onOpenAll={() => ui.setActiveView('alerts')} />
    </div>
  )
}
