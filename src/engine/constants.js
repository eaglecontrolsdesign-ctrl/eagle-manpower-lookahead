export const OFFICES = ['Charlotte', 'St. Louis', 'Nashville', 'Atlanta']

export const PALETTE = [
  '#22d3ee', '#a3e635', '#a78bfa', '#fb7185', '#fb923c',
  '#34d399', '#38bdf8', '#facc15', '#818cf8', '#2dd4bf',
]

export const DEFAULT_STAFFING_ROLES = [
  'Project Manager',
  'Project Director',
  'Controls Engineer',
  'Controls Technician',
  'Programmer',
  'Startup / Commissioning',
  'Field Coordinator',
  'Project Coordinator',
  'Service Technician',
]

export const DEFAULT_OVERHEAD = [
  { id: '__PTO', name: 'PTO / Vacation', color: '#fbbf24' },
  { id: '__SHOP', name: 'Office', color: '#38bdf8' },
  { id: '__REMOTE', name: 'Remote', color: '#22d3ee' },
  { id: '__SALES', name: 'Sales', color: '#fb923c' },
  { id: '__HOL', name: 'Holiday', color: '#cbd5e1', locked: true },
]

export const HORIZON_OPTIONS = [1, 2, 4, 8, 12]

// Seed data mirroring the current Eagle Charlotte roster, used only to bootstrap a fresh board.
export const SEED_PEOPLE = [
  ['AJ Portray', 'Controls Technician'],
  ['Akasia Bowie', 'Operations Coordinator'],
  ['Andre Rodriguez', 'Sr. Project Manager'],
  ['Andrew Castleberry', 'Sr. Project Manager'],
  ['Ezra Pierce', 'Controls Technician'],
  ['Lyla Guthrie', 'Project Technology and Development Coordinator'],
  ['Matt Briley', 'Service Account Manager'],
  ['Michael McHugh', 'Operations Manager'],
  ['Ryan Breen', 'Controls Technician'],
]

export const SEED_JOBS = [
  'C16476 Entek Lithium Separator Plant',
  'C11170 AWS SBN 215',
  'C11396 Project Faraday',
  'C11622 MOC-1 Phase II Standard Pods',
  'C11314 AWS CLT-100',
  'C11516 AWS CLT-102',
  'C11834 MOC-1 DH2',
  'C11626 AWS CLT 100 Ancillary BLDGs',
]
