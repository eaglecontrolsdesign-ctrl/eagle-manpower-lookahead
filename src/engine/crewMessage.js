import { daySegments, daySignature, hoursLabel, FULL_DAY } from './segments.js'
import { projColor } from './colors.js'
import { OFFICES } from './constants.js'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function findProjectOrSpecial(db, id) {
  return db.projects.find((p) => p.id === id) || (db.overhead || []).find((s) => s.id === id) || null
}

function nameOf(db, pid) {
  const p = findProjectOrSpecial(db, pid)
  return p ? p.name : pid
}

// Collapses a person's 7-day assignment pattern for one week into readable segments,
// e.g. "all week", "Mon–Wed", or a single day.
// A day with several jobs, or part of a day, is spelled out with hours ("A 4h + B 4h").
function dayLabel(db, segs) {
  if (!segs.length) return null
  if (segs.length === 1 && segs[0].hours === FULL_DAY) return nameOf(db, segs[0].id)
  return segs.map((s) => nameOf(db, s.id) + ' ' + hoursLabel(s.hours)).join(' + ')
}

export function crewSegments(db, personId, wkKey) {
  const segs = [0, 1, 2, 3, 4, 5, 6].map((i) => daySegments(db, personId, wkKey, i))
  const vals = segs.map(daySignature)
  const entry = (i, when) => ({ pid: segs[i].length ? segs[i][0].id : null, label: dayLabel(db, segs[i]), when })
  const wkdays = vals.slice(0, 5)
  if (wkdays.every((v) => v === wkdays[0]) && !vals[5] && !vals[6]) return [entry(0, 'all week')]
  if (vals.every((v) => v === vals[0])) return [entry(0, 'all 7 days')]
  const parts = []
  let s = 0
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || vals[i] !== vals[s]) {
      if (vals[s] || s < 5) parts.push(entry(s, i - 1 === s ? DAY_NAMES[s] : DAY_NAMES[s] + '–' + DAY_NAMES[i - 1]))
      s = i
    }
  }
  return parts
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
}

// Builds the rich-HTML + plain-text "crew message" for a given week, optionally scoped to one office.
export function buildCrewMessage(db, week, office) {
  const lines = ['Manpower — Week of ' + week.label + (office ? ' — ' + office : '')]
  let html =
    '<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#16324a">' +
    '<div style="font-size:18px;font-weight:800;color:#0e2a3f">🦅 Manpower — Week of ' +
    esc(week.label) +
    (office ? ' — ' + esc(office) : '') +
    '</div>' +
    '<div style="height:4px;width:340px;background:#1b9de2;background:linear-gradient(90deg,#1b9de2,#8cc63e);border-radius:99px;margin:6px 0 2px">&nbsp;</div>'

  OFFICES.forEach((o) => {
    if (office && o !== office) return
    const ppl = db.people.filter((p) => (p.office || 'Charlotte') === o)
    if (!ppl.length) return
    lines.push('', o + ':')
    html +=
      '<div style="margin:14px 0 8px"><span style="background:#1b9de2;color:#ffffff;font-weight:800;padding:3px 12px;border-radius:6px;font-size:12px;letter-spacing:1.5px">' +
      esc(o.toUpperCase()) +
      '</span></div><table style="border-collapse:collapse">'
    ppl.forEach((per) => {
      const segs = crewSegments(db, per.id, week.key)
      lines.push(
        '• ' +
          per.name +
          ': ' +
          segs
            .map((sg) => (sg.pid ? sg.label || nameOf(db, sg.pid) : 'unassigned') + (sg.when === 'all week' || sg.when === 'all 7 days' ? ' (' + sg.when + ')' : ' ' + sg.when))
            .join('; ')
      )
      const chips = segs
        .map((sg) => {
          if (!sg.pid) {
            return (
              '<span style="border:1px solid #b6c2d4;color:#7a8aa0;font-weight:700;padding:2px 9px;border-radius:6px;font-size:12px;display:inline-block;margin:1px 4px 1px 0">unassigned · ' +
              esc(sg.when) +
              '</span>'
            )
          }
          const p = findProjectOrSpecial(db, sg.pid)
          const idx = db.projects.findIndex((x) => x.id === sg.pid)
          const c = p ? projColor(p, Math.max(idx, 0)) : '#7f8db0'
          const fg = luminance(c) > 0.62 ? '#173142' : '#ffffff'
          return '<span style="background:' + c + ';color:' + fg + ';font-weight:700;padding:2px 9px;border-radius:6px;font-size:12px;display:inline-block;margin:1px 4px 1px 0">' + esc(sg.label || nameOf(db, sg.pid)) + ' · ' + esc(sg.when) + '</span>'
        })
        .join(' ')
      html += '<tr><td style="padding:4px 14px 4px 0;font-weight:700;white-space:nowrap;vertical-align:top;color:#16324a">' + esc(per.name) + '</td><td style="padding:4px 0">' + chips + '</td></tr>'
    })
    html += '</table>'
  })

  html += '<div style="margin-top:14px;font-size:13px;color:#8aa0b8">Sent from Eagle Manpower Lookahead</div></div>'
  return { html, text: lines.join('\n') }
}
