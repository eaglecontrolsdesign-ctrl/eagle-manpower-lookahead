import { useAuth, userDocId } from '../../context/AuthContext.jsx'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { OFFICES, HORIZON_OPTIONS } from '../../engine/constants.js'
import { projectDemandData, demandRecord, demandHours } from '../../engine/demand.js'
import { trackerDemand } from '../../engine/trackerNotes.js'
import KpiCard from '../dashboard/KpiCard.jsx'
import ProjectsBoard from '../board/ProjectsBoard.jsx'

export default function PmDemandPage() {
  const { board } = useBoard()
  const { user, isPm, isAdmin } = useAuth()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks)
  // A project manager sees only the projects assigned to them (Administration > Projects);
  // admins and members see every project.
  const me = userDocId(user && user.email)
  const mine = isPm && !isAdmin ? (p) => userDocId(p.pmEmail) === me : null
  const pd = projectDemandData(board, weeks, ui.officeFilter).filter((x) => !mine || mine(x.p))

  const unplanned = pd.filter((x) => !x.plannedWeeks).length
  const draft = pd.filter((x) => x.draftWeeks > 0).length
  const short = pd.filter((x) => x.gap > 0).length
  const covered = pd.filter((x) => x.plannedWeeks && x.gap === 0).length
  const totalDemand = pd.reduce((s, x) => s + x.demand, 0)
  const totalGap = pd.reduce((s, x) => s + (x.gap || 0), 0)
  // What the Project Command Center's schedules asked for: its drafts, plus weeks a PM took over from them.
  let pccHours = 0
  let pccWeeks = 0
  pd.forEach((x) =>
    weeks.forEach((w) => {
      const rec = demandRecord(board, x.p.id, w.key)
      if (trackerDemand(rec)) {
        pccHours += demandHours(rec)
        pccWeeks++
      }
    })
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">PM Demand</div>
          <div className="page-subtitle">
            Role-based staffing plans by project and week · {ui.officeFilter || 'All offices'} · {weeks.length}-week horizon
            {isPm && !isAdmin && ' · Showing your projects'}
          </div>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="pill-tabs">
          <button className={'pill-tab' + (!ui.officeFilter ? ' on' : '')} onClick={() => ui.setOfficeFilter('')}>
            All offices
          </button>
          {OFFICES.map((o) => (
            <button key={o} className={'pill-tab' + (ui.officeFilter === o ? ' on' : '')} onClick={() => ui.setOfficeFilter(o)}>
              {o}
            </button>
          ))}
        </div>
        <div className="pill-tabs">
          {HORIZON_OPTIONS.map((n) => (
            <button key={n} className={'pill-tab' + (ui.horizonWeeks === n ? ' on' : '')} onClick={() => ui.setHorizonWeeks(n)}>
              {n}w
            </button>
          ))}
        </div>
      </div>

      <div className="stat-row">
        <KpiCard label="Needs a plan" value={unplanned} sub="no PM demand entered" />
        <KpiCard label="Draft plans" value={draft} sub="not yet confirmed" />
        <KpiCard label="Short of demand" value={short} sub="gap in one or more weeks" />
        <KpiCard label="Fully covered" value={covered} />
        <KpiCard label="Total PM demand" value={totalDemand + 'h'} />
        <KpiCard label="Unstaffed demand" value={totalGap + 'h'} />
        <KpiCard label="From the PCC" value={pccHours + 'h'} sub={pccWeeks + ' project-weeks from the tracker’s schedules'} />
      </div>

      <div className="panel-title" style={{ marginBottom: 8 }}>
        Click a week cell to build or edit that project's plan
      </div>
      <ProjectsBoard
        weeks={weeks}
        projectFilter={mine}
        emptyMessage={isPm && !isAdmin ? 'No projects are assigned to you yet. Ask an administrator to set you as the project manager under Administration › Projects.' : undefined}
      />
    </div>
  )
}
