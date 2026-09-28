import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { avColor, initials, utilColor } from '../../engine/colors.js'
import { personUtil } from '../../engine/utilization.js'

export default function HeatmapBoard({ people, weeks }) {
  const { board } = useBoard()
  const ui = useUi()

  return (
    <div className="board-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th className="person-th">Person</th>
            {weeks.map((w) => (
              <th key={w.key}>{w.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id}>
              <td className="person-cell">
                <div className="person-cell-inner" style={{ cursor: 'pointer' }} onClick={() => ui.openEmployee(person.id)} title="Open employee detail">
                  <span className="avatar" style={{ background: avColor(person.name) }}>
                    {initials(person.name)}
                  </span>
                  <div className="person-name">{person.name}</div>
                </div>
              </td>
              {weeks.map((w) => {
                const u = personUtil(board, person, [w])
                return (
                  <td key={w.key} className="heat-cell" style={{ background: utilColor(u) + '33', color: utilColor(u) }}>
                    {u}%
                  </td>
                )
              })}
            </tr>
          ))}
          {!people.length && (
            <tr>
              <td colSpan={1 + weeks.length} className="empty-block">
                No one matches the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
