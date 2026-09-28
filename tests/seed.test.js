import { describe, it, expect } from 'vitest'
import { defaultBoard } from '../src/engine/seed.js'

describe('seed', () => {
  it('produces a fresh board with seeded people/projects and default overhead/roles', () => {
    const board = defaultBoard()
    expect(board.people.length).toBeGreaterThan(0)
    expect(board.projects.length).toBeGreaterThan(0)
    expect(board.overhead.some((o) => o.id === '__HOL' && o.locked)).toBe(true)
    expect(board.staffingRoles).toContain('Project Manager')
    expect(board.days).toEqual({})
    expect(board.holidays).toEqual([])
    expect(new Set(board.people.map((p) => p.id)).size).toBe(board.people.length) // unique ids
  })
})
