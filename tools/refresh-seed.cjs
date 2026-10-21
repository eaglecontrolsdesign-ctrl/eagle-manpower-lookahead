// Refresh src/engine/seedBoard.json from the live board (boards/main): people, projects,
// staffing roles, overhead and holidays — never the schedule. Run from the repo root with the
// Firebase CLI signed in to an account that can read the project:
//
//     node tools/refresh-seed.cjs
//
// then review the diff, run the tests, and commit. This is what "Create new empty board"
// (first-time setup) starts from, so it should track the real roster.
const fs = require('fs')
const path = require('path')

const PROJECT = 'eagle-manpower-lookahead'
const FT = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'firebase-tools', 'lib')

function conv(v) {
  if (v.stringValue !== undefined) return v.stringValue
  if (v.integerValue !== undefined) return +v.integerValue
  if (v.doubleValue !== undefined) return v.doubleValue
  if (v.booleanValue !== undefined) return v.booleanValue
  if (v.nullValue !== undefined) return null
  if (v.arrayValue) return (v.arrayValue.values || []).map(conv)
  if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, conv(x)]))
  return v
}
const order = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]))

;(async () => {
  const { getGlobalDefaultAccount, getAccessToken } = require(path.join(FT, 'auth.js'))
  const scopes = require(path.join(FT, 'scopes.js'))
  const account = getGlobalDefaultAccount()
  if (!account) throw new Error('Sign in first: firebase login')
  const tok = (await getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM])).access_token
  const fields = ['people', 'projects', 'staffingRoles', 'overhead', 'holidays'].map((f) => 'mask.fieldPaths=' + f).join('&')
  const url = 'https://firestore.googleapis.com/v1/projects/' + PROJECT + '/databases/(default)/documents/boards/main?' + fields
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + tok } })
  if (!r.ok) throw new Error('Firestore read failed: ' + r.status + ' ' + (await r.text()).slice(0, 200))
  const live = Object.fromEntries(Object.entries((await r.json()).fields || {}).map(([k, v]) => [k, conv(v)]))

  const seed = {
    snapshotAt: new Date().toISOString().slice(0, 10),
    people: (live.people || []).map((p) => order(p, ['id', 'name', 'role', 'office', 'skills', 'planningRole', 'planningRoles'])).sort((a, b) => a.name.localeCompare(b.name)),
    projects: (live.projects || []).map((p) => order(p, ['id', 'name', 'office', 'requiredSkills', 'pmEmail'])),
    staffingRoles: live.staffingRoles || [],
    overhead: live.overhead || [],
    holidays: live.holidays || [],
  }
  const out = path.join(__dirname, '..', 'src', 'engine', 'seedBoard.json')
  fs.writeFileSync(out, JSON.stringify(seed, null, 2) + '\n')
  console.log('wrote', path.relative(process.cwd(), out), '—', seed.people.length, 'people,', seed.projects.length, 'projects,', seed.staffingRoles.length, 'roles,', seed.holidays.length, 'holidays')
})().catch((e) => {
  console.error('refresh-seed failed:', e.message)
  process.exit(1)
})
