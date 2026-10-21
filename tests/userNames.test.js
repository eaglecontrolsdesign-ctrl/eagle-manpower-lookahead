import { describe, it, expect } from 'vitest'
import { displayName, nameFor, nameWithEmail } from '../src/engine/userNames.js'

const users = [{ id: 'a@x', name: 'Ann Lee' }, { id: 'b@x', name: '  ' }, { id: 'c@x' }]

describe('user names', () => {
  it('shows the name when set, otherwise the email', () => {
    expect(displayName({ id: 'a@x', name: 'Ann Lee' })).toBe('Ann Lee')
    expect(displayName({ id: 'b@x', name: '  ' })).toBe('b@x')
    expect(nameFor(users, 'a@x')).toBe('Ann Lee')
    expect(nameFor(users, 'b@x')).toBe('b@x')
    expect(nameFor(users, 'c@x')).toBe('c@x')
    expect(nameFor(users, 'unknown@x')).toBe('unknown@x')
    expect(nameWithEmail(users, 'a@x')).toBe('Ann Lee (a@x)')
    expect(nameWithEmail(users, 'c@x')).toBe('c@x')
  })
})
