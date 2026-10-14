import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatStrip } from '@/components/common/StatStrip'
import { Tabs } from '@/components/common/Tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { useManagedDepartments } from '@/hooks/useManagedDepartments'
import { formatUserRole } from '@/lib/permissions'
import {
  isTaskDueToday,
  isTaskOverdue,
  isTaskPending,
  subscribeAssignedAndDepartmentTasks,
  subscribeTaskAssignees,
} from '@/services/tasks.service'
import { listMembersForDepartmentIds, loadUsersByIds } from '@/services/users.service'
import type { AppUser, Task, TaskAssignee } from '@/types'

type DeptTab = 'overview' | 'team' | 'tasks'

export function DepartmentAdminDashboard() {
  const { profile } = useAuth()
  const { managed, managedIds } = useManagedDepartments()
  const [tab, setTab] = useState<DeptTab>('overview')
  const [members, setMembers] = useState<AppUser[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [assigneesByTask, setAssigneesByTask] = useState<Record<string, TaskAssignee[]>>({})
  const [memberSearch, setMemberSearch] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [taskStatus, setTaskStatus] = useState('all')
  const [nameById, setNameById] = useState<Map<string, AppUser>>(new Map())

  const managedKey = managedIds.join(',')

  useEffect(() => {
    if (!profile || managedIds.length === 0) return
    return subscribeAssignedAndDepartmentTasks(profile.id, managedIds, setTasks)
  }, [profile?.id, managedKey])

  useEffect(() => {
    if (managedIds.length === 0) {
      setMembers([])
      return
    }
    const load = () => void listMembersForDepartmentIds(managedIds).then(setMembers)
    load()
    const timer = window.setInterval(load, 20000)
    return () => window.clearInterval(timer)
  }, [managedKey])

  const taskIdsKey = tasks.map((t) => t.id).join(',')

  useEffect(() => {
    if (!taskIdsKey) {
      setAssigneesByTask({})
      return
    }
    const unsubs = tasks.map((t) =>
      subscribeTaskAssignees(t.id, (assignees) => {
        setAssigneesByTask((prev) => ({ ...prev, [t.id]: assignees }))
      }),
    )
    return () => unsubs.forEach((u) => u())
  }, [taskIdsKey])

  useEffect(() => {
    const ids = [...new Set(tasks.flatMap((t) => [...t.assigneeIds, t.createdBy]))]
    void loadUsersByIds(ids, nameById).then(setNameById)
  }, [tasks])

  const stats = useMemo(() => {
    const open = tasks.filter(isTaskPending).length
    const completed = tasks.filter((t) => t.status === 'completed').length
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length
    return { members: members.length, open, completed, overdue }
  }, [tasks, members])

  const myAssignedOpen = useMemo(
    () =>
      profile
        ? tasks
            .filter((t) => t.assigneeIds.includes(profile.id) && isTaskPending(t))
            .slice(0, 8)
        : [],
    [tasks, profile],
  )

  const attentionTasks = useMemo(
    () => tasks.filter((t) => isTaskOverdue(t) || isTaskDueToday(t)).filter(isTaskPending).slice(0, 8),
    [tasks],
  )

  const upcoming = useMemo(
    () =>
      [...tasks]
        .filter((t) => t.deadlineAt && isTaskPending(t))
        .sort((a, b) => a.deadlineAt!.toMillis() - b.deadlineAt!.toMillis())
        .slice(0, 8),
    [tasks],
  )

  const activity = useMemo(() => {
    const items: { id: string; at: Date; label: string; taskId: string }[] = []
    for (const task of tasks) {
      const assignees = assigneesByTask[task.id] ?? []
      for (const a of assignees) {
        if (a.status === 'completed' && a.completedAt) {
          const member = members.find((m) => m.id === a.userId)
          items.push({
            id: `${task.id}-${a.userId}-done`,
            at: a.completedAt.toDate(),
            label: `${member?.displayName ?? 'Member'} completed ${task.title}`,
            taskId: task.id,
          })
        }
      }
    }
    return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 10)
  }, [tasks, assigneesByTask, members])

  const memberRows = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return members
      .filter((m) => {
        if (!q) return true
        return (
          m.displayName.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q)
        )
      })
      .map((member) => {
        const assigned = tasks.filter((t) => t.assigneeIds.includes(member.id))
        let pending = 0
        let completed = 0
        let overdue = 0
        for (const t of assigned) {
          const row = assigneesByTask[t.id]?.find((a) => a.userId === member.id)
          const done = row?.status === 'completed'
          if (done) completed += 1
          else {
            pending += 1
            if (isTaskOverdue(t)) overdue += 1
          }
        }
        return { member, pending, completed, overdue }
      })
  }, [members, tasks, assigneesByTask, memberSearch])

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase()
    return tasks.filter((t) => {
      if (taskStatus === 'pending' && !isTaskPending(t)) return false
      if (taskStatus === 'completed' && t.status !== 'completed') return false
      if (taskStatus === 'overdue' && !isTaskOverdue(t)) return false
      if (q && !`${t.title} ${t.description}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [tasks, taskSearch, taskStatus])

  const deptLabel = managed.length === 0 ? 'Department' : managed.map((d) => d.name).join(', ')

  if (!profile || managedIds.length === 0) {
    return (
      <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-sm text-[var(--color-muted-foreground)]">
        <p className="font-medium text-[var(--color-foreground)]">Department not linked</p>
        <p className="mt-2">
          Ask an org admin to assign you to a department on the Team page and add you as a department
          admin.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={deptLabel}
        description={`${profile.displayName.split(' ')[0]} · Department overview`}
        action={
          <Button asChild size="sm">
            <Link to="/tasks/new">Create task</Link>
          </Button>
        }
      />

      <StatStrip
        items={[
          { label: 'Members', value: stats.members },
          { label: 'Open tasks', value: stats.open },
          { label: 'Overdue', value: stats.overdue },
          { label: 'Completed', value: stats.completed },
        ]}
      />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'team', label: 'Team' },
          { id: 'tasks', label: 'Tasks' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {myAssignedOpen.length > 0 ? (
            <section className="lg:col-span-2">
              <h3 className="mb-2 text-sm font-medium">Assigned to me</h3>
              <TaskTable tasks={myAssignedOpen} usersById={nameById} compact />
            </section>
          ) : null}
          <section>
            <h3 className="mb-2 text-sm font-medium">Needs attention</h3>
            <TaskTable tasks={attentionTasks} usersById={nameById} compact />
          </section>
          <section>
            <h3 className="mb-2 text-sm font-medium">Upcoming deadlines</h3>
            <TaskTable tasks={upcoming} usersById={nameById} compact />
          </section>
          <section className="lg:col-span-2">
            <h3 className="mb-2 text-sm font-medium">Recent activity</h3>
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity.</p>
            ) : (
              <ul className="divide-y rounded-md border border-[var(--color-border)]">
                {activity.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={`/tasks/${item.taskId}`}
                      className="flex justify-between gap-3 px-3 py-2 text-sm hover:bg-[var(--color-muted)]/40"
                    >
                      <span>{item.label}</span>
                      <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                        {format(item.at, 'MMM d, h:mm a')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === 'team' ? (
        <div className="space-y-3">
          <Input
            placeholder="Search team…"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="max-w-sm"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
                <TableHead className="text-right">Done</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberRows.map(({ member, pending, completed, overdue }) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <p className="font-medium">{member.displayName}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatUserRole(member.role)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pending}</TableCell>
                  <TableCell className="text-right tabular-nums text-[var(--color-destructive)]">
                    {overdue}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{completed}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/team/${member.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search tasks…"
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              className="max-w-xs"
            />
            <select
              className="h-10 rounded-md border border-[var(--color-input)] bg-[var(--color-card)] px-3 text-sm"
              value={taskStatus}
              onChange={(e) => setTaskStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Open</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <TaskTable tasks={filteredTasks} usersById={nameById} compact />
        </div>
      ) : null}
    </div>
  )
}
