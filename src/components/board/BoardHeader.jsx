import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { OFFICES, HORIZON_OPTIONS } from '../../engine/constants.js'

const VIEWS = [
  { key: 'people', label: 'People' },
  { key: 'projects', label: 'Projects' },
  { key: 'heatmap', label: 'Heatmap' },
]

function byName(a, b) {
  return a.name.localeCompare(b.name)
}

export default function BoardHeader() {
  const { board } = useBoard()
  const ui = useUi()

  const officeJobs = OFFICES.map((o) => ({ office: o, projects: board.projects.filter((p) => p.office === o).sort(byName) })).filter((g) => g.projects.length)
  const sharedJobs = board.projects.filter((p) => !p.office).sort(byName)

  return (
    <div className="board-toolbar">
      <div className="pill-tabs">
        {VIEWS.map((v) => (
          <button key={v.key} className={'pill-tab' + (ui.boardView === v.key ? ' on' : '')} onClick={() => ui.setBoardView(v.key)}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="pill-tabs">
        <button className={'pill-tab' + (!ui.officeFilter ? ' on' : '')} onClick={() => ui.setOfficeFilter('')}>
          All offices
        </button>
        {OFFICES.map((o) => (
          <button key={o} className={'pill-tab' + (ui.officeFilter === o ? ' on' : '')} onClick={() => ui.setOfficeFilter(o)}>
            {o}
          </button>
        ))}
      </div>

      <select className="pill-select" value={ui.jobFilter} onChange={(e) => ui.setJobFilter(e.target.value)}>
        <option value="">All jobs</option>
        {officeJobs.map((g) => (
          <optgroup key={g.office} label={g.office}>
            {g.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        ))}
        {sharedJobs.length > 0 && (
          <optgroup label="Shared / multi-office">
            {sharedJobs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div className="pill-tabs">
        {HORIZON_OPTIONS.map((n) => (
          <button key={n} className={'pill-tab' + (ui.horizonWeeks === n ? ' on' : '')} onClick={() => ui.setHorizonWeeks(n)}>
            {n}w
          </button>
        ))}
      </div>

      {ui.horizonWeeks === 1 && (
        <div className="pill-tabs">
          <button className="pill-tab" onClick={() => ui.setWeekOffset((o) => o - 1)} title="Previous week">
            &#8249;
          </button>
          <button className={'pill-tab' + (ui.weekOffset === 0 ? ' on' : '')} onClick={() => ui.setWeekOffset(0)}>
            Today
          </button>
          <button className="pill-tab" onClick={() => ui.setWeekOffset((o) => o + 1)} title="Next week">
            &#8250;
          </button>
        </div>
      )}

      {ui.utilizationFilter && (
        <button className="badge info" onClick={() => ui.applyKpiFilter('')}>
          Filter: {ui.utilizationFilter} &#10005;
        </button>
      )}

      <button className={'btn' + (ui.jobTrayOpen ? ' primary' : '')} style={{ marginLeft: 'auto' }} onClick={() => ui.setJobTrayOpen((v) => !v)}>
        {ui.jobTrayOpen ? 'Hide job tray' : 'Show job tray'}
      </button>
    </div>
  )
}
