import { describe, it, expect } from 'vitest'
import { applySurge, applyAbsence, applyShiftEarlier, summarizeScenario } from '../src/engine/scenarioLab.js'

const baseStats = [
  { capacity: 400, scheduled: 200, demand: 200, pressure: 50 },
  { capacity: 400, scheduled: 200, demand: 200, pressure: 50 },
  { capacity: 400, scheduled: 200, demand: 200, pressure: 50 },
]

describe('scenarioLab', () => {
  it('applySurge adds value*40h of demand for the given duration starting at start', () => {
    const sim = applySurge(baseStats, { value: 2, duration: 2, start: 0 })
    expect(sim[0].demand).toBe(280) // 200 + 2*40
    expect(sim[1].demand).toBe(280)
    expect(sim[2].demand).toBe(200) // untouched
    expect(baseStats[0].demand).toBe(200) // original untouched (clone, not mutate)
  })

  it('applyAbsence removes value*40h of capacity for the given duration', () => {
    const sim = applyAbsence(baseStats, { value: 1, duration: 1, start: 1 })
    expect(sim[1].capacity).toBe(360)
    expect(sim[0].capacity).toBe(400)
  })

  it('applyShiftEarlier moves a project demand curve N weeks earlier', () => {
    const sourceDemandByWeek = [0, 0, 120] // 120h of demand sits in week index 2
    const sim = applyShiftEarlier(baseStats, sourceDemandByWeek, 2)
    expect(sim[2].demand).toBe(80) // 200 - 120
    expect(sim[0].demand).toBe(320) // 200 + 120, shifted to index 0
  })

  it('summarizeScenario reports peak pressure, shortage, weeks-over-100%, and FTE equivalent', () => {
    const sim = applySurge(baseStats, { value: 6, duration: 3, start: 0 }) // +240h/week, way over capacity
    const summary = summarizeScenario(baseStats, sim, { label: 'test', detail: 'test detail' })
    expect(summary.newPeak).toBeGreaterThan(100)
    expect(summary.weeksOver).toBe(3)
    expect(summary.newShort).toBe(40) // demand 440 - capacity 400
    expect(summary.fte).toBe(1) // ceil(40/40)
    expect(summary.firstRiskIndex).toBe(0)
  })
})
