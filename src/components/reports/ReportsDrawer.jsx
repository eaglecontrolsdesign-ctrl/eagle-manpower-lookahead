import { useRef, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useUi } from '../../context/UiContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useWeeks } from '../../hooks/useWeeks.js'
import { buildFullCsv } from '../../engine/exportCsv.js'
import { buildCrewMessage } from '../../engine/crewMessage.js'
import { serializeBoard, parseBackup } from '../../engine/backup.js'
import { OFFICES } from '../../engine/constants.js'
import WeeklyDemandTable from './WeeklyDemandTable.jsx'
import UtilizationByOffice from './UtilizationByOffice.jsx'

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ReportsDrawer() {
  const { board, applyPatch } = useBoard()
  const ui = useUi()
  const toast = useToast()
  const weeks = useWeeks(ui.horizonWeeks)
  const [tab, setTab] = useState('demand')
  const fileRef = useRef(null)

  function exportCsv() {
    const people = ui.officeFilter ? board.people.filter((p) => (p.office || 'Charlotte') === ui.officeFilter) : board.people
    download('eagle_manpower_' + weeks[0].key + '.csv', '﻿' + buildFullCsv(board, weeks, people), 'text/csv;charset=utf-8')
    toast('CSV exported')
  }

  function exportBackup() {
    download('eagle_manpower_backup_' + weeks[0].key + '.json', serializeBoard(board), 'application/json')
    toast('Backup exported')
  }

  function restoreBackup(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseBackup(reader.result)
      if (!result.ok) {
        toast(result.error, 'error')
        return
      }
      if (!window.confirm('Restore this backup? It will replace all current roster, schedule, and demand data.')) return
      applyPatch(result.board)
      toast('Backup restored')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function copyCrewMessage(office) {
    const { html, text } = buildCrewMessage(board, weeks[0], office)
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })])
      } else {
        await navigator.clipboard.writeText(text)
      }
      toast('Crew message copied — paste into Teams or Outlook')
    } catch {
      toast('Could not copy to clipboard', 'error')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Reports</div>
          <div className="page-subtitle">Exports, backups, and crew messaging</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
          <button className="btn" onClick={() => window.print()}>
            Print / PDF
          </button>
          <button className="btn" onClick={exportBackup}>
            Backup (JSON)
          </button>
          <button className="btn" onClick={() => fileRef.current.click()}>
            Restore backup
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={restoreBackup} />
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="panel-title">Crew message · week of {weeks[0].label}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => copyCrewMessage('')}>
            All offices
          </button>
          {OFFICES.map((o) => (
            <button key={o} className="btn" onClick={() => copyCrewMessage(o)}>
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="pill-tabs" style={{ marginBottom: 14 }}>
          <button className={'pill-tab' + (tab === 'demand' ? ' on' : '')} onClick={() => setTab('demand')}>
            Weekly demand
          </button>
          <button className={'pill-tab' + (tab === 'util' ? ' on' : '')} onClick={() => setTab('util')}>
            Utilization
          </button>
        </div>
        {tab === 'demand' ? <WeeklyDemandTable board={board} weeks={weeks} /> : <UtilizationByOffice board={board} weeks={weeks} />}
      </div>
    </div>
  )
}
