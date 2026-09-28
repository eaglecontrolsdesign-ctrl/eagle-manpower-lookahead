import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { PALETTE } from '../../engine/constants.js'

// Styled to match the Manpower Board's Job Tray (.tray-column / .tray-job) for a consistent look.
export default function StaffingRolesAdmin() {
  const { board, addStaffingRole, removeStaffingRole } = useBoard()
  const toast = useToast()
  const [name, setName] = useState('')

  function handleAdd(e) {
    e.preventDefault()
    const role = name.trim()
    if (!role) return
    if (!addStaffingRole(role)) {
      toast('That staffing role already exists')
      return
    }
    toast(role + ' added to the role library')
    setName('')
  }

  return (
    <div className="tray-column">
      <form className="tray-head" onSubmit={handleAdd}>
        <input className="pill-input" style={{ flex: 1 }} placeholder="Add a role…" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="icon-btn" type="submit" title="Add role">
          +
        </button>
      </form>
      <div className="tray-group-title">
        <span>Staffing roles</span>
        <span>{board.staffingRoles.length}</span>
      </div>
      {board.staffingRoles.map((r, i) => (
        <div key={r} className="tray-job" style={{ '--tray-color': PALETTE[i % PALETTE.length], cursor: 'default' }}>
          <span className="tray-dot" />
          <b>{r}</b>
          <button
            className="icon-btn"
            style={{ width: 22, height: 22, background: 'transparent', border: 'none' }}
            onClick={() => {
              if (window.confirm('Remove the "' + r + '" role from the library?')) removeStaffingRole(r)
            }}
            title="Remove role"
          >
            &#10005;
          </button>
        </div>
      ))}
      {!board.staffingRoles.length && <div className="empty-block">No staffing roles yet.</div>}
    </div>
  )
}
