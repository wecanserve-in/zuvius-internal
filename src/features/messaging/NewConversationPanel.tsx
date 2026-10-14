import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/AuthContext'
import {
  createCustomGroupConversation,
  getOrCreateDirectConversation,
} from '@/services/conversations.service'
import { listUsersForMessaging } from '@/services/users.service'
import { formatUserRole } from '@/lib/permissions'
import type { AppUser, Department } from '@/types'

function userSubtitle(u: AppUser, deptById: Map<string, string>): string {
  const parts: string[] = [formatUserRole(u.role)]
  const deptNames = u.departmentIds
    .map((id) => deptById.get(id))
    .filter(Boolean) as string[]
  if (deptNames.length) parts.push(deptNames.join(', '))
  return parts.join(' · ')
}

export function NewConversationPanel({
  users,
  departments = [],
  onClose,
}: {
  users: AppUser[]
  departments?: Department[]
  onClose: () => void
}) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [groupMode, setGroupMode] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [directory, setDirectory] = useState<AppUser[]>(users)

  useEffect(() => {
    setDirectory(users)
    void listUsersForMessaging().then((list) => {
      if (list.length > 0) setDirectory(list)
    })
  }, [users])

  if (!profile) return null

  const otherUsers = directory.filter((u) => u.id !== profile.id && u.isActive)

  const deptById = useMemo(
    () => new Map(departments.map((d) => [d.id, d.name])),
    [departments],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return otherUsers
    return otherUsers.filter((u) => {
      const haystack = [
        u.displayName,
        u.email,
        formatUserRole(u.role),
        ...u.departmentIds.map((id) => deptById.get(id) ?? ''),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [otherUsers, search, deptById])

  const toggleGroupMember = (id: string) => {
    setGroupMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const openDirect = async (otherUserId: string) => {
    setError(null)
    setLoading(true)
    try {
      const conversationId = await getOrCreateDirectConversation(profile, otherUserId)
      navigate(`/messages/${conversationId}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open chat')
    } finally {
      setLoading(false)
    }
  }

  const openGroup = async () => {
    setError(null)
    setLoading(true)
    try {
      const conversationId = await createCustomGroupConversation(
        profile,
        groupTitle,
        groupMemberIds,
      )
      navigate(`/messages/${conversationId}`)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="space-y-4 pt-6">
        {!groupMode ? (
          <>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, role, or department…"
              autoFocus
            />
            <ul className="max-h-64 space-y-1 overflow-auto">
              {filtered.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    disabled={loading}
                    className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)] disabled:opacity-50"
                    onClick={() => void openDirect(u.id)}
                  >
                    <span className="block font-medium">{u.displayName}</span>
                    {userSubtitle(u, deptById) ? (
                      <span className="block text-xs text-[var(--color-muted-foreground)]">
                        {userSubtitle(u, deptById)}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[var(--color-muted-foreground)]">
                  No one found
                </p>
              ) : null}
            </ul>
            <button
              type="button"
              className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline"
              onClick={() => setGroupMode(true)}
            >
              Message several people at once
            </button>
          </>
        ) : (
          <>
            <Input
              value={groupTitle}
              onChange={(e) => setGroupTitle(e.target.value)}
              placeholder="Group name"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people to add…"
            />
            <ul className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
              {filtered.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--color-muted)]">
                    <input
                      type="checkbox"
                      checked={groupMemberIds.includes(u.id)}
                      onChange={() => toggleGroupMember(u.id)}
                    />
                    {u.displayName}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={loading || groupMemberIds.length < 1}
                onClick={() => void openGroup()}
              >
                {loading ? 'Opening…' : 'Start group'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setGroupMode(false)
                  setGroupTitle('')
                  setGroupMemberIds([])
                }}
              >
                Back
              </Button>
            </div>
          </>
        )}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </CardContent>
    </Card>
  )
}
