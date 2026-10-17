import { format } from 'date-fns'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { CreateWorkMenu } from '@/components/common/CreateWorkMenu'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { useWorkViewProjects } from '@/hooks/useWorkViewProjects'
import { hasMinRole } from '@/lib/permissions'
import { partitionTasks } from '@/lib/tasks/partitionWork'
import { projectProgressPercent } from '@/lib/tasks/projectProgress'
import { cn } from '@/lib/utils'
import { listDepartments } from '@/services/departments.service'
import { isTaskPending, subscribeAllTasks } from '@/services/tasks.service'
import { loadUsersByIds } from '@/services/users.service'
import type { AppUser, Department, Project, Task } from '@/types'

type WorkKind = 'tasks' | 'projects'

function groupTasksByUser(
  tasks: Task[],
  pickUserId: (task: Task) => string | undefined,
): { userId: string; tasks: Task[] }[] {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    const uid = pickUserId(task)
    if (!uid) continue
    const list = map.get(uid) ?? []
    list.push(task)
    map.set(uid, list)
  }
  return [...map.entries()]
    .map(([userId, grouped]) => ({ userId, tasks: grouped }))
    .sort((a, b) => b.tasks.length - a.tasks.length)
}

function uniqueAssigneeIds(projectTasks: Task[]): string[] {
  const ids = new Set<string>()
  for (const t of projectTasks) {
    for (const uid of t.assigneeIds) ids.add(uid)
  }
  return [...ids]
}

export function AdminDashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [departmentList, setDepartmentList] = useState<Department[]>([])
  const [usersById, setUsersById] = useState<Map<string, AppUser>>(new Map())
  const [assignByOpen, setAssignByOpen] = useState<string | null>(null)
  const [assignToOpen, setAssignToOpen] = useState<string | null>(null)
  const [departmentId, setDepartmentId] = useState('')
  const [workKind, setWorkKind] = useState<WorkKind>('tasks')
  const [openProjectId, setOpenProjectId] = useState<string | null>(null)
  const [openAssignee, setOpenAssignee] = useState<{ projectId: string; userId: string } | null>(
    null,
  )
  const isSuper = profile && profile.role === 'super_admin'

  useEffect(() => subscribeAllTasks(setTasks), [])

  const projects = useWorkViewProjects(profile, tasks, { orgWide: true })

  useEffect(() => {
    void listDepartments().then(setDepartmentList)
  }, [])

  useEffect(() => {
    const ids = [
      ...tasks.flatMap((t) => [t.createdBy, ...t.assigneeIds]),
      ...projects.map((p) => p.createdBy),
    ]
    void loadUsersByIds(ids).then(setUsersById)
  }, [tasks, projects])

  const { standalone } = useMemo(() => partitionTasks(tasks), [tasks])

  const filteredTasks = useMemo(() => {
    if (!departmentId) return standalone
    return standalone.filter((t) => t.departmentId === departmentId)
  }, [standalone, departmentId])

  const filteredProjects = useMemo(() => {
    if (!departmentId) return projects
    return projects.filter((p) => p.departmentId === departmentId)
  }, [projects, departmentId])

  const filteredProjectTasks = useMemo(() => {
    const projectIds = new Set(filteredProjects.map((p) => p.id))
    return tasks.filter((t) => t.projectId && projectIds.has(t.projectId))
  }, [tasks, filteredProjects])

  const assignedByTaskGroups = useMemo(
    () => groupTasksByUser(filteredTasks, (t) => t.createdBy),
    [filteredTasks],
  )

  const assignedToTaskGroups = useMemo(
    () => groupTasksByUser(filteredTasks, (t) => t.assigneeIds[0]),
    [filteredTasks],
  )

  const deptById = useMemo(() => new Map(departmentList.map((d) => [d.id, d])), [departmentList])

  const resetProjectExpansion = () => {
    setOpenProjectId(null)
    setOpenAssignee(null)
  }

  if (!profile || !hasMinRole(profile, 'admin')) return null

  const name = (id: string) => usersById.get(id)?.displayName ?? 'Unknown'

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        compact
        title={isSuper ? 'Organization' : 'Operations'}
        action={
          <div className="hidden sm:block">
            <CreateWorkMenu />
          </div>
        }
      />

      {isSuper ? (
        <>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:thin] sm:flex-wrap sm:overflow-visible">
            <FilterChip
              active={!departmentId}
              onClick={() => {
                setDepartmentId('')
                resetProjectExpansion()
              }}
            >
              All departments
            </FilterChip>
            {departmentList.map((d) => (
              <FilterChip
                key={d.id}
                active={departmentId === d.id}
                onClick={() => {
                  setDepartmentId(d.id)
                  resetProjectExpansion()
                }}
              >
                {d.name}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-2">
            <KindTab
              active={workKind === 'projects'}
              onClick={() => {
                setWorkKind('projects')
                setAssignByOpen(null)
                setAssignToOpen(null)
                resetProjectExpansion()
              }}
              label="Projects"
            />
            <KindTab
              active={workKind === 'tasks'}
              onClick={() => {
                setWorkKind('tasks')
                setAssignByOpen(null)
                setAssignToOpen(null)
                resetProjectExpansion()
              }}
              label="Tasks"
            />
          </div>

          {workKind === 'tasks' ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <TaskGroupPanel
                title="Assigned by"
                groups={assignedByTaskGroups}
                usersById={usersById}
                openId={assignByOpen}
                onToggle={(id) => setAssignByOpen((cur) => (cur === id ? null : id))}
                deptById={deptById}
              />
              <TaskGroupPanel
                title="Assigned to"
                groups={assignedToTaskGroups}
                usersById={usersById}
                openId={assignToOpen}
                onToggle={(id) => setAssignToOpen((cur) => (cur === id ? null : id))}
                deptById={deptById}
              />
            </div>
          ) : (
            <ProjectsByLinePanel
              projects={filteredProjects}
              projectTasks={filteredProjectTasks}
              usersById={usersById}
              deptById={deptById}
              openProjectId={openProjectId}
              onToggleProject={(id) => {
                setOpenAssignee(null)
                setOpenProjectId((cur) => (cur === id ? null : id))
              }}
              openAssignee={openAssignee}
              onToggleAssignee={(projectId, userId) => {
                setOpenAssignee((cur) =>
                  cur?.projectId === projectId && cur.userId === userId
                    ? null
                    : { projectId, userId },
                )
              }}
              name={name}
            />
          )}
        </>
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Use the Tasks page for organisation-wide lists, or open Team and Departments from the
          menu.
        </p>
      )}
    </div>
  )
}

function ProjectsByLinePanel({
  projects,
  projectTasks,
  usersById,
  deptById,
  openProjectId,
  onToggleProject,
  openAssignee,
  onToggleAssignee,
  name,
}: {
  projects: Project[]
  projectTasks: Task[]
  usersById: Map<string, AppUser>
  deptById: Map<string, Department>
  openProjectId: string | null
  onToggleProject: (projectId: string) => void
  openAssignee: { projectId: string; userId: string } | null
  onToggleAssignee: (projectId: string, userId: string) => void
  name: (id: string) => string
}) {
  return (
    <section className="overflow-hidden rounded-md border border-[var(--color-project-border)]">
      <div className="border-b border-[var(--color-project-border)] bg-[var(--color-project-muted)]/60 px-3 py-2">
        <h3 className="text-sm font-medium text-[var(--color-project-foreground)]">Projects</h3>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          One row per project — open for assignment details, then each assignee&apos;s tasks.
        </p>
      </div>
      <ul className="divide-y divide-[var(--color-border)]">
        {projects.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
            No projects match this department filter.
          </li>
        ) : null}
        {projects.map((project) => {
          const tasksForProject = projectTasks.filter((t) => t.projectId === project.id)
          const progress = projectProgressPercent(tasksForProject)
          const done = tasksForProject.filter((t) => t.status === 'completed').length
          const assigneeIds = uniqueAssigneeIds(tasksForProject)
          const expanded = openProjectId === project.id

          return (
            <li key={project.id} className="bg-[var(--color-card)]">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--color-project-muted)]/50"
                onClick={() => onToggleProject(project.id)}
                aria-expanded={expanded}
              >
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform',
                    expanded && 'rotate-180',
                  )}
                />
                <FolderKanban className="h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{project.title}</span>
                <span className="hidden text-xs text-[var(--color-muted-foreground)] sm:inline">
                  {done}/{tasksForProject.length || project.taskCount || 0} tasks · {progress}%
                </span>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open
                </Link>
              </button>

              {expanded ? (
                <div className="space-y-3 border-t border-[var(--color-border)] bg-[var(--color-muted)]/10 px-3 py-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <p>
                      <span className="text-[var(--color-muted-foreground)]">Assigned by: </span>
                      <span className="font-medium">{name(project.createdBy)}</span>
                    </p>
                    {project.deadlineAt ? (
                      <p className="text-[var(--color-muted-foreground)]">
                        Due {format(project.deadlineAt.toDate(), 'PP')}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                      Assigned to
                    </p>
                    {assigneeIds.length === 0 ? (
                      <p className="text-sm text-[var(--color-muted-foreground)]">No assignees yet.</p>
                    ) : (
                      <ul className="divide-y rounded-md border border-[var(--color-border)] bg-[var(--color-card)]">
                        {assigneeIds.map((userId) => {
                          const userTasks = tasksForProject.filter((t) =>
                            t.assigneeIds.includes(userId),
                          )
                          const assigneeOpen =
                            openAssignee?.projectId === project.id &&
                            openAssignee.userId === userId
                          const openCount = userTasks.filter(isTaskPending).length
                          return (
                            <li key={userId}>
                              <button
                                type="button"
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]/30"
                                onClick={() => onToggleAssignee(project.id, userId)}
                                aria-expanded={assigneeOpen}
                              >
                                <span className="font-medium">{name(userId)}</span>
                                <span className="text-xs text-[var(--color-muted-foreground)]">
                                  {userTasks.length} tasks · {openCount} open
                                </span>
                              </button>
                              {assigneeOpen ? (
                                <div className="border-t bg-[var(--color-muted)]/10 px-2 pb-2">
                                  <TaskTable
                                    tasks={userTasks}
                                    usersById={usersById}
                                    deptById={deptById}
                                    compact
                                  />
                                </div>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
          : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/40',
      )}
    >
      {children}
    </button>
  )
}

function KindTab({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
          : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
      )}
    >
      {label}
    </button>
  )
}

function TaskGroupPanel({
  title,
  description,
  groups,
  usersById,
  openId,
  onToggle,
  deptById,
}: {
  title: string
  description?: string
  groups: { userId: string; tasks: Task[] }[]
  usersById: Map<string, AppUser>
  openId: string | null
  onToggle: (userId: string) => void
  deptById: Map<string, Department>
}) {
  return (
    <section className="rounded-md border border-[var(--color-border)]">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {description ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">{description}</p>
        ) : null}
      </div>
      <ul className="max-h-[28rem] divide-y overflow-auto">
        {groups.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-[var(--color-muted-foreground)]">
            No items for this filter.
          </li>
        ) : null}
        {groups.slice(0, 20).map(({ userId, tasks: grouped }) => {
          const label = usersById.get(userId)?.displayName ?? 'Unknown'
          const open = grouped.filter(isTaskPending).length
          return (
            <li key={userId}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]/30"
                onClick={() => onToggle(userId)}
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {grouped.length} tasks · {open} open
                </span>
              </button>
              {openId === userId ? (
                <div className="border-t bg-[var(--color-muted)]/10 px-2 pb-2">
                  <TaskTable tasks={grouped} usersById={usersById} deptById={deptById} compact />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
