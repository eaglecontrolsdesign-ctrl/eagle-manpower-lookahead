import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { uid } from '../../engine/ids.js'
import { projColor } from '../../engine/colors.js'
import { normalizeSkills } from '../../engine/skills.js'
import { OFFICES } from '../../engine/constants.js'
import { userRoles, rolesLabel, rolesSortKey } from '../../engine/roles.js'
import { displayName } from '../../engine/userNames.js'

export default function ProjectsAdmin() {
  const { board, addProject, updateProject, removeProject } = useBoard()
  const toast = useToast()
  const [name, setName] = useState('')
  // Users (from the users collection) to pick a project manager from — PMs listed first.
  const [users, setUsers] = useState([])

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      list.sort((a, b) => rolesSortKey(a) - rolesSortKey(b) || a.id.localeCompare(b.id))
      setUsers(list)
    })
  }, [])

  // Jobs are either projects (the default) or service work (project.kind === 'service'); the
  // list below keeps the two apart so service items don't get lost among the job numbers.
  const [kind, setKind] = useState('project')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addProject({ id: uid('job_'), name: name.trim(), office: '', requiredSkills: [], kind: kind === 'service' ? 'service' : '' })
    toast(name.trim() + ' added' + (kind === 'service' ? ' under Service' : ''))
    setName('')
  }

  function editSkills(project) {
    const value = window.prompt('Required skills for ' + project.name + '\nSeparate with commas:', (project.requiredSkills || []).join(', '))
    if (value === null) return
    updateProject(project.id, { requiredSkills: normalizeSkills(value) })
  }

  // Keep each job's position in board.projects so its colour stays what it is on the board.
  const indexed = board.projects.map((p, i) => ({ p, i }))
  const sections = [
    { key: 'project', title: 'Projects', empty: 'No projects yet', items: indexed.filter(({ p }) => p.kind !== 'service') },
    { key: 'service', title: 'Service', empty: 'No service items yet — switch a job to Service, or add one below', items: indexed.filter(({ p }) => p.kind === 'service') },
  ]

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <input placeholder="Project / job name" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 1, minWidth: 220 }} />
        <div className="pill-tabs" title="Add as a project or as service work">
          <button type="button" className={'pill-tab' + (kind === 'project' ? ' on' : '')} onClick={() => setKind('project')}>
            Project
          </button>
          <button type="button" className={'pill-tab' + (kind === 'service' ? ' on' : '')} onClick={() => setKind('service')}>
            Service
          </button>
        </div>
        <button className="btn primary" type="submit">
          Add
        </button>
      </form>

      {sections.map((s) => (
        <div key={s.key} style={{ marginBottom: 18 }}>
          <div className="panel-title">
            {s.title} <span style={{ color: 'var(--muted)' }}>· {s.items.length}</span>
          </div>
          {!s.items.length && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{s.empty}</div>}
          {s.items.map(({ p, i }) => (
        <div key={p.id} className="card-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 6 }}>
          <span className="avatar" style={{ background: projColor(p, i), width: 10, height: 10, borderRadius: 3 }} />
          <div style={{ flex: 1, marginLeft: 8, fontWeight: 650, fontSize: 13 }}>{p.name}</div>
          <div className="pill-tabs" title="Project or service work">
            <button className={'pill-tab' + (p.kind !== 'service' ? ' on' : '')} onClick={() => updateProject(p.id, { kind: '' })}>
              Project
            </button>
            <button className={'pill-tab' + (p.kind === 'service' ? ' on' : '')} onClick={() => updateProject(p.id, { kind: 'service' })}>
              Service
            </button>
          </div>
          <select value={p.office || ''} onChange={(e) => updateProject(p.id, { office: e.target.value })} title="Restrict to office (blank = shared)">
            <option value="">Shared / all offices</option>
            {OFFICES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            value={p.pmEmail || ''}
            onChange={(e) => updateProject(p.id, { pmEmail: e.target.value })}
            title="Project manager — a user with the PM role only sees their own projects on PM Demand"
            style={{ maxWidth: 220 }}
          >
            <option value="">No PM assigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {displayName(u)}
                {userRoles(u).length ? ' (' + rolesLabel(userRoles(u)) + ')' : ''}
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
        </div>
      ))}
    </div>
  )
}
