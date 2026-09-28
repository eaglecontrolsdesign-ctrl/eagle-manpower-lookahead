export default function UtilizationGauge({ util }) {
  const color = util > 100 ? '#fb7185' : util >= 85 ? '#fbbf24' : util >= 50 ? '#34d399' : '#38bdf8'
  return (
    <div className="gauge" style={{ '--pct': Math.min(util, 100), '--gauge': color }}>
      <span>{util}%</span>
    </div>
  )
}
