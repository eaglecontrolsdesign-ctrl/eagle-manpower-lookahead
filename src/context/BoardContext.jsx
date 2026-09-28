import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase.js'
import { defaultBoard } from '../engine/seed.js'
import { dayKeyOf, noteKeyOf } from '../engine/schedule.js'
import { demandKey } from '../engine/demand.js'

const BoardContext = createContext(null)
const BOARD_REF = doc(db, 'boards', 'main')
const FLUSH_DELAY_MS = 500
const MAP_FIELDS = ['days', 'notes', 'demands']

export function BoardProvider({ children }) {
  const [board, setBoard] = useState(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const boardRef = useRef(null)
  const seedingRef = useRef(false)
  // Local edits not yet guaranteed to be reflected by the next Firestore snapshot — covers both
  // "queued, not sent yet" and "sent, awaiting confirmation". Kept until the write is confirmed
  // so an incoming snapshot (which may still carry pre-write data) can never clobber a local
  // edit — every snapshot gets these re-applied on top before it reaches component state.
  const unconfirmedRef = useRef({ map: { days: {}, notes: {}, demands: {} }, array: {} })
  const timerRef = useRef(null)

  function withUnconfirmed(data) {
    const next = { ...data }
    MAP_FIELDS.forEach((field) => {
      const overrides = unconfirmedRef.current.map[field]
      const keys = overrides ? Object.keys(overrides) : []
      if (!keys.length) return
      const merged = { ...(next[field] || {}) }
      keys.forEach((k) => {
        const v = overrides[k]
        if (v === undefined) delete merged[k]
        else merged[k] = v
      })
      next[field] = merged
    })
    Object.entries(unconfirmedRef.current.array).forEach(([field, value]) => {
      next[field] = value
    })
    return next
  }

  useEffect(() => {
    const unsub = onSnapshot(
      BOARD_REF,
      (snap) => {
        if (!snap.exists()) {
          if (!seedingRef.current) {
            seedingRef.current = true
            setDoc(BOARD_REF, defaultBoard()).catch(setError)
          }
          return
        }
        const data = withUnconfirmed(snap.data())
        boardRef.current = data
        setBoard(data)
        setReady(true)
      },
      setError
    )
    return unsub
  }, [])

  function flushNow() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    // Snapshot exactly what we're about to send. A newer edit queued after this point stays in
    // unconfirmedRef untouched and goes out on the next flush.
    const mapToSend = {}
    MAP_FIELDS.forEach((field) => {
      const entries = unconfirmedRef.current.map[field]
      const keys = entries ? Object.keys(entries) : []
      if (keys.length) mapToSend[field] = keys.reduce((acc, k) => ((acc[k] = entries[k]), acc), {})
    })
    const arrayToSend = { ...unconfirmedRef.current.array }

    const patch = {}
    Object.entries(mapToSend).forEach(([field, entries]) => {
      Object.entries(entries).forEach(([key, val]) => {
        patch[field + '.' + key] = val === undefined ? deleteField() : val
      })
    })
    Object.entries(arrayToSend).forEach(([field, val]) => {
      patch[field] = val
    })
    if (Object.keys(patch).length === 0) return

    updateDoc(BOARD_REF, patch)
      .then(() => {
        // Only clear entries that are still exactly what we sent — if a newer local edit
        // superseded one in the meantime, leave it for the next flush.
        Object.entries(mapToSend).forEach(([field, entries]) => {
          const current = unconfirmedRef.current.map[field]
          if (!current) return
          Object.entries(entries).forEach(([key, val]) => {
            if (current[key] === val) delete current[key]
          })
        })
        Object.entries(arrayToSend).forEach(([field, val]) => {
          if (unconfirmedRef.current.array[field] === val) delete unconfirmedRef.current.array[field]
        })
      })
      .catch(setError)
  }

  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'hidden') flushNow()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', flushNow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', flushNow)
      flushNow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scheduleFlush() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flushNow, FLUSH_DELAY_MS)
  }

  function optimisticUpdate(mutator) {
    setBoard((prev) => {
      const next = mutator(prev)
      boardRef.current = next
      return next
    })
  }

  function markMapEdit(field, key, value) {
    if (!unconfirmedRef.current.map[field]) unconfirmedRef.current.map[field] = {}
    unconfirmedRef.current.map[field][key] = value
    scheduleFlush()
  }

  function markArrayEdit(field, value) {
    unconfirmedRef.current.array[field] = value
    scheduleFlush()
  }

  // ---- day / note / demand (map-field) mutators ----

  function setDay(personId, wkKey, dayIndex, value) {
    const key = dayKeyOf(personId, wkKey, dayIndex)
    optimisticUpdate((prev) => {
      const days = { ...prev.days }
      if (value == null || value === '') delete days[key]
      else days[key] = value
      return { ...prev, days }
    })
    markMapEdit('days', key, value == null || value === '' ? undefined : value)
  }

  function setNote(personId, wkKey, dayIndex, text) {
    const key = noteKeyOf(personId, wkKey, dayIndex)
    optimisticUpdate((prev) => {
      const notes = { ...prev.notes }
      if (!text) delete notes[key]
      else notes[key] = text
      return { ...prev, notes }
    })
    markMapEdit('notes', key, text ? text : undefined)
  }

  function setDemand(pid, wkKey, patchOrNull) {
    const key = demandKey(pid, wkKey)
    optimisticUpdate((prev) => {
      const demands = { ...prev.demands }
      if (patchOrNull == null) delete demands[key]
      else demands[key] = { ...(demands[key] || {}), ...patchOrNull }
      return { ...prev, demands }
    })
    if (patchOrNull == null) markMapEdit('demands', key, undefined)
    else markMapEdit('demands', key, { ...((boardRef.current.demands || {})[key] || {}), ...patchOrNull })
  }

  // ---- array-field mutators ----

  function updateArrayField(field, nextArray) {
    optimisticUpdate((prev) => ({ ...prev, [field]: nextArray }))
    markArrayEdit(field, nextArray)
  }

  const addPerson = (person) => updateArrayField('people', [...boardRef.current.people, person])
  const updatePerson = (id, patch) => updateArrayField('people', boardRef.current.people.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removePerson = (id) => updateArrayField('people', boardRef.current.people.filter((p) => p.id !== id))

  const addProject = (project) => updateArrayField('projects', [...boardRef.current.projects, project])
  const updateProject = (id, patch) => updateArrayField('projects', boardRef.current.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  const removeProject = (id) => updateArrayField('projects', boardRef.current.projects.filter((p) => p.id !== id))

  const addOverhead = (o) => updateArrayField('overhead', [...boardRef.current.overhead, o])
  const updateOverhead = (id, patch) => updateArrayField('overhead', boardRef.current.overhead.map((o) => (o.id === id ? { ...o, ...patch } : o)))
  const removeOverhead = (id) => updateArrayField('overhead', boardRef.current.overhead.filter((o) => o.id !== id))

  function addStaffingRole(name) {
    if (boardRef.current.staffingRoles.some((r) => r.toLowerCase() === name.toLowerCase())) return false
    updateArrayField('staffingRoles', [...boardRef.current.staffingRoles, name])
    return true
  }
  const removeStaffingRole = (name) => updateArrayField('staffingRoles', boardRef.current.staffingRoles.filter((r) => r !== name))

  const setHolidays = (list) => updateArrayField('holidays', list)

  function pushAiHistory(entry) {
    const next = [...boardRef.current.aiHistory, entry]
    updateArrayField('aiHistory', next.length > 20 ? next.slice(next.length - 20) : next)
  }
  const popAiHistory = () => updateArrayField('aiHistory', boardRef.current.aiHistory.slice(0, -1))

  // Bulk escape hatch — used by drag/drop (day swap, bulk reassign, job-tray drop, trash
  // clear/undo), the AI planner (apply/undo), and backup restore, which compute a full
  // next-state patch via the pure engine reducers. Diffs against the board snapshot from
  // *before* this call (captured up front, since optimisticUpdate below mutates boardRef.current
  // in place) so map-field deletions/changes are correctly detected and queued.
  function applyPatch(partial) {
    const prevSnapshot = boardRef.current
    optimisticUpdate((prev) => ({ ...prev, ...partial }))
    Object.entries(partial).forEach(([field, nextValue]) => {
      if (MAP_FIELDS.includes(field)) {
        const prevMap = (prevSnapshot && prevSnapshot[field]) || {}
        const keys = new Set([...Object.keys(prevMap), ...Object.keys(nextValue)])
        keys.forEach((k) => {
          if (nextValue[k] === undefined) {
            if (prevMap[k] !== undefined) markMapEdit(field, k, undefined)
          } else if (nextValue[k] !== prevMap[k]) {
            markMapEdit(field, k, nextValue[k])
          }
        })
      } else {
        markArrayEdit(field, nextValue)
      }
    })
  }

  const value = {
    board,
    ready,
    error,
    setDay,
    setNote,
    setDemand,
    addPerson,
    updatePerson,
    removePerson,
    addProject,
    updateProject,
    removeProject,
    addOverhead,
    updateOverhead,
    removeOverhead,
    addStaffingRole,
    removeStaffingRole,
    setHolidays,
    pushAiHistory,
    popAiHistory,
    applyPatch,
    flushNow,
  }

  return <BoardContext.Provider value={value}>{children}</BoardContext.Provider>
}

export function useBoard() {
  const ctx = useContext(BoardContext)
  if (!ctx) throw new Error('useBoard must be used within BoardProvider')
  return ctx
}
