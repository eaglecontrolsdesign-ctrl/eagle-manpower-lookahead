import { useMemo, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { weekOpsStats } from '../../engine/utilization.js'
import { projectWeekCoverage } from '../../engine/demand.js'
import { applySurge, applyAbsence, applyShiftEarlier, summarizeScenario } from '../../engine/scenarioLab.js'

export default function ScenarioLab() {
  const { board } = useBoard()
  const ui = useUi()
  const weeks = useWeeks(12)
  const baseStats = useMemo(() => weeks.map((w) => weekOpsStats(board, w, ui.officeFilter)), [board, weeks, ui.officeFilter])

  const [type, setType] = useState('surge')
  const people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
  const projects = board.projects.filter((p) => !ui.officeFilter || !p.office || p.office === ui.officeFilter)
  const [targetId, setTargetId] = useState(projects[0]?.id || '')
  const [value, setValue] = useState(2)
  const [duration, setDuration] = useState(4)
  const [start, setStart] = useState(0)

  const targets = type === 'absence' ? people : projects

  let sim
  let label = ''
  let detail = ''
  if (type === 'surge') {
    const p = projects.find((x) => x.id === targetId)
    label = (p ? p.name : 'Project') + ' demand surge'
    detail = 'Adds ' + value + ' people (' + value * 40 + 'h/week) of demand for ' + duration + ' week(s).'
    sim = applySurge(baseStats, { value: +value, duration: +duration, start: +start })
  } else if (type === 'absence') {
    const p = people.find((x) => x.id === targetId)
    label = (p ? p.name : 'Person') + ' unavailable'
    detail = 'Removes ' + value + ' FTE (' + value * 40 + 'h/week) of capacity for ' + duration + ' week(s).'
    sim = applyAbsence(baseStats, { value: +value, duration: +duration, start: +start })
  } else {
    const p = projects.find((x) => x.id === targetId)
    const shift = Math.min(6, Math.round(+value))
    label = (p ? p.name : 'Project') + ' starts ' + shift + ' week(s) earlier'
    detail = 'Moves the project PM demand curve ' + shift + ' week(s) earlier without touching the live schedule.'
    const sourceDemandByWeek = weeks.map((w) => {
      if (!p) return 0
      const c = projectWeekCoverage(board, p.id, w.key)
      return c.hasPlan ? c.demand : 0
    })
    sim = applyShiftEarlier(baseStats, sourceDemandByWeek, shift)
  }

  const summary = summarizeScenario(baseStats.map((s) => ({ ...s, pressure: s.pressure })), sim, { label, detail })
  const color = summary.newPeak > 100 ? '#fb7185' : summary.newPeak >= 90 ? '#fbbf24' : '#34d399'

  return (
    <div>
      <div className="scenario-controls">
        <select
          className="pill-select"
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setTargetId((e.target.value === 'absence' ? people[0]?.id : projects[0]?.id) || '')
            setValue(e.target.value === 'shift' ? 2 : e.target.value === 'absence' ? 1 : 2)
          }}
        >
          <option value="surge">Demand surge</option>
          <option value="absence">Person unavailable</option>
          <option value="shift">Shift project earlier</option>
        </select>
        <select className="pill-select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input className="pill-input" type="number" min={1} max={type === 'absence' ? 5 : 12} value={value} onChange={(e) => setValue(e.target.value)} title={type === 'surge' ? 'Additional people' : type === 'absence' ? 'FTE capacity removed' : 'Weeks earlier'} />
        <input className="pill-input" type="number" min={1} max={12} value={duration} onChange={(e) => setDuration(e.target.value)} title="Duration (weeks)" disabled={type === 'shift'} />
        <select className="pill-select" value={start} onChange={(e) => setStart(e.target.value)} disabled={type === 'shift'}>
          {weeks.map((w, i) => (
            <option key={w.key} value={i}>
              W{i + 1} · {w.label}
            </option>
          ))}
        </select>
      </div>

      <div className="scenario-metrics">
        <div className="scenario-metric" style={{ '--sm': color }}>
          <span>Peak pressure</span>
          <b>{summary.newPeak}%</b>
          <small>{summary.delta >= 0 ? '+' : ''}{summary.delta} pts vs baseline</small>
        </div>
        <div className="scenario-metric" style={{ '--sm': '#fb7185' }}>
          <span>Peak shortage</span>
          <b>{summary.newShort}h</b>
          <small>baseline {summary.baseShort}h</small>
        </div>
        <div className="scenario-metric" style={{ '--sm': '#fbbf24' }}>
          <span>Weeks &gt;100%</span>
          <b>{summary.weeksOver}</b>
          <small>of next 12 weeks</small>
        </div>
        <div className="scenario-metric" style={{ '--sm': '#a3e635' }}>
          <span>FTE equivalent</span>
          <b>{summary.fte ? '+' + summary.fte : '0'}</b>
          <small>at peak shortage</small>
        </div>
        <div className="scenario-metric" style={{ '--sm': '#67e8f9' }}>
          <span>First risk week</span>
          <b>{summary.firstRiskIndex >= 0 ? 'W' + (summary.firstRiskIndex + 1) : '—'}</b>
          <small>{summary.firstRiskIndex >= 0 ? weeks[summary.firstRiskIndex].label : 'no capacity breach'}</small>
        </div>
      </div>

      <div className="scenario-insight">
        <b>{label}:</b> {detail}{' '}
        {summary.newPeak > 100
          ? 'The model indicates a capacity breach. Consider pulling work forward/back, cross-office support, subcontract capacity, or adding ' + summary.fte + ' equivalent FTE at peak.'
          : summary.newPeak >= 90
            ? 'The plan remains feasible but enters a tight-capacity zone. Protect startup/Cx coverage and avoid adding unplanned work.'
            : 'The modeled plan remains inside available capacity.'}
      </div>
    </div>
  )
}
