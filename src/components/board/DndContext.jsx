import { createContext, useContext, useState } from 'react'
import { useBoard } from '../../context/BoardContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { usePermissions } from '../../hooks/usePermissions.js'
import { dayVal, dayKeyOf, noteKeyOf } from '../../engine/schedule.js'
import { dateOf } from '../../engine/dates.js'

const DndCtx = createContext(null)

function nameOf(board, pid) {
  const p = board.projects.find((x) => x.id === pid) || board.overhead.find((x) => x.id === pid)
  return p ? p.name : pid
}

export function BoardDndProvider({ children }) {
  const { board, setDay, setNote, applyPatch } = useBoard()
  const toast = useToast()
  const perms = usePermissions()
  const [dayDrag, setDayDrag] = useState(null)
  const [dragAssignment, setDragAssignment] = useState(null)
  const [jobDrag, setJobDrag] = useState(null)
  const [trashUndo, setTrashUndo] = useState(null)
  const [hotTrash, setHotTrash] = useState(false)

  function startDayDrag(personId, wk, i) {
    const value = dayVal(board.days, board.holidays, personId, wk, i)
    if (!value || value === '__HOL' || !perms.canEditPerson(personId)) return false
    setDayDrag({ personId, wk, i, value })
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
    const targetValue = dayVal(board.days, board.holidays, targetId, targetWk, targetI)
    if (targetValue === '__HOL') {
      toast('Holiday cells are protected')
      endDayDrag()
      return
    }
    if (targetValue && !window.confirm('Swap ' + nameOf(board, source.value) + ' with ' + nameOf(board, targetValue) + '?')) {
      endDayDrag()
      return
    }
    const sourceKey = dayKeyOf(source.personId, source.wk, source.i)
    const targetKey = dayKeyOf(targetId, targetWk, targetI)
    const sourceNoteKey = noteKeyOf(source.personId, source.wk, source.i)
    const targetNoteKey = noteKeyOf(targetId, targetWk, targetI)
    const sourceNote = board.notes[sourceNoteKey] || ''
    const targetNote = board.notes[targetNoteKey] || ''

    const days = { ...board.days }
    days[targetKey] = source.value
    if (targetValue) days[sourceKey] = targetValue
    else delete days[sourceKey]
    const notes = { ...board.notes }
    if (sourceNote) notes[targetNoteKey] = sourceNote
    else delete notes[targetNoteKey]
    if (targetNote) notes[sourceNoteKey] = targetNote
    else delete notes[sourceNoteKey]
    applyPatch({ days, notes })

    const srcDate = dateOf(source.wk, source.i)
    const dstDate = dateOf(targetWk, targetI)
    toast(
      (targetValue ? 'Swapped ' : 'Moved ') +
        nameOf(board, source.value) +
        ' · ' +
        srcDate.toLocaleDateString(undefined, { weekday: 'short' }) +
        ' → ' +
        dstDate.toLocaleDateString(undefined, { weekday: 'short' })
    )
    endDayDrag()
  }

  function startAssignmentDrag(perId, pid) {
    setDragAssignment({ perId, pid })
  }
  function endAssignmentDrag() {
    setDragAssignment(null)
    setHotTrash(false)
  }
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
    const days = { ...board.days }
    weeks.forEach((w) => {
      for (let d = 0; d < 5; d++) {
        const sk = dayKeyOf(src.id, w.key, d)
        if (days[sk] === dragAssignment.pid) {
          days[dayKeyOf(dst.id, w.key, d)] = dragAssignment.pid
          delete days[sk]
        }
      }
    })
    applyPatch({ days })
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
  function dropJobOnDay(targetId, targetWk, targetI) {
    const dragged = jobDrag
    if (!dragged) return
    if (!perms.canEditPerson(targetId)) {
      toast(perms.lockReason(targetId), 'error')
      endJobDrag()
      return
    }
    const targetValue = dayVal(board.days, board.holidays, targetId, targetWk, targetI)
    const person = board.people.find((p) => p.id === targetId)
    if (targetValue === '__HOL') {
      toast('Holiday cells are protected')
      endJobDrag()
      return
    }
    if (targetValue && targetValue !== dragged.pid && !window.confirm('Replace ' + nameOf(board, targetValue) + ' with ' + nameOf(board, dragged.pid) + ' for ' + person.name + '?')) {
      endJobDrag()
      return
    }
    setDay(targetId, targetWk, targetI, dragged.pid)
    endJobDrag()
    const date = dateOf(targetWk, targetI)
    toast((targetValue ? 'Updated ' : 'Scheduled ') + nameOf(board, dragged.pid) + ' · ' + person.name + ' · ' + date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }))
  }

  function dropOnTrash() {
    const entries = []
    let label = 'schedule work'
    if (dayDrag) {
      const k = dayKeyOf(dayDrag.personId, dayDrag.wk, dayDrag.i)
      const v = board.days[k]
      if (v && v !== '__HOL') {
        entries.push({ key: k, value: v })
        label = nameOf(board, v)
      }
    } else if (dragAssignment) {
      label = nameOf(board, dragAssignment.pid)
      Object.keys(board.days).forEach((k) => {
        if (board.days[k] === dragAssignment.pid && k.startsWith(dragAssignment.perId + '|')) entries.push({ key: k, value: dragAssignment.pid })
      })
    }
    setDayDrag(null)
    setDragAssignment(null)
    setHotTrash(false)
    if (!entries.length) {
      toast('Nothing was cleared')
      return
    }
    const days = { ...board.days }
    entries.forEach((e) => delete days[e.key])
    applyPatch({ days })
    setTrashUndo({ entries, label })
    toast('Cleared ' + label + ' · Ctrl+Z to undo')
  }

  function undoTrashClear() {
    if (!trashUndo) return
    const days = { ...board.days }
    trashUndo.entries.forEach((e) => (days[e.key] = e.value))
    applyPatch({ days })
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
