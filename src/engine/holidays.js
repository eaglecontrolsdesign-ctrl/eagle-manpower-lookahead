function nthWeekday(y, mo, wd, n) {
  const d = new Date(y, mo, 1)
  let c = 0
  while (true) {
    if (d.getDay() === wd) {
      c++
      if (c === n) return new Date(d)
    }
    d.setDate(d.getDate() + 1)
  }
}

function lastWeekday(y, mo, wd) {
  const d = new Date(y, mo + 1, 0)
  while (d.getDay() !== wd) d.setDate(d.getDate() - 1)
  return d
}

// [aliases, ruleFn(year), label]
export const HOLIDAYS = [
  [['newyear', 'newyears', 'newyearsday'], (y) => new Date(y, 0, 1), "New Year's Day"],
  [['mlk', 'mlkday', 'martinlutherking', 'martinlutherkingday', 'martinlutherkingjrday'], (y) => nthWeekday(y, 0, 1, 3), 'MLK Day'],
  [['presidentsday', 'presidents', 'washingtonsbirthday'], (y) => nthWeekday(y, 1, 1, 3), 'Presidents Day'],
  [['memorialday', 'memorial'], (y) => lastWeekday(y, 4, 1), 'Memorial Day'],
  [['juneteenth'], (y) => new Date(y, 5, 19), 'Juneteenth'],
  [['4thofjuly', 'fourthofjuly', 'independenceday', 'july4', 'july4th'], (y) => new Date(y, 6, 4), 'Independence Day'],
  [['laborday', 'labor'], (y) => nthWeekday(y, 8, 1, 1), 'Labor Day'],
  [['columbusday', 'indigenouspeoplesday'], (y) => nthWeekday(y, 9, 1, 2), 'Columbus Day'],
  [['veteransday', 'veterans'], (y) => new Date(y, 10, 11), 'Veterans Day'],
  [['thanksgiving', 'turkeyday'], (y) => nthWeekday(y, 10, 4, 4), 'Thanksgiving'],
  [
    ['dayafterthanksgiving', 'blackfriday'],
    (y) => {
      const t = nthWeekday(y, 10, 4, 4)
      t.setDate(t.getDate() + 1)
      return t
    },
    'Day after Thanksgiving',
  ],
  [['christmaseve', 'xmaseve'], (y) => new Date(y, 11, 24), 'Christmas Eve'],
  [['christmas', 'christmasday', 'xmas'], (y) => new Date(y, 11, 25), 'Christmas'],
  [['newyearseve', 'nye'], (y) => new Date(y, 11, 31), "New Year's Eve"],
]

export function observed(date) {
  const x = new Date(date)
  if (x.getDay() === 6) x.setDate(x.getDate() - 1) // Saturday -> observed Friday
  else if (x.getDay() === 0) x.setDate(x.getDate() + 1) // Sunday -> observed Monday
  return x
}

export function resolveHolidayInput(input) {
  const k = input.toLowerCase().replace(/[^a-z0-9]/g, '')
  for (const [aliases, , label] of HOLIDAYS) {
    if (aliases.indexOf(k) >= 0) return { recurring: true, key: aliases[0], label }
  }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input)
  if (m) return { recurring: false, date: new Date(+m[1], +m[2] - 1, +m[3]) }
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(input)
  if (m) {
    let y = +m[3]
    if (y < 100) y += 2000
    return { recurring: false, date: new Date(y, +m[1] - 1, +m[2]) }
  }
  m = /^(\d{1,2})[/-](\d{1,2})$/.exec(input)
  if (m) return { recurring: true, m: +m[1] - 1, d: +m[2], label: '' }
  return null
}

// holidays: [{ key, label } | { m, d, label }]
export function holidayFor(date, holidays) {
  if (!holidays || !holidays.length) return null
  for (const h of holidays) {
    for (const yr of [date.getFullYear() - 1, date.getFullYear(), date.getFullYear() + 1]) {
      let d = null
      if (h.key) {
        const def = HOLIDAYS.find((x) => x[0].indexOf(h.key) >= 0)
        if (def) d = def[1](yr)
      } else if (h.m != null) {
        d = new Date(yr, h.m, h.d)
      }
      if (!d) continue
      d = observed(d)
      if (d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate()) {
        return h.label || 'Holiday'
      }
    }
  }
  return null
}
