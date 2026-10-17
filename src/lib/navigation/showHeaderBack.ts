/** Routes where the app chrome shows a header back control. */
export function showHeaderBack(pathname: string): boolean {
  if (/^\/messages\/[^/]+/.test(pathname)) return true
  if (pathname === '/tasks/new' || pathname === '/projects/new') return true
  if (/^\/tasks\/[^/]+/.test(pathname)) return true
  if (/^\/projects\/[^/]+/.test(pathname)) return true
  if (/^\/team\/[^/]+/.test(pathname)) return true
  return false
}
