import { uid } from './ids.js'
import { DEFAULT_STAFFING_ROLES, DEFAULT_OVERHEAD, SEED_PEOPLE, SEED_JOBS } from './constants.js'

// Fresh board shape for a brand-new Firestore doc — no legacy migration chain needed
// since this app has no prior data format to migrate from.
export function defaultBoard() {
  const people = SEED_PEOPLE.map(([name, role]) => ({ id: uid('per_'), name, role, office: 'Charlotte', skills: [] })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const projects = SEED_JOBS.map((name) => ({ id: uid('job_'), name, office: '', requiredSkills: [] }))

  return {
    people,
    projects,
    overhead: DEFAULT_OVERHEAD.map((o) => ({ ...o })),
    days: {},
    notes: {},
    demands: {},
    staffingRoles: DEFAULT_STAFFING_ROLES.slice(),
    holidays: [],
    aiHistory: [],
  }
}
