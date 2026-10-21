// People / hours are kept exactly as typed while the field is being edited (so it can be
// cleared and retyped freely) and only tidied up to a whole number on blur — and again when
// the plan is saved (ProjectDemandDrawer normalizeRows), so a half-finished edit never lands.
export function clampInt(value, fallback, min, max) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

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
      <input
        type="text"
        inputMode="numeric"
        value={row.heads ?? ''}
        onChange={(e) => onChange({ ...row, heads: e.target.value.replace(/[^\d]/g, '') })}
        onBlur={(e) => onChange({ ...row, heads: clampInt(e.target.value, 1, 1, 99) })}
        onFocus={(e) => e.target.select()}
        title="People needed"
      />
      <input
        type="text"
        inputMode="numeric"
        value={row.hours ?? ''}
        onChange={(e) => onChange({ ...row, hours: e.target.value.replace(/[^\d]/g, '') })}
        onBlur={(e) => onChange({ ...row, hours: clampInt(e.target.value, 40, 1, 80) })}
        onFocus={(e) => e.target.select()}
        title="Hours per person"
      />
      <button className="role-remove" onClick={onRemove} title="Remove role requirement">
        &#10005;
      </button>
    </div>
  )
}
