import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { PresenceProvider } from '@/contexts/PresenceContext'
import { Layout } from '@/components/layout/Layout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Loader2 } from 'lucide-react'

// Code-split routes for optimal bundle size
const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const TeacherTasksPage = lazy(() =>
  import('@/pages/tasks/TeacherTasksPage').then((m) => ({ default: m.TeacherTasksPage }))
)
const AdminTasksPage = lazy(() =>
  import('@/pages/admin/AdminTasksPage').then((m) => ({ default: m.AdminTasksPage }))
)
const ChatPage = lazy(() => import('@/pages/chat/ChatPage').then((m) => ({ default: m.ChatPage })))
const DriveHubPage = lazy(() =>
  import('@/pages/drive/DriveHubPage').then((m) => ({ default: m.DriveHubPage }))
)
const UserManagementPage = lazy(() =>
  import('@/pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage }))
)
const GroupManagementPage = lazy(() =>
  import('@/pages/admin/GroupManagementPage').then((m) => ({ default: m.GroupManagementPage }))
)
const ActivityLogsPage = lazy(() =>
  import('@/pages/admin/ActivityLogsPage').then((m) => ({ default: m.ActivityLogsPage }))
)
const ProfileSettingsPage = lazy(() =>
  import('@/pages/settings/ProfileSettingsPage').then((m) => ({ default: m.ProfileSettingsPage }))
)
const AnnouncementFeedPage = lazy(() =>
  import('@/pages/feed/AnnouncementFeedPage').then((m) => ({ default: m.AnnouncementFeedPage }))
)
const TaskOverviewPage = lazy(() =>
  import('@/pages/admin/TaskOverviewPage').then((m) => ({ default: m.TaskOverviewPage }))
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage }))
)

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
  </div>
)

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PresenceProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Route: Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes: App Shell */}
            <Route path="/" element={<Layout />}>
              <Route
                index
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />

              {/* Personal Task Dashboard Route (ข้อ 17) */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Teacher & Staff Tasks Route */}
              <Route
                path="tasks"
                element={
                  <ProtectedRoute>
                    <TeacherTasksPage />
                  </ProtectedRoute>
                }
              />

              {/* Internal School Chat Route */}
              <Route
                path="chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />

              {/* School Drive Resources Route */}
              <Route
                path="drive"
                element={
                  <ProtectedRoute>
                    <DriveHubPage />
                  </ProtectedRoute>
                }
              />

              {/* User Profile & Security Settings */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute>
                    <ProfileSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Announcements Feed Route */}
              <Route
                path="announcements"
                element={
                  <ProtectedRoute>
                    <AnnouncementFeedPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin-Only Protected Routes */}
              <Route
                path="admin/overview"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <TaskOverviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/tasks"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminTasksPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/groups"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <GroupManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/logs"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ActivityLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
        </BrowserRouter>
      </PresenceProvider>
    </AuthProvider>
  )
}

export default App
