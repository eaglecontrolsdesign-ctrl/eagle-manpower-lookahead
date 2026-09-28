import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { weekOpsStats, personUtil } from '../../engine/utilization.js'
import { projectHealth } from '../../engine/health.js'
import ProjectHealthList from './ProjectHealthList.jsx'
import RolePressure from './RolePressure.jsx'
import ScenarioLab from './ScenarioLab.jsx'

export default function OpsIntelligencePanel() {
  const { board } = useBoard()
  const ui = useUi()
  const weeks12 = useWeeks(12)
  const weeks4 = useWeeks(4)
  const weeks8 = weeks12.slice(0, 8)

  const people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
  const projects = board.projects.filter((p) => !ui.officeFilter || !p.office || p.office === ui.officeFilter)
  const stats = weeks12.map((w) => weekOpsStats(board, w, ui.officeFilter))

  const capacity = stats.reduce((s, x) => s + x.capacity, 0)
  const scheduled = stats.reduce((s, x) => s + x.scheduled, 0)
  const demand = stats.reduce((s, x) => s + x.demand, 0)
  const gap = stats.reduce((s, x) => s + x.gap, 0)
  const peak = stats.reduce((a, b) => (b.pressure > a.pressure ? b : a), stats[0] || { pressure: 0, w: { label: '' } })
  const atCap = people.filter((p) => weeks4.some((w) => personUtil(board, p, [w]) >= 100)).length
  const hireSignal = Math.max(0, ...stats.map((x) => Math.ceil(Math.max(0, x.demand - x.capacity) / 40)))
  const maxPct = Math.max(110, ...stats.map((x) => Math.max(x.scheduledUtil, x.demandUtil)))

  const health = projects.map((p) => projectHealth(board, p, weeks8)).sort((a, b) => a.score - b.score)
  const actions = []
  health.filter((x) => x.gap > 0).slice(0, 3).forEach((x) => actions.push({ c: x.color, title: x.project.name, detail: x.gap + 'h role gap across next 8 weeks', tag: 'STAFF', onClick: () => ui.openDemand(x.project.id) }))
  health.filter((x) => !x.planned && x.scheduled).slice(0, 2).forEach((x) => actions.push({ c: '#a78bfa', title: x.project.name, detail: x.scheduled + 'h scheduled with no PM demand plan', tag: 'PLAN', onClick: () => ui.openDemand(x.project.id) }))
  stats.filter((x) => x.pressure > 100).slice(0, 2).forEach((x) => actions.push({ c: '#fb7185', title: x.w.label, detail: 'Modeled demand reaches ' + x.pressure + '% of available capacity', tag: 'CAPACITY', onClick: () => document.getElementById('scenario-lab')?.scrollIntoView({ behavior: 'smooth' }) }))
  people
    .map((p) => ({ p, u: Math.max(...weeks4.map((w) => personUtil(board, p, [w]))) }))
    .filter((x) => x.u >= 100)
    .slice(0, 2)
    .forEach((x) => actions.push({ c: '#fbbf24', title: x.p.name, detail: 'Hits ' + x.u + '% utilization in the next 4 weeks', tag: 'REBALANCE', onClick: () => ui.openEmployee(x.p.id) }))
  if (!actions.length) actions.push({ c: '#34d399', title: 'No critical staffing actions', detail: 'The current modeled plan has no immediate capacity conflicts.', tag: 'CLEAR' })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Ops Intelligence</div>
          <div className="page-subtitle">{ui.officeFilter || 'All offices'} · {people.length} people · {projects.length} projects</div>
        </div>
      </div>

      <div className="ops-mini-grid">
        <div className="stat-tile"><span className="lbl">12-wk demand</span><span className="num">{demand}h</span><span className="sub">{gap ? gap + 'h currently uncovered' : 'covered'}</span></div>
        <div className="stat-tile"><span className="lbl">Scheduled</span><span className="num">{scheduled}h</span><span className="sub">{capacity ? Math.round((scheduled / capacity) * 100) + '% of capacity' : '—'}</span></div>
        <div className="stat-tile"><span className="lbl">Peak pressure</span><span className="num">{peak.pressure}%</span><span className="sub">{peak.w.label || 'No active weeks'}</span></div>
        <div className="stat-tile"><span className="lbl">At capacity</span><span className="num">{atCap}</span><span className="sub">{atCap ? 'people hit 100% in next 4 weeks' : 'no one locked at 100%'}</span></div>
        <div className="stat-tile"><span className="lbl">Hire signal</span><span className="num">{hireSignal ? '+' + hireSignal : '0'}</span><span className="sub">{hireSignal ? 'peak equivalent FTE shortage' : 'no modeled FTE deficit'}</span></div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="panel-title">12-week forecast · scheduled vs. PM demand</div>
        <div className="ops-forecast">
          {stats.map((x, i) => {
            const risk = x.pressure > 100 || x.gap > 0
            const fc = x.pressure > 100 ? '#fb7185' : x.pressure >= 90 ? '#fbbf24' : '#34d399'
            const sh = Math.min(100, Math.max(2, (x.scheduledUtil / maxPct) * 100))
            const dh = Math.min(100, Math.max(x.demand ? 2 : 0, (x.demandUtil / maxPct) * 100))
            return (
              <div key={x.w.key} className={'forecast-week' + (x.w.isCurrent ? ' current' : '')}>
                <strong style={{ '--fc': fc }}>{x.pressure}%</strong>
                <div className="forecast-bars" title={x.w.label + ' · ' + x.scheduled + 'h scheduled · ' + x.demand + 'h PM demand · ' + x.capacity + 'h capacity'}>
                  <i className="forecast-bar scheduled" style={{ '--sh': sh + '%' }} />
                  <i className={'forecast-bar demand' + (risk ? ' risk' : '')} style={{ '--dh': dh + '%' }} />
                </div>
                <label>W{i + 1}</label>
                <small>{x.gap}h gap</small>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="panel-title">Action center</div>
        {actions.slice(0, 6).map((a, i) => (
          <div key={i} className="ops-action" style={{ '--ac': a.c }} onClick={a.onClick}>
            <div>
              <b>{a.title}</b>
              <span> — {a.detail}</span>
            </div>
            <em>{a.tag}</em>
          </div>
        ))}
      </div>

      <div className="grid-cards" style={{ gridTemplateColumns: '1.4fr 1fr', marginBottom: 14 }}>
        <div className="card">
          <div className="panel-title">Project health</div>
          <ProjectHealthList board={board} projects={projects} weeks8={weeks8} onOpenProject={(id) => ui.openDemand(id)} />
        </div>
        <div className="card">
          <div className="panel-title">Role pressure</div>
          <RolePressure board={board} projects={projects} weeks8={weeks8} />
        </div>
      </div>

      <div className="card" id="scenario-lab">
        <div className="panel-title">Scenario lab</div>
        <ScenarioLab />
      </div>
    </div>
  )
}
