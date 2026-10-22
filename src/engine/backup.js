const REQUIRED_KEYS = ['people', 'projects', 'overhead', 'days', 'segments', 'notes', 'demands', 'staffingRoles', 'holidays', 'aiHistory']

export function serializeBoard(db) {
  return JSON.stringify(db, null, 2)
}

export function parseBackup(json) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.people) || !Array.isArray(data.projects)) {
    return { ok: false, error: "That file doesn't look like an Eagle Manpower Lookahead backup." }
  }
  const board = { ...data }
  REQUIRED_KEYS.forEach((key) => {
    if (board[key] == null) board[key] = key === 'days' || key === 'segments' || key === 'notes' || key === 'demands' ? {} : []
  })
  return { ok: true, board }
}
