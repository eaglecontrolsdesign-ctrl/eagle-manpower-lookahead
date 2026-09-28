// Pure "what-if" math over a cloned array of weekOpsStats() results — never touches the
// live board. `stats` is expected to be the 12-week forecast from engine/utilization.js.

export function cloneStats(stats) {
  return stats.map((x) => ({ ...x }))
}

export function applySurge(stats, { value, duration, start }) {
  const sim = cloneStats(stats)
  for (let i = start; i < Math.min(sim.length, start + duration); i++) sim[i].demand += value * 40
  return sim
}

export function applyAbsence(stats, { value, duration, start }) {
  const sim = cloneStats(stats)
  for (let i = start; i < Math.min(sim.length, start + duration); i++) sim[i].capacity = Math.max(0, sim[i].capacity - value * 40)
  return sim
}

// sourceDemandByWeek[i] = the target project's PM-demand hours in week i (0 if unplanned).
export function applyShiftEarlier(stats, sourceDemandByWeek, shiftWeeks) {
  const sim = cloneStats(stats)
  for (let i = 0; i < sourceDemandByWeek.length; i++) {
    if (!sourceDemandByWeek[i]) continue
    sim[i].demand = Math.max(0, sim[i].demand - sourceDemandByWeek[i])
    const ni = Math.max(0, i - shiftWeeks)
    sim[ni].demand += sourceDemandByWeek[i]
  }
  return sim
}

export function recomputePressure(stats) {
  return stats.map((x) => {
    const pressure = x.capacity ? Math.round((Math.max(x.scheduled, x.demand) / x.capacity) * 100) : x.demand ? 999 : 0
    const short = Math.max(0, x.demand - x.capacity)
    return { ...x, pressure, short }
  })
}

export function summarizeScenario(baseStats, simStatsRaw, meta) {
  const sim = recomputePressure(simStatsRaw)
  const basePeak = Math.max(0, ...baseStats.map((x) => x.pressure))
  const newPeak = Math.max(0, ...sim.map((x) => x.pressure))
  const baseShort = Math.max(0, ...baseStats.map((x) => Math.max(0, x.demand - x.capacity)))
  const newShort = Math.max(0, ...sim.map((x) => x.short))
  const weeksOver = sim.filter((x) => x.pressure > 100).length
  const fte = Math.ceil(newShort / 40)
  const firstRiskIndex = sim.findIndex((x) => x.pressure > 100)
  const delta = newPeak - basePeak
  return { sim, basePeak, newPeak, baseShort, newShort, weeksOver, fte, firstRiskIndex, delta, ...meta }
}
