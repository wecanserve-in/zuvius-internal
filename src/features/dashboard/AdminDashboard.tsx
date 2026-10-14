import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatStrip } from '@/components/common/StatStrip'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/AuthContext'
import { TaskTable } from '@/features/tasks/TaskTable'
import { hasMinRole } from '@/lib/permissions'
import { listDepartments } from '@/services/departments.service'
import { isTaskOverdue, isTaskPending, subscribeAllTasks } from '@/services/tasks.service'
import { listActiveUsers } from '@/services/users.service'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Department, Task } from '@/types'

export function AdminDashboard() {
  const { profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [employees, setEmployees] = useState(0)
  const [departmentCount, setDepartmentCount] = useState(0)
  const [departmentList, setDepartmentList] = useState<Department[]>([])
  const isSuper = profile && profile.role === 'super_admin'

  useEffect(() => subscribeAllTasks(setTasks), [])
  useEffect(() => {
    void listActiveUsers().then((u) => setEmployees(u.length))
    void listDepartments().then((d) => {
      setDepartmentCount(d.length)
      setDepartmentList(d)
    })
  }, [])

  const stats = useMemo(() => {
    const open = tasks.filter(isTaskPending).length
    const overdue = tasks.filter((t) => isTaskOverdue(t)).length
    const completed = tasks.filter((t) => t.status === 'completed').length
    return { open, overdue, completed }
  }, [tasks])

  const overdueList = useMemo(
    () => tasks.filter((t) => isTaskOverdue(t)).slice(0, 10),
    [tasks],
  )

  const deptSummary = useMemo(() => {
    return departmentList.map((d) => {
      const deptTasks = tasks.filter((t) => t.departmentId === d.id)
      return {
        id: d.id,
        name: d.name,
        open: deptTasks.filter(isTaskPending).length,
        overdue: deptTasks.filter((t) => isTaskOverdue(t)).length,
      }
    })
  }, [departmentList, tasks])

  if (!profile || !hasMinRole(profile, 'admin')) return null

  return (
    <div className="space-y-3">
      <PageHeader
        compact
        title={isSuper ? 'Organization' : 'Operations'}
        description="Tasks and people at a glance"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/team">Team</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/tasks/new">Create task</Link>
            </Button>
          </div>
        }
      />
      <StatStrip
        items={[
          ...(isSuper
            ? [
                { label: 'Employees', value: employees },
                { label: 'Departments', value: departmentCount, href: '/departments' },
              ]
            : []),
          { label: 'Open tasks', value: stats.open, href: '/tasks?tab=pending' },
          { label: 'Overdue', value: stats.overdue, href: '/tasks?tab=overdue' },
          { label: 'Completed', value: stats.completed, href: '/tasks?tab=completed' },
        ]}
      />
      {isSuper ? (
        <section>
          <h3 className="mb-2 text-sm font-medium">By department</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Open</TableHead>
                <TableHead className="text-right">Overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deptSummary.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.overdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ) : null}
      <section>
        <h3 className="mb-2 text-sm font-medium">Overdue tasks</h3>
        <TaskTable tasks={overdueList} />
      </section>
    </div>
  )
}
