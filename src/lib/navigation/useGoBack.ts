import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Returns to the previous in-app location when possible; otherwise uses `fallback`.
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()

  return useCallback(() => {
    const state = location.state as { from?: string } | null
    if (state?.from) {
      navigate(state.from)
      return
    }

    const idx = (window.history.state as { idx?: number } | null)?.idx
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1)
      return
    }

    if (location.key !== 'default') {
      navigate(-1)
      return
    }

    navigate(fallback)
  }, [navigate, location, fallback])
}
