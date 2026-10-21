import { useEffect, useRef, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js'
import { projColor } from '../../engine/colors.js'
import { projectWeekCoverage, coverageLabel } from '../../engine/demand.js'
import { useBoardDnd } from './DndContext.jsx'

const PAD = 12
const DEFAULT_STYLE = { top: 96, right: 24 }

// Visibility is owned by the "Show/Hide job tray" button in BoardHeader (ui.jobTrayOpen) —
// this component only mounts while that's true. It just owns its own on-screen position.
export default function JobTray({ weekKey }) {
  const { board } = useBoard()
  const ui = useUi()
  const dnd = useBoardDnd()
  const [pos, setPos] = useLocalStorageState('eagle_mc_jobtray_pos', null) // {x,y} top-left in px, or null = default corner
  const [q, setQ] = useState('')
  const panelRef = useRef(null)
  const dragRef = useRef(null)

  function clamp(x, y, w, h) {
    const maxX = Math.max(PAD, window.innerWidth - w - PAD)
    const maxY = Math.max(PAD, window.innerHeight - h - PAD)
    return { x: Math.min(Math.max(PAD, x), maxX), y: Math.min(Math.max(PAD, y), maxY) }
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return
    const el = panelRef.current
    const w = el ? el.offsetWidth : 268
    const h = el ? el.offsetHeight : 320
    setPos(clamp(e.clientX - dragRef.current.dx, e.clientY - dragRef.current.dy, w, h))
  }

  function handlePointerUp() {
    dragRef.current = null
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  function handlePointerDown(e) {
    if (e.button !== 0 || e.target.closest('button, input')) return
    const el = panelRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    // Seed an explicit position immediately so the panel doesn't jump if it was still at the default corner.
    if (!pos) setPos(clamp(rect.left, rect.top, rect.width, rect.height))
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetPosition() {
    setPos(null)
  }

  const style = pos ? { left: pos.x, top: pos.y } : DEFAULT_STYLE

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
    <div className="tray-column job-tray-float" ref={panelRef} style={style}>
      <div className="tray-head" onPointerDown={handlePointerDown} onDoubleClick={resetPosition} title="Drag to move · double-click to reset position">
        <span className="tray-drag-handle">&#8942;&#8942;</span>
        <input className="pill-input" style={{ flex: 1 }} placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="icon-btn" onClick={() => ui.setJobTrayOpen(false)} title="Close job tray">
          &#10005;
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
