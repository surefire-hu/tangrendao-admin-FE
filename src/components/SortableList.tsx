import { useRef, useState } from 'react'

// Minimal HTML5 drag-and-drop sortable list. Renders each row through
// `children(item, dragHandleProps)` so the parent owns the visual layout —
// this component only wires the drag events and emits the reorder.
//
// On drop, calls `onReorder(newIds)` with the full ID list in the new order.
// Caller is responsible for persisting (e.g. PATCH each row's display_order).

export interface SortableListProps<T extends { id: number }> {
  items: T[]
  onReorder: (newIds: number[]) => void
  children: (item: T, dragging: boolean) => React.ReactNode
  // Optional row className applied to the draggable wrapper.
  rowClassName?: string
  // Disable interactions (e.g. while saving).
  disabled?: boolean
}

export function SortableList<T extends { id: number }>({
  items, onReorder, children, rowClassName, disabled,
}: SortableListProps<T>) {
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const dragSource = useRef<number | null>(null)

  function handleDragStart(e: React.DragEvent, id: number) {
    if (disabled) return
    dragSource.current = id
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    // Firefox needs data set to start dragging.
    e.dataTransfer.setData('text/plain', String(id))
  }

  function handleDragOver(e: React.DragEvent, id: number) {
    if (disabled || dragSource.current == null) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overId !== id) setOverId(id)
  }

  function handleDrop(e: React.DragEvent, targetId: number) {
    if (disabled) return
    e.preventDefault()
    const sourceId = dragSource.current
    dragSource.current = null
    setDraggingId(null)
    setOverId(null)
    if (sourceId == null || sourceId === targetId) return
    const ids = items.map(i => i.id)
    const from = ids.indexOf(sourceId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    ids.splice(from, 1)
    ids.splice(to, 0, sourceId)
    onReorder(ids)
  }

  function handleDragEnd() {
    dragSource.current = null
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <div>
      {items.map(item => {
        const isDragging = draggingId === item.id
        const isOver = overId === item.id && draggingId !== item.id
        return (
          <div
            key={item.id}
            draggable={!disabled}
            onDragStart={e => handleDragStart(e, item.id)}
            onDragOver={e => handleDragOver(e, item.id)}
            onDrop={e => handleDrop(e, item.id)}
            onDragEnd={handleDragEnd}
            className={rowClassName}
            style={{
              opacity: isDragging ? 0.4 : 1,
              borderTop: isOver ? '2px solid #1677ff' : '2px solid transparent',
              cursor: disabled ? 'default' : 'grab',
              transition: 'border-color 0.1s',
            }}
          >
            {children(item, isDragging)}
          </div>
        )
      })}
    </div>
  )
}
