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

export function personPlanningRole(person) {
  return person.planningRole || inferPlanningRole(person.role)
}
