export function inferPlanningRole(title) {
  const t = (title || '').toLowerCase()
  if (t.includes('project manager') || t.includes('operations manager') || t.includes('president')) return 'Project Manager'
  if (t.includes('program')) return 'Programmer'
  if (t.includes('engineer')) return 'Controls Engineer'
  if (t.includes('service')) return 'Service Technician'
  if (t.includes('coordinator')) return 'Project Coordinator'
  if (t.includes('supervisor') || t.includes('director')) return 'Field Coordinator'
  return 'Controls Technician'
}

// A person can carry several planning roles (person.planningRoles, first = primary); older
// records have a single planningRole, or none and we infer one from the job title.
export function personPlanningRoles(person) {
  if (Array.isArray(person.planningRoles) && person.planningRoles.length) return person.planningRoles
  return [person.planningRole || inferPlanningRole(person.role)]
}

export function personPlanningRole(person) {
  return personPlanningRoles(person)[0]
}
