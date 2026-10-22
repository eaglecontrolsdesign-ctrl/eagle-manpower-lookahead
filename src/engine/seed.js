import seedBoard from './seedBoard.json'

// The board the app starts from on a genuine first-time setup ("Create new empty board"):
// the real roster, projects, staffing roles, overhead categories and holidays, with no schedule.
// seedBoard.json is a snapshot of the live board's structure — refresh it with
// `node tools/refresh-seed.cjs` (instructions at the top of that file) whenever the roster
// changes enough to matter. Ids are kept as they are live, so a JSON backup's days still line up with it.
export function defaultBoard() {
  const copy = JSON.parse(JSON.stringify(seedBoard))
  return {
    people: copy.people,
    projects: copy.projects,
    overhead: copy.overhead,
    days: {},
    segments: {},
    notes: {},
    demands: {},
    staffingRoles: copy.staffingRoles,
    holidays: copy.holidays || [],
    aiHistory: [],
  }
}

export const SEED_SNAPSHOT_DATE = seedBoard.snapshotAt
