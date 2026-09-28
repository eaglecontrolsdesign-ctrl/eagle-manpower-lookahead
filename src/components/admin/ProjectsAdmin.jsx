import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { uid } from '../../engine/ids.js'
import { projColor } from '../../engine/colors.js'
import { normalizeSkills } from '../../engine/skills.js'
import { OFFICES } from '../../engine/constants.js'

export default function ProjectsAdmin() {
  const { board, addProject, updateProject, removeProject } = useBoard()
  const toast = useToast()
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addProject({ id: uid('job_'), name: name.trim(), office: '', requiredSkills: [] })
    toast(name.trim() + ' added')
    setName('')
  }

  function editSkills(project) {
    const value = window.prompt('Required skills for ' + project.name + '\nSeparate with commas:', (project.requiredSkills || []).join(', '))
    if (value === null) return
    updateProject(project.id, { requiredSkills: normalizeSkills(value) })
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <input placeholder="Project / job name" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 1 }} />
        <button className="btn primary" type="submit">
          Add
        </button>
      </form>

      {board.projects.map((p, i) => (
        <div key={p.id} className="card-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span className="avatar" style={{ background: projColor(p, i), width: 10, height: 10, borderRadius: 3 }} />
          <div style={{ flex: 1, marginLeft: 8, fontWeight: 650, fontSize: 13 }}>{p.name}</div>
          <select value={p.office || ''} onChange={(e) => updateProject(p.id, { office: e.target.value })} title="Restrict to office (blank = shared)">
            <option value="">Shared / all offices</option>
            {OFFICES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button className="icon-btn" onClick={() => editSkills(p)} title="Required skills">
            &#127919;
          </button>
          <button
            className="icon-btn"
            onClick={() => {
              if (window.confirm('Remove ' + p.name + '? This does not clear existing schedule assignments.')) removeProject(p.id)
            }}
            title="Remove"
          >
            &#10005;
          </button>
        </div>
      ))}
      {!board.projects.length && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>No projects yet</div>}
    </div>
  )
}
