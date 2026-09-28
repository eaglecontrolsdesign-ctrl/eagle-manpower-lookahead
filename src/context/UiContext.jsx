import { createContext, useContext, useState } from 'react'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'

const UiContext = createContext(null)

export function UiProvider({ children }) {
  const [activeView, setActiveView] = useState('dashboard') // dashboard | board | ops | alerts | reports | admin
  const [boardView, setBoardView] = useLocalStorageState('eagle_mc_boardview', 'people') // people | projects | heatmap
  const [horizonWeeks, setHorizonWeeks] = useLocalStorageState('eagle_mc_horizon', 4)
  const [officeFilter, setOfficeFilter] = useLocalStorageState('eagle_mc_office', '')
  const [jobFilter, setJobFilter] = useLocalStorageState('eagle_mc_job', '')
  const [utilizationFilter, setUtilizationFilter] = useState('')
  const [expandedWeek, setExpandedWeek] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorageState('eagle_mc_sidebar_collapsed', false)

  const [employeeId, setEmployeeId] = useState(null)
  const [demand, setDemand] = useState(null) // { projectId, week }
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  function openEmployee(id) {
    setEmployeeId(id)
  }
  function closeEmployee() {
    setEmployeeId(null)
  }
  function openDemand(projectId, week) {
    setEmployeeId(null)
    setDemand({ projectId, week: week || null })
  }
  function closeDemand() {
    setDemand(null)
  }
  function applyKpiFilter(v) {
    setUtilizationFilter(['over', 'under', 'available'].includes(v) ? v : '')
  }

  const value = {
    activeView,
    setActiveView,
    boardView,
    setBoardView,
    horizonWeeks,
    setHorizonWeeks,
    officeFilter,
    setOfficeFilter,
    jobFilter,
    setJobFilter,
    utilizationFilter,
    setUtilizationFilter,
    applyKpiFilter,
    expandedWeek,
    setExpandedWeek,
    sidebarCollapsed,
    setSidebarCollapsed,
    employeeId,
    openEmployee,
    closeEmployee,
    demand,
    openDemand,
    closeDemand,
    aiPanelOpen,
    setAiPanelOpen,
  }

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi() {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
