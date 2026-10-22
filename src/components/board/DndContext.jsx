import { createContext, useContext, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { usePermissions } from '../../hooks/usePermissions.js'
import { dayKeyOf, noteKeyOf } from '../../engine/schedule.js'
import { daySegments, dayPatchFor, withJobHours, withoutJob, hoursLabel, FULL_DAY, HOLIDAY } from '../../engine/segments.js'
import { dateOf } from '../../engine/dates.js'

const DndCtx = createContext(null)

function nameOf(board, pid) {
  const p = board.projects.find((x) => x.id === pid) || board.overhead.find((x) => x.id === pid)
  return p ? p.name : pid
}

function isHoliday(board, personId, wk, i) {
  const segs = daySegments(board, personId, wk, i)
  return segs.length === 1 && segs[0].id === HOLIDAY && !board.days[dayKeyOf(personId, wk, i)]
}

// Drag-and-drop on the Manpower Board. A day can hold several jobs for any number of hours
// (engine/segments.js); dragging a chip moves only that job's hours. Two plain full days still
// swap when one is dropped on the other, as before.
export function BoardDndProvider({ children }) {
  const { board, setDay, applyPatch } = useBoard()
  const toast = useToast()
  const perms = usePermissions()
  const [dayDrag, setDayDrag] = useState(null)
  const [dragAssignment, setDragAssignment] = useState(null)
  const [jobDrag, setJobDrag] = useState(null)
  const [trashUndo, setTrashUndo] = useState(null)
  const [hotTrash, setHotTrash] = useState(false)

  // Writes a set of day changes in one patch: { key: segments[] } (empty = clear).
  function applyDays(changes) {
    const days = { ...board.days }
    const segments = { ...(board.segments || {}) }
    Object.entries(changes).forEach(([key, list]) => {
      const p = dayPatchFor(list)
      if (p.day === undefined) delete days[key]
      else days[key] = p.day
      if (p.segments === undefined) delete segments[key]
      else segments[key] = p.segments
    })
    return { days, segments }
  }

  function startDayDrag(personId, wk, i, jobId) {
    const segs = daySegments(board, personId, wk, i)
    const seg = segs.find((s) => s.id === jobId) || segs[0]
    if (!seg || seg.id === HOLIDAY || !perms.canEditPerson(personId)) return false
    setDayDrag({ personId, wk, i, value: seg.id, hours: seg.hours, whole: segs.length === 1 && seg.hours === FULL_DAY })
    return true
  }
  function endDayDrag() {
    setDayDrag(null)
    setHotTrash(false)
  }

  function dropDayAssignment(targetId, targetWk, targetI) {
    if (jobDrag) {
      dropJobOnDay(targetId, targetWk, targetI)
      return
    }
    if (!dayDrag) return
    if (!perms.canEditPerson(targetId)) {
      toast(perms.lockReason(targetId), 'error')
      endDayDrag()
      return
    }
    const source = dayDrag
    if (source.personId === targetId && source.wk === targetWk && source.i === targetI) {
      endDayDrag()
      return
    }
    if (isHoliday(board, targetId, targetWk, targetI)) {
      toast('Holiday cells are protected')
      endDayDrag()
      return
    }
    const sourceKey = dayKeyOf(source.personId, source.wk, source.i)
    const targetKey = dayKeyOf(targetId, targetWk, targetI)
    const sourceSegs = daySegments(board, source.personId, source.wk, source.i)
    const targetSegs = daySegments(board, targetId, targetWk, targetI)
    const targetWhole = targetSegs.length === 1 && targetSegs[0].hours === FULL_DAY
    const srcDate = dateOf(source.wk, source.i)
    const dstDate = dateOf(targetWk, targetI)
    const when = srcDate.toLocaleDateString(undefined, { weekday: 'short' }) + ' → ' + dstDate.toLocaleDateString(undefined, { weekday: 'short' })

    // Two plain full days: swap them (and their notes), as before.
    if (source.whole && targetWhole) {
      if (!window.confirm('Swap ' + nameOf(board, source.value) + ' with ' + nameOf(board, targetSegs[0].id) + '?')) {
        endDayDrag()
        return
      }
      const { days, segments } = applyDays({ [sourceKey]: targetSegs, [targetKey]: sourceSegs })
      const notes = { ...board.notes }
      const sourceNote = board.notes[noteKeyOf(source.personId, source.wk, source.i)] || ''
      const targetNote = board.notes[noteKeyOf(targetId, targetWk, targetI)] || ''
      if (sourceNote) notes[noteKeyOf(targetId, targetWk, targetI)] = sourceNote
      else delete notes[noteKeyOf(targetId, targetWk, targetI)]
      if (targetNote) notes[noteKeyOf(source.personId, source.wk, source.i)] = targetNote
      else delete notes[noteKeyOf(source.personId, source.wk, source.i)]
      applyPatch({ days, segments, notes })
      toast('Swapped ' + nameOf(board, source.value) + ' · ' + when)
      endDayDrag()
      return
    }

    // Otherwise move just the grabbed job's hours: off the source day, onto the target day
    // (joining whatever is already there; if the same job is there, the hours add up).
    const existing = targetSegs.find((s) => s.id === source.value)
    const nextTarget = withJobHours(targetSegs, source.value, (existing ? existing.hours : 0) + source.hours)
    const { days, segments } = applyDays({ [sourceKey]: withoutJob(sourceSegs, source.value), [targetKey]: nextTarget })
    applyPatch({ days, segments })
    toast('Moved ' + nameOf(board, source.value) + ' ' + hoursLabel(source.hours) + ' · ' + when + (targetSegs.length ? ' · now ' + hoursLabel(nextTarget.reduce((s, x) => s + x.hours, 0)) + ' that day' : ''))
    endDayDrag()
  }

  function startAssignmentDrag(perId, pid) {
    setDragAssignment({ perId, pid })
  }
  function endAssignmentDrag() {
    setDragAssignment(null)
    setHotTrash(false)
  }
  // Legend-chip drag: move every hour of one job from one person to another across the visible weeks.
  function dropAssignment(targetId, weeks) {
    if (!dragAssignment || dragAssignment.perId === targetId) return
    if (!perms.canEditPerson(targetId)) {
      toast(perms.lockReason(targetId), 'error')
      endAssignmentDrag()
      return
    }
    const src = board.people.find((p) => p.id === dragAssignment.perId)
    const dst = board.people.find((p) => p.id === targetId)
    const project = board.projects.find((p) => p.id === dragAssignment.pid) || board.overhead.find((p) => p.id === dragAssignment.pid)
    if (!window.confirm('Move visible ' + (project ? project.name : 'assignment') + ' work from ' + src.name + ' to ' + dst.name + '?')) return
    const changes = {}
    weeks.forEach((w) => {
      for (let d = 0; d < 5; d++) {
        const srcSegs = daySegments(board, src.id, w.key, d)
        const seg = srcSegs.find((s) => s.id === dragAssignment.pid)
        if (!seg) continue
        const dstSegs = daySegments(board, dst.id, w.key, d)
        const there = dstSegs.find((s) => s.id === seg.id)
        changes[dayKeyOf(src.id, w.key, d)] = withoutJob(srcSegs, seg.id)
        changes[dayKeyOf(dst.id, w.key, d)] = withJobHours(dstSegs, seg.id, (there ? there.hours : 0) + seg.hours)
      }
    })
    applyPatch(applyDays(changes))
    endAssignmentDrag()
    toast('Work reassigned to ' + dst.name)
  }

  function startJobDrag(pid) {
    setJobDrag({ pid })
    setDayDrag(null)
  }
  function endJobDrag() {
    setJobDrag(null)
    setHotTrash(false)
  }
  // From the Job Tray: a full day of that job (replacing whatever is there).
  function dropJobOnDay(targetId, targetWk, targetI) {
    const dragged = jobDrag
    if (!dragged) return
    if (!perms.canEditPerson(targetId)) {
      toast(perms.lockReason(targetId), 'error')
      endJobDrag()
      return
    }
    const targetSegs = daySegments(board, targetId, targetWk, targetI)
    const person = board.people.find((p) => p.id === targetId)
    if (isHoliday(board, targetId, targetWk, targetI)) {
      toast('Holiday cells are protected')
      endJobDrag()
      return
    }
    const already = targetSegs.length === 1 && targetSegs[0].id === dragged.pid && targetSegs[0].hours === FULL_DAY
    if (targetSegs.length && !already && !window.confirm('Replace ' + targetSegs.map((s) => nameOf(board, s.id)).join(' + ') + ' with a full day of ' + nameOf(board, dragged.pid) + ' for ' + person.name + '?')) {
      endJobDrag()
      return
    }
    setDay(targetId, targetWk, targetI, dragged.pid)
    endJobDrag()
    const date = dateOf(targetWk, targetI)
    toast((targetSegs.length ? 'Updated ' : 'Scheduled ') + nameOf(board, dragged.pid) + ' · ' + person.name + ' · ' + date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))
  }

  // Drop on the clear bar: a dragged chip clears just that job's hours from its day; a dragged
  // legend chip clears that job from every day of that person.
  function dropOnTrash() {
    const changes = {}
    const before = {}
    let label = 'schedule work'
    if (dayDrag) {
      const k = dayKeyOf(dayDrag.personId, dayDrag.wk, dayDrag.i)
      const segs = daySegments(board, dayDrag.personId, dayDrag.wk, dayDrag.i)
      if (segs.some((s) => s.id === dayDrag.value)) {
        before[k] = segs
        changes[k] = withoutJob(segs, dayDrag.value)
        label = nameOf(board, dayDrag.value) + (dayDrag.whole ? '' : ' ' + hoursLabel(dayDrag.hours))
      }
    } else if (dragAssignment) {
      label = nameOf(board, dragAssignment.pid)
      Object.keys(board.days).forEach((k) => {
        if (!k.startsWith(dragAssignment.perId + '|')) return
        const [pid, wk, d] = k.split('|')
        const segs = daySegments(board, pid, wk, +d)
        if (segs.some((s) => s.id === dragAssignment.pid)) {
          before[k] = segs
          changes[k] = withoutJob(segs, dragAssignment.pid)
        }
      })
    }
    setDayDrag(null)
    setDragAssignment(null)
    setHotTrash(false)
    if (!Object.keys(changes).length) {
      toast('Nothing was cleared')
      return
    }
    applyPatch(applyDays(changes))
    setTrashUndo({ before, label })
    toast('Cleared ' + label + ' · Ctrl+Z to undo')
  }

  function undoTrashClear() {
    if (!trashUndo) return
    applyPatch(applyDays(trashUndo.before))
    toast('Restored ' + trashUndo.label)
    setTrashUndo(null)
  }

  const isDragging = !!(dayDrag || dragAssignment || jobDrag)

  const value = {
    dayDrag,
    dragAssignment,
    jobDrag,
    isDragging,
    hotTrash,
    setHotTrash,
    startDayDrag,
    endDayDrag,
    dropDayAssignment,
    startAssignmentDrag,
    endAssignmentDrag,
    dropAssignment,
    startJobDrag,
    endJobDrag,
    dropJobOnDay,
    dropOnTrash,
    undoTrashClear,
    trashUndo,
  }

  return <DndCtx.Provider value={value}>{children}</DndCtx.Provider>
}

export function useBoardDnd() {
  const ctx = useContext(DndCtx)
  if (!ctx) throw new Error('useBoardDnd must be used within BoardDndProvider')
  return ctx
}
