import { useEffect, useMemo, useState } from 'react'
import {
  mergeProjectLists,
  subscribeProjectsByIds,
  subscribeProjectsForWorkView,
} from '@/services/projects.service'
import { ensureProjectParticipant } from '@/lib/projects/participants'
import { hasMinRole } from '@/lib/permissions'
import type { AppUser, Project, Task } from '@/types'

export function useWorkViewProjects(
  profile: AppUser | null | undefined,
  tasks: Task[],
  options: {
    orgWide?: boolean
    departmentIds?: string[]
    /** Subscribe to all projects created by the user (Tasks hub “Created by me”). */
    includeOwnedProjects?: boolean
  },
): Project[] {
  const [baseProjects, setBaseProjects] = useState<Project[]>([])
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([])

  const orgWide = Boolean(options.orgWide && profile && hasMinRole(profile, 'admin'))
  const deptKey = options.departmentIds?.join(',') ?? ''

  const includeOwned = Boolean(options.includeOwnedProjects)

  useEffect(() => {
    if (!profile) {
      setBaseProjects([])
      return
    }
    if (!orgWide && !includeOwned && !options.departmentIds?.length) {
      setBaseProjects([])
      return () => undefined
    }
    return subscribeProjectsForWorkView(
      profile,
      {
        orgWide,
        departmentIds: options.departmentIds,
        includeCreatedByUser: includeOwned,
      },
      setBaseProjects,
    )
  }, [profile?.id, orgWide, deptKey, includeOwned])

  const projectIdsFromTasks = useMemo(
    () => [...new Set(tasks.map((t) => t.projectId).filter(Boolean) as string[])],
    [tasks],
  )

  useEffect(() => {
    if (orgWide) {
      setLinkedProjects([])
      return
    }
    return subscribeProjectsByIds(projectIdsFromTasks, setLinkedProjects)
  }, [orgWide, projectIdsFromTasks.join(',')])

  useEffect(() => {
    if (!profile || orgWide) return
    for (const projectId of projectIdsFromTasks) {
      const task = tasks.find(
        (t) => t.projectId === projectId && t.assigneeIds.includes(profile.id),
      )
      if (task) {
        void ensureProjectParticipant(projectId, profile.id, task.id).catch(() => undefined)
      }
    }
  }, [profile?.id, orgWide, projectIdsFromTasks.join(','), tasks])

  return useMemo(
    () => mergeProjectLists(baseProjects, linkedProjects),
    [baseProjects, linkedProjects],
  )
}
