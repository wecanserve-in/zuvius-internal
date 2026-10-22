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
  OrganisationWorkSubNav,
  OverviewKindToggle,
  PersonalWorkSubNav,
  TaskHubScopeSwitcher,
  type OrgWorkView,
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
  filterProjectsDueTodayScope,
  filterProjectsForPersonalTab,
  filterTasksDueToday,
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

function parseScope(searchParams: URLSearchParams, showOrganisation: boolean): TaskHubScope {
  const explicit = searchParams.get('scope')
  if (explicit === 'due') return 'yours'
  if (explicit === 'org' && showOrganisation) return 'org'
  if (explicit === 'yours') return 'yours'

  const legacyTab = searchParams.get('tab')
  if (legacyTab === 'overview' || legacyTab === 'all') {
    if (showOrganisation) return 'org'
  }
  if (legacyTab === 'today') return 'yours'
  if (legacyTab && isPersonalTab(legacyTab as TaskHubTab)) return 'yours'

  return 'yours'
}

function parsePersonalTab(searchParams: URLSearchParams): TaskHubTab {
  const raw = searchParams.get('tab')
  if (raw === 'today') return 'today'
  if (raw && isPersonalTab(raw as TaskHubTab)) return raw as TaskHubTab
  return 'mine'
}

function parseOrgWorkView(searchParams: URLSearchParams): OrgWorkView {
  if (searchParams.get('view') === 'due-today') return 'dueToday'
  if (searchParams.get('due') === 'today') return 'dueToday'
  return 'all'
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
  const scope = parseScope(searchParams, showOrganisation)
  const personalTab = parsePersonalTab(searchParams)
  const workKind = parseWorkKind(searchParams)
  const orgWorkView = parseOrgWorkView(searchParams)

  const isOrgScope = scope === 'org'
  const isYourScope = scope === 'yours'
  const isDueTodayView =
    (isYourScope && personalTab === 'today') ||
    (isOrgScope && orgWorkView === 'dueToday')
  const orgWideData = isOrgScope && profile && canViewAllTasks(profile)

  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    let changed = false

    if (!next.get('scope')) {
      next.set('scope', 'yours')
      changed = true
    }
    if (next.get('scope') === 'due') {
      next.set('scope', 'yours')
      next.set('tab', 'today')
      changed = true
    }
    if (next.get('due') === 'today') {
      if (next.get('scope') === 'org') {
        next.set('view', 'due-today')
      } else {
        next.set('scope', 'yours')
        next.set('tab', 'today')
      }
      next.delete('due')
      changed = true
    }
    if (!next.get('tab') && next.get('scope') === 'yours') {
      next.set('tab', 'mine')
      changed = true
    }
    if (!next.get('kind')) {
      next.set('kind', 'projects')
      changed = true
    }

    if (changed) setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!profile) {
      setTasks([])
      return
    }

    if (isOrgScope) {
      if (canViewAllTasks(profile)) return subscribeAllTasks(setTasks)
      if (isDepartmentAdminOnly(profile)) {
        return subscribeDepartmentTasks(managedIds, setTasks)
      }
    }

    if (isYourScope && personalTab === 'created') {
      return subscribeTasksCreatedBy(profile.id, setTasks)
    }
    if (isYourScope && personalTab === 'forwarded') {
      return subscribeForwardedTasks(profile.id, setTasks)
    }

    return subscribeMyTasks(profile.id, setTasks)
  }, [profile, scope, personalTab, managedIds.join(','), isOrgScope, isYourScope])

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
  }, [profile?.id, scope, isOrgScope])

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

    if (isOrgScope) base = applyTaskListFilters(base, filters)
    if (isOrgScope && orgWorkView === 'dueToday') {
      base = filterTasksDueToday(base)
    }
    return base
  }, [
    tasks,
    personalTab,
    profile?.id,
    filters,
    isOrgScope,
    isYourScope,
    orgWorkView,
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
    if (isOrgScope && orgWorkView === 'dueToday') {
      list = filterProjectsDueTodayScope(list, taskProjectIds)
    }
    return list
  }, [
    projects,
    personalTab,
    profile?.id,
    isYourScope,
    orgWorkView,
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
    const next = new URLSearchParams()
    next.set('scope', 'org')
    next.set('kind', workKind)
    if (personalTab === 'today') next.set('view', 'due-today')
    setSearchParams(next)
  }

  const openYourWork = () => {
    const tab: TaskHubTab =
      orgWorkView === 'dueToday' || personalTab === 'today'
        ? 'today'
        : isPersonalTab(personalTab)
          ? personalTab
          : 'mine'
    const next = new URLSearchParams()
    next.set('scope', 'yours')
    next.set('tab', tab)
    next.set('kind', workKind)
    setSearchParams(next)
  }

  const setPersonalTab = (tab: TaskHubTab) => {
    const next = new URLSearchParams(searchParams)
    next.set('scope', 'yours')
    next.set('tab', tab)
    next.set('kind', workKind)
    next.delete('view')
    next.delete('due')
    setSearchParams(next)
  }

  const setOrgWorkView = (view: OrgWorkView) => {
    const next = new URLSearchParams(searchParams)
    next.set('scope', 'org')
    next.set('kind', workKind)
    next.delete('tab')
    if (view === 'dueToday') next.set('view', 'due-today')
    else next.delete('view')
    next.delete('due')
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

  const listMode = isDueTodayView
    ? 'split'
    : workKind === 'projects'
      ? 'projects-only'
      : 'tasks-only'

  const quickCompleteActor =
    isYourScope && personalTab !== 'completed' && personalTab !== 'created'
      ? profile
      : null

  const { standalone, byProjectId } = partitionTasks(filteredTasks)
  const projectRows = buildProjectRows(filteredProjects, byProjectId)

  const hasWork = isDueTodayView
    ? projectRows.length > 0 || standalone.length > 0
    : workKind === 'projects'
      ? projectRows.length > 0 ||
        (isYourScope && personalTab === 'created' && filteredProjects.length > 0)
      : standalone.length > 0

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader compact title="Dashboard" />

      <TaskHubScopeSwitcher
        scope={scope}
        showOrganisation={showOrganisation}
        organisationLabel={deptAdminOnly ? 'Department' : 'Organisation'}
        onOrganisation={openOrganisation}
        onYourWork={openYourWork}
      />

      <div className="flex flex-wrap items-center gap-2">
        {!isDueTodayView ? (
          <OverviewKindToggle value={workKind} onChange={setWorkKind} />
        ) : null}
        {canCreateTasks(profile) ? <CreateWorkMenu /> : null}
      </div>

      {isYourScope ? (
        <PersonalWorkSubNav value={personalTab} onChange={setPersonalTab} />
      ) : null}

      {isOrgScope ? (
        <>
          <OrganisationWorkSubNav value={orgWorkView} onChange={setOrgWorkView} />
          <TaskManagementFilters
            filters={filters}
            onChange={setFilters}
            departments={departmentsForFilters}
            users={users}
          />
        </>
      ) : null}

      {!hasWork ? (
        <EmptyState
          icon={CheckSquare}
          title={
            isDueTodayView
              ? 'Nothing due today'
              : workKind === 'projects'
                ? 'No projects'
                : 'No tasks'
          }
          description="Nothing in this list right now."
        />
      ) : null}

      {hasWork ? (
        <WorkItemsSplitView
          tasks={filteredTasks}
          projects={filteredProjects}
          usersById={usersById}
          deptById={deptById}
          management={isOrgScope}
          compact
          mode={listMode}
          quickCompleteActor={quickCompleteActor}
        />
      ) : null}
    </div>
  )
}
