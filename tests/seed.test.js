import { describe, it, expect } from 'vitest'
import { defaultBoard, SEED_SNAPSHOT_DATE } from '../src/engine/seed.js'
import seedBoard from '../src/engine/seedBoard.json'
import { personPlanningRoles } from '../src/engine/planningRoles.js'

describe('seed', () => {
  it('produces a fresh board from the bundled snapshot: real roster and projects, no schedule', () => {
    const board = defaultBoard()
    expect(board.people.length).toBe(seedBoard.people.length)
    expect(board.people.length).toBeGreaterThan(30)
    expect(board.projects.length).toBe(seedBoard.projects.length)
    expect(board.overhead.some((o) => o.id === '__HOL' && o.locked)).toBe(true)
    expect(board.staffingRoles).toContain('Project Manager')
    expect(board.days).toEqual({})
    expect(board.notes).toEqual({})
    expect(board.demands).toEqual({})
    expect(board.aiHistory).toEqual([])
    expect(new Set(board.people.map((p) => p.id)).size).toBe(board.people.length) // unique ids
    expect(new Set(board.projects.map((p) => p.id)).size).toBe(board.projects.length)
    expect(SEED_SNAPSHOT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns fresh copies, so editing one board never changes the snapshot', () => {
    const a = defaultBoard()
    a.people.push({ id: 'x', name: 'X' })
    a.staffingRoles.push('Nope')
    const b = defaultBoard()
    expect(b.people.length).toBe(seedBoard.people.length)
    expect(b.staffingRoles).not.toContain('Nope')
  })

  it('every person has a name, office and planning role; every project has a name', () => {
    const board = defaultBoard()
    board.people.forEach((p) => {
      expect(p.name).toBeTruthy()
      expect(['Charlotte', 'St. Louis', 'Nashville', 'Atlanta']).toContain(p.office)
      // Explicit, or inferred from the job title the same way the app does it.
      expect(personPlanningRoles(p).length).toBeGreaterThan(0)
    })
    board.projects.forEach((p) => expect(p.name).toBeTruthy())
  })
})
