import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { uid } from '../../engine/ids.js'
import { avColor, initials } from '../../engine/colors.js'
import { inferPlanningRole, personPlanningRole } from '../../engine/planningRoles.js'
import { normalizeSkills } from '../../engine/skills.js'
import { OFFICES } from '../../engine/constants.js'
import StaffingRolesAdmin from './StaffingRolesAdmin.jsx'

export default function RosterAdmin() {
  const { board, addPerson, updatePerson, removePerson } = useBoard()
  const toast = useToast()
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [office, setOffice] = useState('Charlotte')

  function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    addPerson({ id: uid('per_'), name: name.trim(), role: role.trim(), office, skills: [], planningRole: inferPlanningRole(role) })
    toast(name.trim() + ' added to the roster')
    setName('')
    setRole('')
  }

  function editSkills(person) {
    const value = window.prompt('Skills / capabilities for ' + person.name + '\nSeparate with commas:', (person.skills || []).join(', '))
    if (value === null) return
    updatePerson(person.id, { skills: normalizeSkills(value) })
  }

  return (
    <div className="board-split">
      <div className="board-main">
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required style={{ flex: 2 }} />
          <input placeholder="Job title" value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: 2 }} />
          <select value={office} onChange={(e) => setOffice(e.target.value)}>
            {OFFICES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <button className="btn primary" type="submit">
            Add
          </button>
        </form>

        {OFFICES.map((o) => {
        const ppl = board.people.filter((p) => (p.office || 'Charlotte') === o)
        return (
          <div key={o} style={{ marginBottom: 16 }}>
            <div className="panel-title">
              {o} <span style={{ color: 'var(--muted)' }}>· {ppl.length}</span>
            </div>
            {ppl.map((p) => (
              <div key={p.id} className="card-row" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="avatar" style={{ background: avColor(p.name), width: 24, height: 24, fontSize: 10 }}>
                  {initials(p.name)}
                </span>
                <div style={{ flex: 1, marginLeft: 8 }}>
                  <div style={{ fontWeight: 650, fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.role}</div>
                </div>
                <select value={personPlanningRole(p)} onChange={(e) => updatePerson(p.id, { planningRole: e.target.value })} title="Planning role used to match PM demand">
                  {board.staffingRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button className="icon-btn" onClick={() => editSkills(p)} title="Edit skills">
                  &#9881;
                </button>
                <button
                  className="icon-btn"
                  onClick={() => {
                    if (window.confirm('Remove ' + p.name + ' from the roster?')) removePerson(p.id)
                  }}
                  title="Remove"
                >
                  &#10005;
                </button>
              </div>
            ))}
            {!ppl.length && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>No one yet</div>}
          </div>
        )
        })}
      </div>
      <StaffingRolesAdmin />
    </div>
  )
}
