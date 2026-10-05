import { useState } from 'react'
import RosterAdmin from './RosterAdmin.jsx'
import ProjectsAdmin from './ProjectsAdmin.jsx'
import OverheadAdmin from './OverheadAdmin.jsx'

const TABS = [
  { key: 'roster', label: 'Roster', Component: RosterAdmin },
  { key: 'projects', label: 'Projects', Component: ProjectsAdmin },
  { key: 'overhead', label: 'Overhead', Component: OverheadAdmin },
]

export default function AdminDrawer() {
  const [tab, setTab] = useState('roster')
  const Active = TABS.find((t) => t.key === tab).Component

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Administration</div>
          <div className="page-subtitle">Roster, projects, overhead, and staffing roles</div>
        </div>
      </div>
      <div className="pill-tabs" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} className={'pill-tab' + (tab === t.key ? ' on' : '')} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card">
        <Active />
      </div>
    </div>
  )
}
