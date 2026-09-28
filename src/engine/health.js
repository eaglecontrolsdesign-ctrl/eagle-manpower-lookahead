import { projectWeekCoverage } from './demand.js'

// Health score starts at 100 and loses points for planning/coverage gaps over `weeks`
// (the original scores the next 8 weeks). Exact deduction structure ported from source.
export function projectHealth(db, project, weeks) {
  let score = 100
  let demand = 0
  let gap = 0
  let planned = 0
  let draft = 0
  let scheduled = 0
  let unplannedActive = 0
  const reasons = []

  weeks.forEach((w) => {
    const c = projectWeekCoverage(db, project.id, w.key)
    scheduled += c.assigned
    if (c.hasPlan) {
      planned++
      demand += c.demand
      gap += c.gap
      if (c.status === 'draft') draft++
    } else if (c.assigned) unplannedActive++
  })

  if (!planned) {
    const pen = scheduled ? 38 : 22
    score -= pen
    reasons.push('-' + pen + ' no PM demand plan' + (scheduled ? ' (but work is scheduled)' : ''))
  }

  const unplannedPen = Math.min(26, (weeks.length - planned) * 5)
  if (unplannedPen && planned) {
    score -= unplannedPen
    reasons.push('-' + unplannedPen + ' · ' + (weeks.length - planned) + ' of ' + weeks.length + ' weeks unplanned')
  } else if (unplannedPen && !planned) {
    score -= unplannedPen
  }

  const gapPen = Math.min(34, demand ? Math.round((gap / demand) * 40) : 0)
  if (gapPen) {
    score -= gapPen
    reasons.push('-' + gapPen + ' · ' + gap + 'h of ' + demand + 'h demand unfilled')
  }

  const draftPen = Math.min(12, draft * 3)
  if (draftPen) {
    score -= draftPen
    reasons.push('-' + draftPen + ' · ' + draft + ' plan(s) still in draft')
  }

  const activePen = Math.min(10, unplannedActive * 5)
  if (activePen) {
    score -= activePen
    reasons.push('-' + activePen + ' · ' + unplannedActive + ' active week(s) with no plan')
  }

  score = Math.max(20, Math.min(100, score))
  const status = score >= 90 ? 'HEALTHY' : score >= 75 ? 'WATCH' : score >= 60 ? 'AT RISK' : 'CRITICAL'
  const color = score >= 90 ? '#34d399' : score >= 75 ? '#fbbf24' : score >= 60 ? '#fb923c' : '#fb7185'

  return { project, score, status, color, demand, gap, planned, draft, scheduled, reasons }
}
