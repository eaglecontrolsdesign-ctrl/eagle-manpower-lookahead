import { describe, it, expect } from 'vitest'
import { inferPlanningRole, personPlanningRole } from '../src/engine/planningRoles.js'

describe('planningRoles', () => {
  it('infers a staffing role from keywords in a free-text job title', () => {
    expect(inferPlanningRole('Sr. Project Manager')).toBe('Project Manager')
    expect(inferPlanningRole('Controls Engineer II')).toBe('Controls Engineer')
    expect(inferPlanningRole('Service Account Manager')).toBe('Service Technician')
    expect(inferPlanningRole('Operations Coordinator')).toBe('Project Coordinator')
    expect(inferPlanningRole('Field Supervisor')).toBe('Field Coordinator')
    expect(inferPlanningRole('Random Title')).toBe('Controls Technician')
  })

  it('personPlanningRole prefers an explicit override over inference', () => {
    expect(personPlanningRole({ role: 'Engineer', planningRole: 'Programmer' })).toBe('Programmer')
    expect(personPlanningRole({ role: 'Engineer' })).toBe('Controls Engineer')
  })
})
