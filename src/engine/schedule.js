import { dateOf } from './dates.js'
import { holidayFor } from './holidays.js'

export function dayKeyOf(personId, wkKey, dayIndex) {
  return personId + '|' + wkKey + '|' + dayIndex
}

export function noteKeyOf(personId, wkKey, dayIndex) {
  return dayKeyOf(personId, wkKey, dayIndex)
}

// days: DB.days map, holidays: DB.holidays array
export function dayVal(days, holidays, personId, wkKey, dayIndex) {
  const v = days[dayKeyOf(personId, wkKey, dayIndex)]
  if (v) return v
  return holidayFor(dateOf(wkKey, dayIndex), holidays) ? '__HOL' : ''
}

export function isOverheadId(id) {
  return typeof id === 'string' && id.indexOf('__') === 0
}
