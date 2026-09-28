export default function DemandRoleRow({ row, roles, onChange, onRemove }) {
  return (
    <div className="demand-role-row">
      <select value={row.role} onChange={(e) => onChange({ ...row, role: e.target.value })}>
        {roles.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <input type="number" min={1} max={99} value={row.heads} onChange={(e) => onChange({ ...row, heads: Math.max(1, parseInt(e.target.value) || 1) })} title="People needed" />
      <input type="number" min={1} max={80} value={row.hours} onChange={(e) => onChange({ ...row, hours: Math.max(1, parseInt(e.target.value) || 40) })} title="Hours per person" />
      <button className="role-remove" onClick={onRemove} title="Remove role requirement">
        &#10005;
      </button>
    </div>
  )
}
