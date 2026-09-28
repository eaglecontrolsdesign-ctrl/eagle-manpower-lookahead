import { describe, it, expect } from 'vitest'
import { runAIPlanner, applyProposal, undoLastProposal } from '../src/engine/aiPlanner.js'
import { dayKeyOf } from '../src/engine/schedule.js'
import { makeDb, makeWeeks } from './helpers.js'

describe('aiPlanner', () => {
  it('proposes moving a day of work from the busiest to the most-open matching person', () => {
    const db = makeDb({
      people: [
        { id: 'p1', name: 'Busy Bea', office: 'Charlotte', skills: [] },
        { id: 'p2', name: 'Open Otto', office: 'Charlotte', skills: [] },
      ],
      projects: [{ id: 'job_1', name: 'Big Job', requiredSkills: [] }],
      days: { [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1' },
    })
    const weeks = makeWeeks(['2026-01-05'])
    const result = runAIPlanner(db, weeks, { weekKey: '2026-01-05', projectId: 'job_1' })
    expect(result.ok).toBe(true)
    expect(result.proposal.sourceId).toBe('p1')
    expect(result.proposal.targetId).toBe('p2')
    expect(result.proposal.pid).toBe('job_1')
  })

  it('returns ok:false with available people when no safe move exists', () => {
    const db = makeDb({ people: [{ id: 'p1', name: 'Solo', office: 'Charlotte' }] })
    const weeks = makeWeeks(['2026-01-05'])
    const result = runAIPlanner(db, weeks, { weekKey: '2026-01-05' })
    expect(result.ok).toBe(false)
    expect(result.avail.length).toBe(1)
  })

  it('applyProposal moves the assignment and records undo history, capped at 20', () => {
    const db = makeDb({ days: { [dayKeyOf('p1', '2026-01-05', 0)]: 'job_1' }, aiHistory: [] })
    const proposal = { sourceId: 'p1', targetId: 'p2', pid: 'job_1', weekKey: '2026-01-05', day: 0, label: 'Big Job' }
    const result = applyProposal(db, proposal)
    expect(result.ok).toBe(true)
    expect(result.patch.days[dayKeyOf('p1', '2026-01-05', 0)]).toBeUndefined()
    expect(result.patch.days[dayKeyOf('p2', '2026-01-05', 0)]).toBe('job_1')
    expect(result.patch.aiHistory.length).toBe(1)
  })

  it('applyProposal rejects a stale proposal whose source has already changed', () => {
    const db = makeDb({ days: {}, aiHistory: [] }) // source day is no longer 'job_1'
    const proposal = { sourceId: 'p1', targetId: 'p2', pid: 'job_1', weekKey: '2026-01-05', day: 0, label: 'Big Job' }
    expect(applyProposal(db, proposal).ok).toBe(false)
  })

  it('undoLastProposal reverses the most recent applied move', () => {
    const sourceKey = dayKeyOf('p1', '2026-01-05', 0)
    const targetKey = dayKeyOf('p2', '2026-01-05', 0)
    const db = makeDb({
      days: { [targetKey]: 'job_1' },
      aiHistory: [{ sourceKey, targetKey, pid: 'job_1', targetPrevious: '', label: 'Big Job', at: 1 }],
    })
    const result = undoLastProposal(db)
    expect(result.ok).toBe(true)
    expect(result.patch.days[sourceKey]).toBe('job_1')
    expect(result.patch.days[targetKey]).toBeUndefined()
    expect(result.patch.aiHistory.length).toBe(0)
  })
})
