import { useEffect } from 'react'

// Keep a scrolling panel inside the viewport: its max-height is set so its bottom edge (and
// therefore its horizontal scrollbar) is always on screen, however many rows it holds. The
// panel scrolls both ways; sticky headers and name cells keep their place inside it.
export function useFitToViewport(ref, bottomGap = 18, minHeight = 260) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.maxHeight = 'max(' + minHeight + 'px, calc(100vh - ' + Math.round(top + bottomGap) + 'px))'
    }
    fit()
    window.addEventListener('resize', fit)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null
    if (ro) ro.observe(document.body)
    return () => {
      window.removeEventListener('resize', fit)
      if (ro) ro.disconnect()
    }
  }, [ref, bottomGap, minHeight])
}
