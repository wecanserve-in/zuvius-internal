import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DepartmentsPage } from '@/features/departments/DepartmentsPage'
import { ChatPage } from '@/features/messaging/ChatPage'
import { MessagesLayout } from '@/features/messaging/MessagesLayout'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { ProjectCreatePage } from '@/features/tasks/ProjectCreatePage'
import { ProjectDetailPage } from '@/features/tasks/ProjectDetailPage'
import { TaskCreatePage } from '@/features/tasks/TaskCreatePage'
import { TaskDetailPage } from '@/features/tasks/TaskDetailPage'
import { TasksHubPage } from '@/features/tasks/TasksHubPage'
import { ProfilePage } from '@/features/users/ProfilePage'
import { TeamPage } from '@/features/users/TeamPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="messages" element={<MessagesLayout />}>
              <Route path=":conversationId" element={<ChatPage />} />
            </Route>
            <Route path="tasks" element={<TasksHubPage />} />
            <Route path="tasks/mine" element={<Navigate to="/tasks?scope=yours&tab=mine" replace />} />
            <Route path="tasks/overdue" element={<Navigate to="/tasks?scope=yours&tab=overdue" replace />} />
            <Route path="tasks/created" element={<Navigate to="/tasks?scope=yours&tab=created" replace />} />
            <Route path="tasks/department" element={<Navigate to="/tasks?scope=org" replace />} />
            <Route path="tasks/pending" element={<Navigate to="/tasks?scope=yours&tab=mine" replace />} />
            <Route path="tasks/completed" element={<Navigate to="/tasks?scope=yours&tab=completed" replace />} />
            <Route path="tasks/today" element={<Navigate to="/tasks?scope=yours&tab=today" replace />} />
            <Route path="tasks/new" element={<TaskCreatePage />} />
            <Route path="projects/new" element={<ProjectCreatePage />} />
            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
            <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="team/:userId" element={<ProfilePage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
