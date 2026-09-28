export default function CoverageMeter({ coverage }) {
  return (
    <div className="demand-metrics">
      <div className="demand-metric" style={{ '--metric': '#38bdf8' }}>
        <span>PM demand</span>
        <b>{coverage.demand}h</b>
      </div>
      <div className="demand-metric" style={{ '--metric': '#a78bfa' }}>
        <span>Scheduled</span>
        <b>{coverage.assigned}h</b>
      </div>
      <div className="demand-metric" style={{ '--metric': coverage.gap ? '#fb7185' : '#34d399' }}>
        <span>Coverage</span>
        <b>{coverage.hasPlan ? coverage.coverage + '%' : '—'}</b>
      </div>
      <div className="demand-metric" style={{ '--metric': coverage.gap ? '#fb7185' : '#34d399' }}>
        <span>Remaining gap</span>
        <b>{coverage.hasPlan ? coverage.gap + 'h' : '—'}</b>
      </div>
    </div>
  )
}
