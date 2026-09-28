export default function KpiCard({ label, value, sub, onClick, active }) {
  return (
    <div className={'stat-tile' + (active ? ' active' : '')} onClick={onClick} role={onClick ? 'button' : undefined}>
      <span className="lbl">{label}</span>
      <span className="num">{value}</span>
      {sub && <span className="sub">{sub}</span>}
    </div>
  )
}
