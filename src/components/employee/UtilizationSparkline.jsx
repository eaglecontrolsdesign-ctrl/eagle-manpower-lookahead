import { useBoard } from '../../context/BoardContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { personUtil } from '../../engine/utilization.js'
import { utilColor } from '../../engine/colors.js'

export default function UtilizationSparkline({ person }) {
  const { board } = useBoard()
  const weeks = useWeeks(8)
  const trend = weeks.map((w) => ({ w, u: personUtil(board, person, [w]) }))

  return (
    <div className="util-trend">
      {trend.map((x, i) => (
        <div key={x.w.key} className="util-trend-bar" style={{ height: Math.max(4, x.u * 0.75) + '%', background: 'linear-gradient(180deg,' + utilColor(x.u) + ',rgba(14,116,144,.35))' }} title={x.w.label + ' · ' + x.u + '%'}>
          <span>W{i + 1}</span>
        </div>
      ))}
    </div>
  )
}
