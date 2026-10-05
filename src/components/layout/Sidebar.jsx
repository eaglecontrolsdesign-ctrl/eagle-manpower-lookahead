import { useAuth } from '../../context/AuthContext.jsx'
import { useTheme } from '../../context/ThemeContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useBoard } from '../../context/BoardContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { getAttentionAlerts } from '../../engine/alerts.js'

const NAV_ITEMS = [
  { key: 'dashboard', icon: '◈', label: 'Dashboard' },
  { key: 'board', icon: '☷', label: 'Manpower Board' },
  { key: 'pmdemand', icon: '▦', label: 'PM Demand' },
  { key: 'admin', icon: '⚙', label: 'Administration' },
  { key: 'ops', icon: '◉', label: 'Ops Intelligence' },
]

const WORKSPACE_ITEMS = [
  { key: 'alerts', icon: '⚠', label: 'Alerts' },
  { key: 'reports', icon: '▤', label: 'Reports' },
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks)
  const alertCount = board ? getAttentionAlerts(board, weeks, board.people).length : 0

  return (
    <aside className={'sidebar' + (ui.sidebarCollapsed ? ' collapsed' : '')}>
      <div className="sidebar-brand">
        <img className="brand-mark" src="/images/eagle-logo.png" alt="" />
        <div className="sidebar-brand-title">Eagle Manpower Lookahead</div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button key={item.key} className={'nav-pill' + (ui.activeView === item.key ? ' active' : '')} onClick={() => ui.setActiveView(item.key)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}

        <div className="nav-divider" />

        {WORKSPACE_ITEMS.map((item) => (
          <button key={item.key} className={'nav-pill' + (ui.activeView === item.key ? ' active' : '')} onClick={() => ui.setActiveView(item.key)}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">
              {item.label}
              {item.key === 'alerts' && alertCount ? ' · ' + alertCount : ''}
            </span>
          </button>
        ))}

        <button className="nav-pill" onClick={toggleTheme}>
          <span className="nav-icon">{theme === 'light' ? '☀' : '◑'}</span>
          <span className="nav-label">{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </nav>

      <button className="sidebar-collapse-btn" onClick={() => ui.setSidebarCollapsed((c) => !c)}>
        {ui.sidebarCollapsed ? '›' : '‹ Collapse'}
      </button>

      <div className="sidebar-account">
        <div className="avatar" style={{ background: '#5fa3e8' }}>
          {(user?.email || '?')[0].toUpperCase()}
        </div>
        <div className="sidebar-account-name">{user?.email}</div>
        <button className="sidebar-signout" onClick={signOut} title="Sign out">
          Sign out
        </button>
      </div>
    </aside>
  )
}
