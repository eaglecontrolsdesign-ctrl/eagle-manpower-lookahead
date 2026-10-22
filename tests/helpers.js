export function makeDb(overrides = {}) {
  return {
    people: [],
    projects: [],
    overhead: [],
    days: {},
    segments: {},
    notes: {},
    demands: {},
    staffingRoles: [],
    holidays: [],
    aiHistory: [],
    ...overrides,
  }
}

export function makeWeeks(keys) {
  return keys.map((key) => ({ key, label: key }))
}
