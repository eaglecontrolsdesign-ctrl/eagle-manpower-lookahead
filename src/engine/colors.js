import { PALETTE } from './constants.js'

export function avColor(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function projColor(project, index) {
  return project.color || PALETTE[index % PALETTE.length]
}

export function utilColor(u) {
  return u >= 100 ? '#fb7185' : u >= 85 ? '#fbbf24' : u >= 50 ? '#34d399' : '#38bdf8'
}
