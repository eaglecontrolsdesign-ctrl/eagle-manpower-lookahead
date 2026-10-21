import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { weekDemandSummary } from '../../engine/demand.js'

// Ported from the old app's shared board header — every board view (People/Projects/Heatmap)
// showed this same office-scoped PM-demand rollup under each week's column header.
export default function WeekDemandSummary({ wkKey }) {
  const { board } = useBoard()
  const ui = useUi()
  const s = weekDemandSummary(board, wkKey, ui.officeFilter)

  return (
    <div className="week-demand-summary" onClick={() => ui.setActiveView('pmdemand')} title="View PM Demand">
      <b>{s.demand}h</b> demand · {s.open}h open
      {s.gap > 0 && <span className="gap"> · {s.gap}h gap</span>}
      {s.draft > 0 && <span className="draft"> · {s.draft} draft</span>}
    </div>
  )
}
