export default function NeedsAttentionList({ alerts, onOpenAlert, onOpenAll }) {
  const shown = alerts.slice(0, 3)
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-row" style={{ marginBottom: 8 }}>
        <div className="panel-title" style={{ marginBottom: 0 }}>
          Needs attention
        </div>
        {alerts.length > 0 && (
          <button className="btn ghost" onClick={onOpenAll}>
            View all ({alerts.length})
          </button>
        )}
      </div>
      {shown.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No critical staffing conflicts detected.</div>}
      {shown.map((a, i) => (
        <div
          key={i}
          className="alert-center-row"
          style={{ '--ac': a.c }}
          onClick={() => onOpenAlert?.(a)}
        >
          <div className="alert-center-copy">
            <b>{a.title}</b>
          </div>
        </div>
      ))}
    </div>
  )
}
