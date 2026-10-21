import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { dayVal } from '../../engine/schedule.js'
import { personUtil } from '../../engine/utilization.js'
import { BoardDndProvider } from './DndContext.jsx'
import BoardHeader from './BoardHeader.jsx'
import PeopleBoard from './PeopleBoard.jsx'
import ProjectsBoard from './ProjectsBoard.jsx'
import HeatmapBoard from './HeatmapBoard.jsx'
import JobTray from './JobTray.jsx'
import DragTrash from './DragTrash.jsx'

export default function BoardPage() {
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(ui.horizonWeeks, ui.horizonWeeks === 1 ? ui.weekOffset : 0)

  function personOnJob(personId) {
    if (!ui.jobFilter) return true
    return weeks.some((w) => [0, 1, 2, 3, 4].some((i) => dayVal(board.days, board.holidays, personId, w.key, i) === ui.jobFilter))
  }

  let people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
  if (ui.jobFilter) people = people.filter((p) => personOnJob(p.id))
  if (ui.utilizationFilter === 'over') people = people.filter((p) => personUtil(board, p, weeks) >= 100)
  if (ui.utilizationFilter === 'under' || ui.utilizationFilter === 'available') {
    const cap = ui.utilizationFilter === 'available' ? 70 : 50
    people = people.filter((p) => personUtil(board, p, weeks) < cap)
  }

  return (
    <BoardDndProvider>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="page-title">Manpower Board</div>
            <div className="page-subtitle">{weeks[0]?.label} – {weeks[weeks.length - 1]?.label}</div>
          </div>
        </div>
        <BoardHeader />
        {ui.boardView === 'people' && <PeopleBoard people={people} weeks={weeks} />}
        {ui.boardView === 'projects' && <ProjectsBoard weeks={weeks} />}
        {ui.boardView === 'heatmap' && <HeatmapBoard people={people} weeks={weeks} />}
        {ui.jobTrayOpen && <JobTray weekKey={weeks[0].key} />}
        <DragTrash />
      </div>
    </BoardDndProvider>
  )
}
