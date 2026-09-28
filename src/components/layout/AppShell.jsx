import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import Sidebar from './Sidebar.jsx'
import Dashboard from '../dashboard/Dashboard.jsx'
import BoardPage from '../board/BoardPage.jsx'
import OpsIntelligencePanel from '../ops/OpsIntelligencePanel.jsx'
import AdminDrawer from '../admin/AdminDrawer.jsx'
import ReportsDrawer from '../reports/ReportsDrawer.jsx'
import AlertsDrawer from '../alerts/AlertsDrawer.jsx'
import EmployeeDrawer from '../employee/EmployeeDrawer.jsx'
import ProjectDemandDrawer from '../demand/ProjectDemandDrawer.jsx'
import AiPlannerPanel from '../ai/AiPlannerPanel.jsx'

export default function AppShell() {
  const { board, ready } = useBoard()
  const ui = useUi()

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
        {ui.activeView === 'ops' && <OpsIntelligencePanel />}
        {ui.activeView === 'alerts' && <AlertsDrawer />}
        {ui.activeView === 'reports' && <ReportsDrawer />}
        {ui.activeView === 'admin' && <AdminDrawer />}
      </main>

      {ui.employeeId && <EmployeeDrawer personId={ui.employeeId} onClose={ui.closeEmployee} />}
      {ui.demand && <ProjectDemandDrawer projectId={ui.demand.projectId} week={ui.demand.week} onClose={ui.closeDemand} />}

      <AiPlannerPanel />
    </div>
  )
}
