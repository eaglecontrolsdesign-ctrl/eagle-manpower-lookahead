import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { OFFICES, HORIZON_OPTIONS } from '../../engine/constants.js'

const VIEWS = [
  { key: 'people', label: 'People' },
  { key: 'projects', label: 'Projects' },
  { key: 'heatmap', label: 'Heatmap' },
]

export default function BoardHeader() {
  const { board } = useBoard()
  const ui = useUi()

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
        {board.projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <div className="pill-tabs">
        {HORIZON_OPTIONS.map((n) => (
          <button key={n} className={'pill-tab' + (ui.horizonWeeks === n ? ' on' : '')} onClick={() => ui.setHorizonWeeks(n)}>
            {n}w
          </button>
        ))}
      </div>

      {ui.utilizationFilter && (
        <button className="badge info" onClick={() => ui.applyKpiFilter('')}>
          Filter: {ui.utilizationFilter} &#10005;
        </button>
      )}
    </div>
  )
}
