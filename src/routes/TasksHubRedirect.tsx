import { Navigate, useSearchParams } from 'react-router-dom'

/** Legacy `/tasks` hub URL → dashboard with the same query string. */
export function TasksHubRedirect() {
  const [searchParams] = useSearchParams()
  const q = searchParams.toString()
  if (q) return <Navigate to={`/?${q}`} replace />
  return <Navigate to="/?scope=yours&tab=mine&kind=projects" replace />
}
