import { weekOpsStats } from '../../engine/utilization.js'

export default function HorizonPulse({ board, weeks, officeFilter, onSelectWeek }) {
  const slabs = weeks.slice(0, 4).map((w) => weekOpsStats(board, w, officeFilter))

  return (
    <div className="horizon-pulse">
      {slabs.map((s, i) => {
        const color = s.pressure > 100 ? '#fb7185' : s.pressure >= 90 ? '#fbbf24' : '#34d399'
        return (
          <div key={s.w.key} className="horizon-slab" style={{ borderColor: color }} onClick={() => onSelectWeek?.(s.w)}>
            <b style={{ color }}>{s.pressure}%</b>
            <small>
              Week {i + 1} · {s.w.label}
            </small>
          </div>
        )
      })}
    </div>
  )
}
