import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { projectWeekCoverage, coverageClass, coverageLabel } from '../../engine/demand.js'
import { personPlanningRole } from '../../engine/planningRoles.js'
import { normalizeSkills } from '../../engine/skills.js'
import { projColor } from '../../engine/colors.js'
import DemandRoleRow from './DemandRoleRow.jsx'
import CoverageMeter from './CoverageMeter.jsx'

export default function ProjectDemandDrawer({ projectId, week, onClose }) {
  const { board, setDemand, updateProject } = useBoard()
  const ui = useUi()
  const toast = useToast()
  const weeks = useWeeks(ui.horizonWeeks)
  const [activeWeek, setActiveWeek] = useState(week || weeks[0].key)
  const [rows, setRows] = useState([])
  const [pmId, setPmId] = useState('')
  const [status, setStatus] = useState('draft')
  const [notes, setNotes] = useState('')
  const [skillsInput, setSkillsInput] = useState('')

  const project = board.projects.find((p) => p.id === projectId)
  const projectIndex = board.projects.findIndex((p) => p.id === projectId)
  const coverage = project ? projectWeekCoverage(board, projectId, activeWeek) : null

  useEffect(() => {
    if (!coverage) return
    const record = coverage.record
    setRows(record ? record.roles.map((r) => ({ ...r })) : [])
    setPmId(record?.pmId || '')
    setStatus(record?.status || 'draft')
    setNotes(record?.notes || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWeek, projectId])

  useEffect(() => {
    if (project) setSkillsInput((project.requiredSkills || []).join(', '))
  }, [project])

  if (!project) return null

  function saveSkills() {
    updateProject(projectId, { requiredSkills: normalizeSkills(skillsInput) })
  }

  function save() {
    saveSkills()
    if (rows.length) {
      setDemand(projectId, activeWeek, { pmId, status, notes: notes.trim(), roles: rows, updatedAt: Date.now() })
      toast('PM demand saved')
    } else {
      setDemand(projectId, activeWeek, null)
      toast('No role demand entered')
    }
  }

  function clearWeek() {
    if (!window.confirm('Clear the PM demand plan for this project and week?')) return
    setDemand(projectId, activeWeek, null)
    setRows([])
    toast('Weekly demand cleared')
  }

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className="drawer wide">
        <div className="modal-head">
          <div className="card-row">
            <span className="avatar" style={{ background: projColor(project, Math.max(projectIndex, 0)), width: 10, height: 10, borderRadius: 3 }} />
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>PM demand planner</div>
              <div className="card-title">{project.name}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="panel-title" style={{ marginTop: 10 }}>
          Project skill requirements
        </div>
        <input style={{ width: '100%', marginBottom: 6 }} value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} onBlur={saveSkills} placeholder="Niagara N4, Distech, Startup, Commissioning…" />
        <div style={{ marginBottom: 10 }}>
          {(project.requiredSkills || []).length ? project.requiredSkills.map((s) => <span key={s} className="skill-chip req">{s}</span>) : <span className="skill-chip empty">No project skills tagged</span>}
        </div>

        <div className="demand-tabs">
          {weeks.map((w, i) => {
            const wc = projectWeekCoverage(board, projectId, w.key)
            return (
              <button key={w.key} className={'demand-tab ' + coverageClass(wc) + (w.key === activeWeek ? ' on' : '')} onClick={() => setActiveWeek(w.key)}>
                <b>Week {i + 1}</b>
                <span>{w.label}</span>
                <small>{coverageLabel(wc)}</small>
              </button>
            )
          })}
        </div>

        <CoverageMeter coverage={coverage} />

        <div style={{ marginBottom: 10 }}>
          {coverage.hasPlan ? (
            coverage.roleGaps.map((g) => (
              <span key={g.role} className={'role-gap-pill' + (g.gap ? '' : ' good')}>
                {g.role} · {g.gap ? g.gap + 'h still needed' : 'covered'}
              </span>
            ))
          ) : (
            <span className="role-gap-pill">Add PM requirements for this week</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 180 }}>
            <div className="panel-title">PM / demand owner</div>
            <select value={pmId} onChange={(e) => setPmId(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select PM / owner</option>
              {board.people.map((per) => (
                <option key={per.id} value={per.id}>
                  {per.name} · {personPlanningRole(per)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 160 }}>
            <div className="panel-title">Planning status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
              <option value="draft">Draft estimate</option>
              <option value="confirmed">Confirmed need</option>
            </select>
          </label>
        </div>

        <div className="panel-title">Role requirements</div>
        <div className="demand-role-head">
          <span>General role</span>
          <span>People</span>
          <span>Hours each</span>
          <span />
        </div>
        {rows.map((row, i) => (
          <DemandRoleRow key={i} row={row} roles={board.staffingRoles} onChange={(next) => setRows(rows.map((r, ri) => (ri === i ? next : r)))} onRemove={() => setRows(rows.filter((_, ri) => ri !== i))} />
        ))}
        <button className="btn ghost" onClick={() => setRows([...rows, { role: board.staffingRoles[0], heads: 1, hours: 40 }])}>
          + Add role requirement
        </button>

        <label style={{ display: 'block', marginTop: 12 }}>
          <div className="panel-title">PM notes / assumptions</div>
          <textarea rows={3} style={{ width: '100%' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Upcoming phase, timing, skills, travel, confidence, or known constraints…" />
        </label>

        <div className="modal-actions">
          <button className="btn" onClick={clearWeek}>
            Clear week
          </button>
          <button className="btn primary" onClick={save}>
            Save PM demand
          </button>
        </div>
      </div>
    </>
  )
}
