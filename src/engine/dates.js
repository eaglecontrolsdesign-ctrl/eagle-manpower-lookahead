export function mondayOf(date) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (x.getDay() + 6) % 7 // Mon=0 .. Sun=6
  x.setDate(x.getDate() - day)
  return x
}

export function weekKey(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function dateOf(wkKey, dayIndex) {
  return new Date(+wkKey.slice(0, 4), +wkKey.slice(5, 7) - 1, +wkKey.slice(8, 10) + dayIndex)
}

export function buildWeeks(anchorDate, count, offset = 0) {
  const base = mondayOf(anchorDate)
  base.setDate(base.getDate() + offset * 7)
  const out = []
  for (let i = 0; i < count; i++) {
    const mon = new Date(base)
    mon.setDate(base.getDate() + i * 7)
    const fri = new Date(mon)
    fri.setDate(mon.getDate() + 4)
    out.push({
      key: weekKey(mon),
      mon,
      fri,
      label:
        mon.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' – ' +
        fri.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      isCurrent: weekKey(mon) === weekKey(mondayOf(new Date())),
    })
  }
  return out
}

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
