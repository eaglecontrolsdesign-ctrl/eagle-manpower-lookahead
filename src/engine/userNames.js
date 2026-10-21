// Display names for accounts (users/{email}.name, set by an administrator on the Users page).
// Everything keys on the email; the name is only how a person is shown.

export function displayName(u) {
  if (!u) return ''
  return (u.name || '').trim() || u.id || u.email || ''
}

// Resolve an email to a name using a list of user records; falls back to the email.
export function nameFor(users, email) {
  if (!email) return ''
  const u = (users || []).find((x) => x.id === email || x.email === email)
  return u && (u.name || '').trim() ? u.name.trim() : email
}

// "Name (email)" when a name exists, otherwise just the email.
export function nameWithEmail(users, email) {
  const n = nameFor(users, email)
  return n === email ? email : n + ' (' + email + ')'
}
