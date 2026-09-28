export function normalizeSkills(value) {
  return [...new Set(String(value || '').split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean))]
}

export function skillMatchScore(person, project) {
  const req = (project && project.requiredSkills) || []
  if (!req.length) return 0.5
  const have = ((person && person.skills) || []).map((x) => x.toLowerCase())
  let hit = 0
  req.forEach((r) => {
    if (have.includes(String(r).toLowerCase())) hit++
  })
  return hit / req.length
}
