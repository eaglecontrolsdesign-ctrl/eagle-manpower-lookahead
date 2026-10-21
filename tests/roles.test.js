import { describe, it, expect } from 'vitest'
import { userRoles, hasRole, primaryRole, toggleRole, rolesLabel, rolesSortKey, canEdit } from '../src/engine/roles.js'

describe('account roles', () => {
  it('reads the roles array, falling back to the legacy single role', () => {
    expect(userRoles({ roles: ['coordinator', 'pm', 'bogus'] })).toEqual(['pm', 'coordinator'])
    expect(userRoles({ role: 'admin' })).toEqual(['admin'])
    expect(userRoles({ role: 'member' })).toEqual([])
    expect(userRoles(null)).toEqual([])
    expect(hasRole({ roles: ['pm'] }, 'pm')).toBe(true)
    expect(hasRole({ roles: ['pm'] }, 'admin')).toBe(false)
  })

  it('any role can edit; no role is view-only', () => {
    expect(canEdit({ roles: ['scheduler'] })).toBe(true)
    expect(canEdit({ role: 'pm' })).toBe(true)
    expect(canEdit({ roles: [] })).toBe(false)
    expect(canEdit({ role: 'member' })).toBe(false)
    expect(rolesLabel([])).toBe('Member (view only)')
  })

  it('primaryRole picks the highest-ranking role for the legacy field', () => {
    expect(primaryRole(['scheduler', 'pm'])).toBe('pm')
    expect(primaryRole(['pm', 'coordinator'])).toBe('coordinator')
    expect(primaryRole(['pm', 'admin'])).toBe('admin')
    expect(primaryRole([])).toBe('member')
  })

  it('toggleRole adds or removes while keeping a stable order', () => {
    expect(toggleRole([], 'admin')).toEqual(['admin'])
    expect(toggleRole(['admin'], 'pm')).toEqual(['pm', 'admin'])
    expect(toggleRole(['pm', 'admin'], 'admin')).toEqual(['pm'])
  })

  it('labels and sorts', () => {
    expect(rolesLabel(['pm', 'admin'])).toBe('PM, Admin')
    expect(rolesSortKey({ roles: ['admin', 'pm'] })).toBe(0)
    expect(rolesSortKey({ roles: ['scheduler'] })).toBe(3)
    expect(rolesSortKey({ roles: [] })).toBe(4)
  })
})
