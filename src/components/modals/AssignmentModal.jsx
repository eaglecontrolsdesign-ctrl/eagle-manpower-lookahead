import { useEffect, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { dateOf } from '../../engine/dates.js'
import { projColor } from '../../engine/colors.js'
import { daySegments, withJobHours, withoutJob, hoursLabel, overtimeHours, FULL_DAY } from '../../engine/segments.js'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const ALL_DAYS = [0, 1, 2, 3, 4]
const HOUR_PRESETS = [
  { label: 'Full day', hours: FULL_DAY },
  { label: 'Half day', hours: 4 },
  { label: '2h', hours: 2 },
]

function labelDays(indexes) {
  const sorted = [...indexes].sort((a, b) => a - b)
  if (sorted.length === 1) return DAY_LABELS[sorted[0]]
  const contiguous = sorted.every((v, i) => i === 0 || v === sorted[i - 1] + 1)
  return contiguous ? DAY_LABELS[sorted[0]] + '–' + DAY_LABELS[sorted[sorted.length - 1]] : sorted.map((i) => DAY_LABELS[i]).join(', ')
}

// Assign work to one or more days. A day may hold several jobs for any number of hours
// (engine/segments.js): "Full day" replaces whatever is on the day; any smaller number of hours
// is added alongside what is already there (or replaces that job's hours if it is already on
// the day). Overtime is allowed — the total is shown with the overtime called out.
export default function AssignmentModal({ personId, wkKey, dayIndexes, onClose }) {
  const { board, setDay, setDaySegments } = useBoard()
  const person = board.people.find((p) => p.id === personId)
  // Which day(s) this edit applies to — defaults to whatever cell was clicked (one day, or a
  // whole run), but the day pills always offer the full week.
  const [selected, setSelected] = useState(dayIndexes)
  const [hours, setHours] = useState(FULL_DAY)
  const [customHours, setCustomHours] = useState('')
  const isMulti = selected.length > 1
  const date = dateOf(wkKey, selected[0])
  // What the first selected day holds now — the editable list below.
  const current = daySegments(board, personId, wkKey, selected[0])
  const total = current.reduce((s, x) => s + x.hours, 0)
  const overtime = overtimeHours(current)
  const anySelectedAssigned = selected.some((di) => daySegments(board, personId, wkKey, di).length > 0)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function nameOf(id) {
    const p = board.projects.find((x) => x.id === id) || board.overhead.find((x) => x.id === id)
    return p ? p.name : id
  }
  function colorOf(id) {
    const idx = board.projects.findIndex((x) => x.id === id)
    if (idx >= 0) return projColor(board.projects[idx], idx)
    const o = board.overhead.find((x) => x.id === id)
    return (o && o.color) || '#94a3b8'
  }

  function toggleDay(di) {
    setSelected((prev) => {
      if (prev.includes(di)) {
        if (prev.length === 1) return prev
        return prev.filter((d) => d !== di)
      }
      return [...prev, di].sort((a, b) => a - b)
    })
  }

  function pickHours(h) {
    setHours(h)
    setCustomHours('')
  }
  function pickCustom(text) {
    const clean = text.replace(/[^\d.]/g, '')
    setCustomHours(clean)
    const n = parseFloat(clean)
    if (n > 0) setHours(n)
  }

  // The Full day preset makes the day this job. Any typed number of hours (even 8 or more) joins
  // the day alongside what is there, or updates this job's hours if it is already on the day.
  const replacesDay = !customHours && hours === FULL_DAY
  function choose(id) {
    if (replacesDay) selected.forEach((di) => setDay(personId, wkKey, di, id))
    else selected.forEach((di) => setDaySegments(personId, wkKey, di, withJobHours(daySegments(board, personId, wkKey, di), id, hours)))
    onClose()
  }

  function clearAll() {
    selected.forEach((di) => setDay(personId, wkKey, di, null))
    onClose()
  }

  function updateHours(id, text) {
    const n = parseFloat(String(text).replace(/[^\d.]/g, ''))
    if (!(n > 0)) return
    selected.forEach((di) => setDaySegments(personId, wkKey, di, withJobHours(daySegments(board, personId, wkKey, di), id, n)))
  }

  function removeJob(id) {
    selected.forEach((di) => setDaySegments(personId, wkKey, di, withoutJob(daySegments(board, personId, wkKey, di), id)))
  }

  if (!person) return null

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="card-title">{person.name}</div>
            <div className="card-subtitle">
              {isMulti ? labelDays(selected) + ' · week of ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            &#10005;
          </button>
        </div>

        <div className="panel-title">Apply to</div>
        <div className="pill-tabs" style={{ marginBottom: 12 }}>
          {ALL_DAYS.map((di) => (
            <button key={di} className={'pill-tab' + (selected.includes(di) ? ' on' : '')} onClick={() => toggleDay(di)}>
              {DAY_LABELS[di]}
            </button>
          ))}
        </div>

        {current.length > 0 && (
          <>
            <div className="panel-title">
              On this day{isMulti ? ' (' + DAY_LABELS[selected[0]] + ')' : ''} · {hoursLabel(total)}
              {overtime > 0 && <span className="ot-badge">{hoursLabel(overtime)} overtime</span>}
            </div>
            <div className="segment-list">
              {current.map((seg) => (
                <div key={seg.id} className="segment-row">
                  <span className="segment-dot" style={{ background: colorOf(seg.id) }} />
                  <span className="segment-name">{nameOf(seg.id)}</span>
                  <input
                    className="segment-hours"
                    inputMode="decimal"
                    defaultValue={seg.hours}
                    key={seg.id + ':' + seg.hours}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    onBlur={(e) => updateHours(seg.id, e.target.value)}
                    title="Hours on this job (Enter or click away to apply)"
                  />
                  <span className="segment-unit">h</span>
                  <button className="icon-btn" onClick={() => removeJob(seg.id)} title={'Take ' + nameOf(seg.id) + ' off this day'}>
                    &#10005;
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="panel-title">Hours</div>
        <div className="pill-tabs" style={{ marginBottom: 6, alignItems: 'center' }}>
          {HOUR_PRESETS.map((p) => (
            <button key={p.hours} className={'pill-tab' + (hours === p.hours && !customHours ? ' on' : '')} onClick={() => pickHours(p.hours)}>
              {p.label}
            </button>
          ))}
          <input
            className={'pill-input' + (customHours ? ' on' : '')}
            inputMode="decimal"
            placeholder="Other…"
            value={customHours}
            onChange={(e) => pickCustom(e.target.value)}
            title="Any number of hours, e.g. 2.5 or 10"
          />
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 12 }}>
          {replacesDay
            ? 'Full day replaces whatever is on the day.'
            : hoursLabel(hours) + ' is added alongside what is already on the day' + (current.length ? ' (' + hoursLabel(total) + ' so far)' : '') + '.'}
        </div>

        <div className="panel-title">Jobs</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {board.projects.map((p, i) => (
            <button
              key={p.id}
              className="btn"
              style={{ background: projColor(p, i), color: '#071018', borderColor: 'transparent', opacity: current.some((s) => s.id === p.id) ? 1 : 0.85 }}
              onClick={() => choose(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="panel-title">Overhead</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {board.overhead
            .filter((o) => o.id !== '__HOL')
            .map((o) => (
              <button key={o.id} className="btn" style={{ background: o.color, color: '#071018', borderColor: 'transparent' }} onClick={() => choose(o.id)}>
                {o.name}
              </button>
            ))}
        </div>

        <div className="modal-actions">
          {anySelectedAssigned && (
            <button className="btn danger" onClick={clearAll}>
              {isMulti ? 'Clear ' + labelDays(selected) : 'Clear day'}
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
