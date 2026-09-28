import { useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { runAIPlanner, applyProposal, undoLastProposal } from '../../engine/aiPlanner.js'
import { OFFICES } from '../../engine/constants.js'

const SUGGESTIONS = ['Who is overloaded this week?', 'Find capacity for our biggest demand gap', 'Balance workload across the team']

export default function AiPlannerPanel() {
  const { board, applyPatch } = useBoard()
  const ui = useUi()
  const toast = useToast()
  const weeks = useWeeks(ui.horizonWeeks)
  const [office, setOffice] = useState('')
  const [weekKey, setWeekKey] = useState(weeks[0].key)
  const [projectId, setProjectId] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)

  const lastHistory = board.aiHistory[board.aiHistory.length - 1]

  function run(q) {
    if (q !== undefined) setQuery(q)
    const r = runAIPlanner(board, weeks, { office, weekKey, projectId, query: q !== undefined ? q : query })
    setResult(r)
  }

  function approve() {
    if (!result?.ok) return
    const src = board.people.find((p) => p.id === result.proposal.sourceId)
    const dst = board.people.find((p) => p.id === result.proposal.targetId)
    if (!window.confirm('Approve this move from ' + src.name + ' to ' + dst.name + '?')) return
    const applied = applyProposal(board, result.proposal)
    if (!applied.ok) {
      toast('That schedule changed since this proposal was generated. Generate a fresh plan.', 'error')
      setResult(null)
      return
    }
    applyPatch(applied.patch)
    toast('AI proposal approved')
    setResult({ applied: true })
  }

  function undo() {
    const r = undoLastProposal(board)
    if (!r.ok) {
      toast('No AI move to undo')
      return
    }
    applyPatch(r.patch)
    toast('Last AI-assisted move undone')
  }

  if (!ui.aiPanelOpen) {
    return (
      <button className="ai-fab" onClick={() => ui.setAiPanelOpen(true)} title="AI Planner">
        &#129302;
      </button>
    )
  }

  return (
    <div className="ai-panel">
      <div className="modal-head">
        <div className="card-title">AI Planner</div>
        <button className="icon-btn" onClick={() => ui.setAiPanelOpen(false)}>
          &#10005;
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        <select value={office} onChange={(e) => setOffice(e.target.value)}>
          <option value="">All offices</option>
          {OFFICES.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select value={weekKey} onChange={(e) => setWeekKey(e.target.value)}>
          {weeks.map((w, i) => (
            <option key={w.key} value={w.key}>
              Week {i + 1} · {w.label}
            </option>
          ))}
        </select>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Auto-detect priority</option>
          {board.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input placeholder="Ask the planner…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} className="btn ghost" style={{ fontSize: 11 }} onClick={() => run(s)}>
              {s}
            </button>
          ))}
        </div>
        <button className="btn primary" onClick={() => run()}>
          Generate proposal
        </button>
      </div>

      {lastHistory && (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
          Last approved: {lastHistory.label} <button className="btn ghost" style={{ fontSize: 10, padding: '2px 6px' }} onClick={undo}>Undo</button>
        </div>
      )}

      {result?.applied && (
        <div className="ai-rec-head">
          <div>
            <h3 style={{ fontSize: 13 }}>Change approved</h3>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>The schedule was updated and can be undone above.</p>
          </div>
          <span className="ai-risk" style={{ '--risk': '#34d399' }}>Applied</span>
        </div>
      )}

      {result && !result.applied && !result.ok && (
        <div className="ai-rec-head">
          <div>
            <h3 style={{ fontSize: 13 }}>Capacity review</h3>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>No safe one-day reassignment was found for this scope.</p>
          </div>
        </div>
      )}
      {result && !result.applied && !result.ok && (
        <div className="ai-reason">
          Most available: {result.avail.map((x) => x.p.name + ' (' + Math.max(0, 100 - x.u) + '% open)').join(', ')}. Try All offices or another week.
        </div>
      )}

      {result && !result.applied && result.ok && (
        <div>
          <div className="ai-rec-head">
            <div>
              <h3 style={{ fontSize: 13 }}>Move 8 hours of {result.project ? result.project.name : 'scheduled work'}</h3>
              <p style={{ fontSize: 11, color: 'var(--muted)' }}>
                {result.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {result.source.p.office || 'Charlotte'}
              </p>
            </div>
            <span className="ai-risk" style={{ '--risk': result.risk === 'High risk' ? '#fb7185' : result.risk === 'Tight capacity' ? '#fbbf24' : '#34d399' }}>
              {result.risk}
            </span>
          </div>
          <div className="ai-impact">
            <div className="ai-person-impact" style={{ '--impact': '#fb7185' }}>
              <b>{result.source.p.name}</b>
              <span>Current → proposed</span>
              <strong>
                {result.source.u}% → {result.sourceAfter}%
              </strong>
            </div>
            <div>&rarr;</div>
            <div className="ai-person-impact" style={{ '--impact': '#a3e635' }}>
              <b>{result.target.p.name}</b>
              <span>Current → proposed</span>
              <strong>
                {result.target.u}% → {result.targetAfter}%
              </strong>
            </div>
          </div>
          <div className="ai-reason">
            <b>Why this move:</b> {result.target.p.name} has the strongest available capacity in {office || 'the selected offices'} and is open on the proposed day.
          </div>
          <div className="ai-actions">
            <button className="btn approve" onClick={approve}>
              Approve change
            </button>
            <button className="btn" onClick={() => setResult(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
