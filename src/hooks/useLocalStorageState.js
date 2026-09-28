import { useEffect, useState } from 'react'

// try/catch wrapper so a blocked/unavailable localStorage (private browsing, sandboxed
// preview) degrades to in-memory state instead of throwing.
export function useLocalStorageState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw == null ? defaultValue : JSON.parse(raw)
    } catch {
      return defaultValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue]
}
