import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampAnchorPosition,
  COMPANION_SIZE_EXPANDED,
  estimatePanelWidth,
  loadCompanionPosition,
  saveCompanionPosition,
  type CompanionPosition,
} from '@/lib/companion/companionPosition'

const DRAG_THRESHOLD_PX = 6

const DRAG_CLAMP_W = Math.max(COMPANION_SIZE_EXPANDED, estimatePanelWidth())
const DRAG_CLAMP_H = 400

export function useCompanionDrag() {
  const [position, setPosition] = useState<CompanionPosition>(() => loadCompanionPosition())
  const positionRef = useRef(position)
  positionRef.current = position
  const [isDragging, setIsDragging] = useState(false)
  const dragState = useRef({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    originRight: 0,
    originBottom: 0,
    pointerId: -1,
  })

  useEffect(() => {
    const onResize = () =>
      setPosition((p) => clampAnchorPosition(p, DRAG_CLAMP_W, DRAG_CLAMP_H))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    const pos = positionRef.current
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originRight: pos.right,
      originBottom: pos.bottom,
      pointerId: e.pointerId,
    }
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragState.current
    if (!d.active || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
    d.moved = true
    setPosition(
      clampAnchorPosition(
        {
          right: d.originRight - dx,
          bottom: d.originBottom - dy,
        },
        DRAG_CLAMP_W,
        DRAG_CLAMP_H,
      ),
    )
  }, [])

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = dragState.current
    if (!d.active || e.pointerId !== d.pointerId) return false
    d.active = false
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const moved = d.moved
    if (moved) {
      setPosition((p) => {
        const clamped = clampAnchorPosition(p, DRAG_CLAMP_W, DRAG_CLAMP_H)
        saveCompanionPosition(clamped)
        return clamped
      })
    }
    d.moved = false
    return moved
  }, [])

  return {
    position,
    isDragging,
    onPointerDown,
    onPointerMove,
    endDrag,
  }
}
