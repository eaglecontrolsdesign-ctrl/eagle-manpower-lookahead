import { useState } from 'react'
import { projectHealth } from '../../engine/health.js'

export default function ProjectHealthList({ board, projects, weeks8, onOpenProject }) {
  const [expanded, setExpanded] = useState(false)
  const health = projects.map((p) => projectHealth(board, p, weeks8)).sort((a, b) => a.score - b.score)
  const shown = health.slice(0, expanded ? 8 : 4)

  if (!health.length) return <div className="empty-block">Add projects to build the project health model.</div>

  return (
    <div>
      {shown.map((x) => (
        <div key={x.project.id} className="health-row" style={{ '--hc': x.color, '--hw': x.score + '%' }} onClick={() => onOpenProject(x.project.id)} title={'Score ' + x.score + '/100 — ' + (x.reasons.join('; ') || 'no deductions')}>
          <div className="health-project">
            <b>{x.project.name}</b>
            <span>
              {x.scheduled}h scheduled · {x.planned}/{weeks8.length} weeks planned{x.gap ? ' · ' + x.gap + 'h gap' : ''}
            </span>
          </div>
          <div className="health-score">{x.score}</div>
          <div className="health-track">
            <i />
          </div>
          <div className="health-status">{x.status}</div>
        </div>
      ))}
      {health.length > 4 && (
        <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show top 4' : health.length > 8 ? 'Show top 8' : 'Show all ' + health.length}
        </button>
      )}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
        Score = planning confidence over the next {weeks8.length} weeks.{' '}
        <b style={{ color: '#34d399' }}>90+ healthy</b> · <b style={{ color: '#fbbf24' }}>75+ watch</b> · <b style={{ color: '#fb923c' }}>60+ at risk</b> ·{' '}
        <b style={{ color: '#fb7185' }}>&lt;60 critical</b>
      </div>
    </div>
  )
}
