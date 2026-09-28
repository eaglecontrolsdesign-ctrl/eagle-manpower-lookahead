import { useBoard } from '../../context/BoardContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { useUi } from '../../context/UiContext.jsx'
import { personUtil } from '../../engine/utilization.js'
import { utilColor } from '../../engine/colors.js'

export default function MoveWorkSuggestions({ personId }) {
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks)
  const rec = board.people
    .filter((p) => p.id !== personId)
    .map((p) => ({ p, u: personUtil(board, p, weeks) }))
    .sort((a, b) => a.u - b.u)
    .slice(0, 3)

  if (!rec.length) return null

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="panel-title">Recommended reallocation</div>
      {rec.map((x) => (
        <div key={x.p.id} className="alert-center-row" style={{ '--ac': utilColor(x.u) }}>
          <div className="alert-center-copy">
            <b>{x.p.name}</b>
            <span>
              {Math.max(0, Math.round(((100 - x.u) / 100) * weeks.length * 40))}h available · after 8h: {Math.min(105, x.u + 5)}%
            </span>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Drag a project chip from the board onto one of these people to confirm a move.</div>
    </div>
  )
}
