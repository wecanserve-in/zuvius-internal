import { CheckSquare } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { PageHeader } from '@/components/common/PageHeader'
import { EmptyState } from '@/components/common/EmptyState'
import { useAuth } from '@/features/auth/AuthContext'
import {
  applyTaskListFilters,
  emptyTaskFilters,
  TaskManagementFilters,
} from '@/features/tasks/TaskManagementFilters'
import {
  OverviewKindToggle,
  PersonalWorkSubNav,
  TaskHubScopeSwitcher,
  type OverviewKind,
  type TaskHubScope,
  type TaskHubTab,
} from '@/features/tasks/TaskHubNav'
import { WorkItemsSplitView } from '@/features/tasks/WorkItemsSplitView'
import {
  canCreateTasks,
  canViewAllTasks,
  canViewTasksOverview,
  isDepartmentAdminOnly,
} from '@/lib/permissions'
import {
  filterProjectsForPersonalTab,
  filterTasksForPersonalTab,
  type PersonalWorkTab,
} from '@/lib/tasks/personalWorkFilters'
import { buildProjectRows, partitionTasks } from '@/lib/tasks/partitionWork'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import { useWorkViewProjects } from '@/hooks/useWorkViewProjects'
import { listDepartments } from '@/services/departments.service'
import {
  subscribeAllTasks,
  subscribeDepartmentTasks,
  subscribeForwardedTasks,
  subscribeMyTasks,
  subscribeTasksCreatedBy,
} from '@/services/tasks.service'
import { listOrgTaskMemberCandidates, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Department, Task } from '@/types'

const PERSONAL_TABS: TaskHubTab[] = [
  'mine',
  'created',
  'forwarded',
  'completed',
  'overdue',
  'today',
]

function isPersonalTab(tab: TaskHubTab): boolean {
  return PERSONAL_TABS.includes(tab)
}

function parseScope(
  searchParams: URLSearchParams,
  showOrganisation: boolean,
  preferOrgScope = false,
): TaskHubScope | null {
  const explicit = searchParams.get('scope')
  if (explicit === 'org' && showOrganisation) return 'org'
  if (explicit === 'yours') return 'yours'

  const legacyTab = searchParams.get('tab')
  if (legacyTab === 'overview' || legacyTab === 'all') {
    if (showOrganisation) return 'org'
  }
  if (legacyTab && isPersonalTab(legacyTab as TaskHubTab)) return 'yours'

  // Members only use Your work (no organisation scope).
  if (!showOrganisation) return 'yours'

  if (preferOrgScope) return 'org'

  return null
}

function parsePersonalTab(searchParams: URLSearchParams): TaskHubTab {
  const raw = searchParams.get('tab')
  if (raw && isPersonalTab(raw as TaskHubTab)) return raw as TaskHubTab
  return 'mine'
}

function parseWorkKind(searchParams: URLSearchParams): OverviewKind {
  return searchParams.get('kind') === 'tasks' ? 'tasks' : 'projects'
}

export function TasksHubPage() {
  const { profile } = useAuth()
  const { managedIds } = useManagedDepartments()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tasks, setTasks] = useState<Task[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [filters, setFilters] = useState(emptyTaskFilters)

  const showOrganisation = canViewTasksOverview(profile)
  const deptAdminOnly = Boolean(profile && isDepartmentAdminOnly(profile))
  const scope = parseScope(searchParams, showOrganisation, deptAdminOnly)
  const personalTab = parsePersonalTab(searchParams)
  const workKind = parseWorkKind(searchParams)

  const isOrgScope = scope === 'org'
  const isYourScope = scope === 'yours'
  const orgWideData = isOrgScope && profile && canViewAllTasks(profile)

  useEffect(() => {
    if (!profile || !scope) {
      setTasks([])
      return
    }

    if (isOrgScope) {
      if (canViewAllTasks(profile)) return subscribeAllTasks(setTasks)
      if (isDepartmentAdminOnly(profile)) {
        return subscribeDepartmentTasks(managedIds, setTasks)
      }
    }

    if (personalTab === 'created') return subscribeTasksCreatedBy(profile.id, setTasks)
    if (personalTab === 'forwarded') return subscribeForwardedTasks(profile.id, setTasks)

    return subscribeMyTasks(profile.id, setTasks)
  }, [profile, scope, personalTab, managedIds.join(',')])

  const includeOwnedProjects = isYourScope && personalTab === 'created'

  const projects = useWorkViewProjects(profile, tasks, {
    orgWide: Boolean(orgWideData),
    departmentIds: isDepartmentAdminOnly(profile) && isOrgScope ? managedIds : undefined,
    includeOwnedProjects,
  })

  useEffect(() => {
    void listDepartments().then(setDepartments).catch(() => setDepartments([]))
    if (profile && scope) {
      void listOrgTaskMemberCandidates(profile).then(setUsers).catch(() => setUsers([]))
    }
  }, [profile?.id, scope])

  useEffect(() => {
    const ids = tasks.flatMap((t) => [
      t.createdBy,
      ...t.assigneeIds,
      ...(t.initialAssigneeIds ?? []),
    ])
    const projectCreators = projects.map((p) => p.createdBy)
    void loadUsersByIds([...ids, ...projectCreators]).then(setUsersById)
  }, [tasks, projects])

  const managedDeptSet = useMemo(() => new Set(managedIds), [managedIds.join(',')])

  const filteredTasks = useMemo(() => {
    let base = tasks

    if (isYourScope && profile && isPersonalTab(personalTab)) {
      base = filterTasksForPersonalTab(
        tasks,
        personalTab as PersonalWorkTab,
        profile.id,
      )
    }

    if (isOrgScope && deptAdminOnly && managedDeptSet.size > 0) {
      base = base.filter(
        (t) => t.departmentId != null && managedDeptSet.has(t.departmentId),
      )
    }

    if (isOrgScope) return applyTaskListFilters(base, filters)
    return base
  }, [
    tasks,
    personalTab,
    profile?.id,
    filters,
    isOrgScope,
    isYourScope,
    deptAdminOnly,
    managedDeptSet,
  ])

  const taskProjectIds = useMemo(
    () =>
      new Set(
        filteredTasks.map((t) => t.projectId).filter(Boolean) as string[],
      ),
    [filteredTasks],
  )

  const filteredProjects = useMemo(() => {
    let list = projects
    if (isYourScope && profile && isPersonalTab(personalTab)) {
      list = filterProjectsForPersonalTab(
        list,
        personalTab as PersonalWorkTab,
        profile.id,
        taskProjectIds,
      )
    }
    if (isOrgScope && deptAdminOnly && managedDeptSet.size > 0) {
      list = list.filter(
        (p) => p.departmentId != null && managedDeptSet.has(p.departmentId),
      )
    }
    if (isOrgScope && filters.departmentId) {
      list = list.filter((p) => p.departmentId === filters.departmentId)
    }
    return list
  }, [
    projects,
    personalTab,
    profile?.id,
    isYourScope,
    isOrgScope,
    deptAdminOnly,
    managedDeptSet,
    filters.departmentId,
    taskProjectIds,
  ])

  const departmentsForFilters = useMemo(() => {
    if (deptAdminOnly && isOrgScope && managedDeptSet.size > 0) {
      return departments.filter((d) => managedDeptSet.has(d.id))
    }
    return departments
  }, [departments, deptAdminOnly, isOrgScope, managedDeptSet])

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])

  const openOrganisation = () => {
    setSearchParams({ scope: 'org', kind: workKind })
  }

  const openYourWork = () => {
    setSearchParams({ scope: 'yours', tab: personalTab, kind: workKind })
  }

  const setPersonalTab = (tab: TaskHubTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('scope', 'yours')
    next.set('tab', tab)
    next.set('kind', workKind)
    setSearchParams(next)
  }

  const setWorkKind = (kind: OverviewKind) => {
    const next = new URLSearchParams(searchParams)
    next.set('kind', kind)
    if (isOrgScope) {
      next.set('scope', 'org')
      next.delete('tab')
    } else if (isYourScope) {
      next.set('scope', 'yours')
      next.set('tab', personalTab)
    }
    setSearchParams(next)
  }

  if (!profile) return null

  const listMode = workKind === 'projects' ? 'projects-only' : 'tasks-only'

  const { standalone, byProjectId } = partitionTasks(filteredTasks)
  const projectRows = buildProjectRows(filteredProjects, byProjectId)

  const hasWork =
    workKind === 'projects'
      ? projectRows.length > 0 || (isYourScope && personalTab === 'created' && filteredProjects.length > 0)
      : standalone.length > 0

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title="Tasks"
        description={
          scope
            ? isOrgScope
              ? deptAdminOnly
                ? 'Projects and tasks in departments you manage.'
                : 'Organisation-wide projects and tasks.'
              : personalTab === 'created'
              ? 'Work you created — open a project for full progress.'
              : 'Your assignments and activity.'
            : 'Choose Organisation or Your work to get started.'
        }
        action={
          canCreateTasks(profile) ? (
            <div className="hidden sm:block">
              <CreateWorkMenu />
            </div>
          ) : null
        }
      />

      {showOrganisation ? (
        <TaskHubScopeSwitcher
          scope={scope}
          showOrganisation={showOrganisation}
          organisationLabel={deptAdminOnly ? 'Department' : 'Organisation'}
          onOrganisation={openOrganisation}
          onYourWork={openYourWork}
        />
      ) : null}

      {!scope && showOrganisation ? (
        <div className="rounded-md border border-dashed border-[var(--color-border)] px-4 py-16 text-center">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Select <strong>{deptAdminOnly ? 'Department' : 'Organisation'}</strong> or{' '}
            <strong>Your work</strong> above to load tasks.
          </p>
        </div>
      ) : null}

      {isYourScope ? (
        <>
          <OverviewKindToggle value={workKind} onChange={setWorkKind} />
          <PersonalWorkSubNav value={personalTab} onChange={setPersonalTab} />
        </>
      ) : null}

      {isOrgScope ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <OverviewKindToggle value={workKind} onChange={setWorkKind} />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {orgWideData
                ? 'All projects and individual tasks in the organisation.'
                : 'Projects and tasks in your managed departments.'}
            </p>
          </div>
          <TaskManagementFilters
            filters={filters}
            onChange={setFilters}
            departments={departmentsForFilters}
            users={users}
          />
        </>
      ) : null}

      {scope && !hasWork ? (
        <EmptyState
          icon={CheckSquare}
          title={workKind === 'projects' ? 'No projects' : 'No tasks'}
          description="Nothing in this list right now."
        />
      ) : null}

      {scope && hasWork ? (
        <WorkItemsSplitView
          tasks={filteredTasks}
          projects={filteredProjects}
          usersById={usersById}
          deptById={deptById}
          management={isOrgScope}
          compact
          mode={listMode}
        />
      ) : null}
    </div>
  )
}
