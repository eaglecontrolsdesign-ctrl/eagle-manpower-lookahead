import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import Sidebar from './Sidebar.jsx'
import Dashboard from '../dashboard/Dashboard.jsx'
import BoardPage from '../board/BoardPage.jsx'
import OpsIntelligencePanel from '../ops/OpsIntelligencePanel.jsx'
import AdminDrawer from '../admin/AdminDrawer.jsx'
import ReportsDrawer from '../reports/ReportsDrawer.jsx'
import AlertsDrawer from '../alerts/AlertsDrawer.jsx'
import EmployeeDrawer from '../employee/EmployeeDrawer.jsx'
import ProjectDemandDrawer from '../demand/ProjectDemandDrawer.jsx'
import PmDemandPage from '../demand/PmDemandPage.jsx'
import AiPlannerPanel from '../ai/AiPlannerPanel.jsx'

export default function AppShell() {
  const { board, ready, missing, initializeBoard } = useBoard()
  const ui = useUi()
  const { isAdmin } = useAuth()

  if (missing) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="card" style={{ maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#9888;</div>
          <div className="card-title" style={{ color: 'var(--bad)', marginBottom: 8 }}>
            No board data found
          </div>
          <div className="card-subtitle" style={{ marginBottom: 16 }}>
            The <code>boards/main</code> document doesn't exist in Firestore. If this app has been used before, this
            almost certainly means the document was deleted — contact an administrator before doing anything else.
            Only create a brand-new empty board if this is a genuine first-time setup.
          </div>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('This creates a brand-new, empty demo board. Only do this for a genuine first-time setup — NOT to "fix" missing data. Continue?')) {
                initializeBoard()
              }
            }}
          >
            Create new empty board (first-time setup only)
          </button>
        </div>
      </div>
    )
  }

  if (!ready || !board) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>Loading board…</div>
    )
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {ui.activeView === 'dashboard' && <Dashboard />}
        {ui.activeView === 'board' && <BoardPage />}
        {ui.activeView === 'pmdemand' && <PmDemandPage />}
        {ui.activeView === 'ops' && <OpsIntelligencePanel />}
        {ui.activeView === 'alerts' && <AlertsDrawer />}
        {ui.activeView === 'reports' && <ReportsDrawer />}
        {ui.activeView === 'admin' && (isAdmin ? <AdminDrawer /> : <AdminAccessDenied />)}
      </main>

      {ui.employeeId && <EmployeeDrawer personId={ui.employeeId} onClose={ui.closeEmployee} />}
      {ui.demand && <ProjectDemandDrawer projectId={ui.demand.projectId} week={ui.demand.week} onClose={ui.closeDemand} />}

      <AiPlannerPanel />
    </div>
  )
}

function AdminAccessDenied() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Administration</div>
          <div className="page-subtitle">Admins only</div>
        </div>
      </div>
      <div className="card">
        <div className="card-title" style={{ color: 'var(--bad)' }}>
          You don't have access to this page
        </div>
        <div className="card-subtitle">Ask an administrator to grant your account the admin role if you need access.</div>
      </div>
    </div>
  )
}
