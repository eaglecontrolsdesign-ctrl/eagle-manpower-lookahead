import { useEffect } from 'react'
import { useBoardDnd } from './DndContext.jsx'

export default function DragTrash() {
  const dnd = useBoardDnd()

  useEffect(() => {
    document.body.classList.toggle('dnd-active', dnd.isDragging)
    return () => document.body.classList.remove('dnd-active')
  }, [dnd.isDragging])

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && dnd.trashUndo) {
        e.preventDefault()
        dnd.undoTrashClear()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dnd])

  return (
    <div
      className={'drag-trash' + (dnd.hotTrash ? ' hot' : '')}
      onDragOver={(e) => {
        e.preventDefault()
        dnd.setHotTrash(true)
      }}
      onDragLeave={() => dnd.setHotTrash(false)}
      onDrop={(e) => {
        e.preventDefault()
        dnd.dropOnTrash()
      }}
    >
      Drop here to clear{dnd.trashUndo ? ' · Ctrl+Z to undo last clear' : ''}
    </div>
  )
}
