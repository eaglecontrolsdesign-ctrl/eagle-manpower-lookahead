import { OFFICES } from '../../engine/constants.js'
import { personUtil } from '../../engine/utilization.js'
import { utilColor } from '../../engine/colors.js'

export default function UtilizationByOffice({ board, weeks }) {
  return (
    <div>
      {OFFICES.map((office) => {
        const ppl = board.people.filter((p) => (p.office || 'Charlotte') === office)
        if (!ppl.length) return null
        return (
          <div key={office} style={{ marginBottom: 16 }}>
            <div className="panel-title">{office}</div>
            {ppl.map((p) => {
              const u = personUtil(board, p, weeks)
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 130, fontSize: 12.5 }}>{p.name}</div>
                  <div className={'progress-bar' + (u >= 100 ? ' over' : '')} style={{ flex: 1 }}>
                    <i style={{ width: Math.min(u, 100) + '%', background: utilColor(u) }} />
                  </div>
                  <div style={{ width: 40, fontSize: 12, textAlign: 'right' }}>{u}%</div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
