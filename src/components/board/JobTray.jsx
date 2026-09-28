import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js'
import { projColor } from '../../engine/colors.js'
import { projectWeekCoverage, coverageLabel } from '../../engine/demand.js'
import { useBoardDnd } from './DndContext.jsx'

export default function JobTray({ weekKey }) {
  const { board } = useBoard()
  const ui = useUi()
  const dnd = useBoardDnd()
  const [collapsed, setCollapsed] = useLocalStorageState('eagle_mc_jobtray_collapsed', false)
  const [q, setQ] = useState('')

  if (collapsed) {
    return (
      <div className="tray-column collapsed">
        <div className="tray-collapsed-strip" onClick={() => setCollapsed(false)} title="Open job tray">
          <span>&#8249;</span>
          <span className="tray-collapsed-label">Job tray</span>
        </div>
      </div>
    )
  }

  const jobs = board.projects
    .map((p, i) => ({ p, color: projColor(p, i) }))
    .filter((x) => (!ui.officeFilter || !x.p.office || x.p.office === ui.officeFilter) && (!q || x.p.name.toLowerCase().includes(q.toLowerCase())))
  const overhead = board.overhead
    .filter((s) => s.id !== '__HOL' && (!q || s.name.toLowerCase().includes(q.toLowerCase())))
    .map((s) => ({ p: s, color: s.color || '#94a3b8' }))

  function meta(x) {
    const isProject = board.projects.some((p) => p.id === x.p.id)
    if (!isProject) return null
    const c = projectWeekCoverage(board, x.p.id, weekKey)
    return { text: coverageLabel(c), needs: !c.hasPlan || c.gap > 0 }
  }

  function renderRow(x) {
    const m = meta(x)
    return (
      <div
        key={x.p.id}
        className="tray-job"
        style={{ '--tray-color': x.color }}
        draggable="true"
        onDragStart={(e) => {
          dnd.startJobDrag(x.p.id)
          e.dataTransfer.effectAllowed = 'copyMove'
          e.dataTransfer.setData('text/plain', x.p.id)
        }}
        onDragEnd={dnd.endJobDrag}
        title={'Drag ' + x.p.name + ' onto a day'}
      >
        <span className="tray-dot" />
        <b>{x.p.name}</b>
        {m && <small className={m.needs ? 'tray-need' : ''}>{m.text}</small>}
      </div>
    )
  }

  return (
    <div className="tray-column">
      <div className="tray-head">
        <input className="pill-input" style={{ flex: 1 }} placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="icon-btn" onClick={() => setCollapsed(true)} title="Collapse job tray">
          &#8250;
        </button>
      </div>
      {jobs.length > 0 && (
        <div>
          <div className="tray-group-title">
            <span>Current jobs</span>
            <span>{jobs.length}</span>
          </div>
          {jobs.map(renderRow)}
        </div>
      )}
      {overhead.length > 0 && (
        <div>
          <div className="tray-group-title">
            <span>Overhead</span>
            <span>{overhead.length}</span>
          </div>
          {overhead.map(renderRow)}
        </div>
      )}
      {!jobs.length && !overhead.length && <div className="empty-block">No matching jobs or overhead.</div>}
    </div>
  )
}
