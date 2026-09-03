import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Key,
  ShieldAlert,
  Power,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { ProfileWithGroup } from '@/types/auth.types'
import type { UserGroup, UserRole } from '@/types/index'
import {
  fetchUsers,
  fetchGroups,
  createUser,
  resetPassword,
  toggleUserActive,
  deleteUser,
} from '@/services/userService'

export const UserManagementPage: React.FC = () => {
  const { user: currentUser } = useAuth()

  const [users, setUsers] = useState<ProfileWithGroup[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [targetUser, setTargetUser] = useState<ProfileWithGroup | null>(null)

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form states
  const [newUsername, setNewUsername] = useState('')
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('teacher')
  const [newGroupId, setNewGroupId] = useState<string>('')
  const [newPassword, setNewPassword] = useState('School@2026')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Reset password form state
  const [resetPassValue, setResetPassValue] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  const loadData = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchUsers(), fetchGroups()]).then(([usersRes, groupsRes]) => {
      if (usersRes.data) {
        setUsers(usersRes.data)
      } else if (usersRes.error) {
        setFeedback({ type: 'error', message: `โหลดรายชื่อไม่สำเร็จ: ${usersRes.error}` })
      }

      if (groupsRes.data) {
        setGroups(groupsRes.data)
      }

      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([fetchUsers(), fetchGroups()]).then(([usersRes, groupsRes]) => {
      if (isMounted) {
        if (usersRes.data) {
          setUsers(usersRes.data)
        } else if (usersRes.error) {
          setFeedback({ type: 'error', message: `โหลดรายชื่อไม่สำเร็จ: ${usersRes.error}` })
        }

        if (groupsRes.data) {
          setGroups(groupsRes.data)
        }

        setIsLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())

      const matchGroup =
        selectedGroupFilter === 'all' ||
        (selectedGroupFilter === 'none' ? !u.group_id : u.group_id === selectedGroupFilter)

      const matchStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' ? u.active : !u.active)

      return matchSearch && matchGroup && matchStatus
    })
  }, [users, searchQuery, selectedGroupFilter, selectedStatusFilter])

  // Summary counts
  const totalCount = users.length
  const activeCount = users.filter((u) => u.active).length
  const inactiveCount = users.filter((u) => !u.active).length

  // Handlers
  const handleOpenCreateModal = () => {
    setNewUsername('')
    setNewName('')
    setNewRole('teacher')
    setNewGroupId('')
    setNewPassword('School@2026')
    setFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const cleanUsername = newUsername.trim().toLowerCase()
    const cleanName = newName.trim()

    if (!cleanUsername || !cleanName || !newPassword) {
      setFormError('กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return
    }

    if (newPassword.length < 6) {
      setFormError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setIsSubmitting(true)

    const res = await createUser({
      username: cleanUsername,
      name: cleanName,
      role: newRole,
      group_id: newGroupId || null,
      password: newPassword,
    })

    setIsSubmitting(false)

    if (res.success) {
      setIsCreateModalOpen(false)
      setFeedback({ type: 'success', message: `สร้างบัญชีสำหรับ ${cleanName} สำเร็จแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถสร้างบัญชีได้')
    }
  }

  const handleOpenResetModal = (u: ProfileWithGroup) => {
    setTargetUser(u)
    setResetPassValue('')
    setFormError(null)
    setIsResetModalOpen(true)
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetUser) return
    setFormError(null)

    if (!resetPassValue || resetPassValue.length < 6) {
      setFormError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร')
      return
    }

    setIsSubmitting(true)
    const res = await resetPassword(targetUser.id, resetPassValue)
    setIsSubmitting(false)

    if (res.success) {
      setIsResetModalOpen(false)
      setFeedback({ type: 'success', message: `รีเซ็ตรหัสผ่านของ ${targetUser.name} สำเร็จแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถรีเซ็ตรหัสผ่านได้')
    }
  }

  const handleToggleActive = async (u: ProfileWithGroup) => {
    if (u.id === currentUser?.id) {
      setFeedback({ type: 'error', message: 'ไม่สามารถระงับบัญชีของตนเองได้' })
      return
    }

    const newActiveState = !u.active
    const confirmMessage = newActiveState
      ? `ต้องการเปิดใช้งานบัญชีของคุณครู ${u.name} หรือไม่?`
      : `ต้องการระงับการใช้งานบัญชีของคุณครู ${u.name} หรือไม่? (ครูจะไม่สามารถเข้าสู่ระบบได้)`

    if (!window.confirm(confirmMessage)) return

    const res = await toggleUserActive(u.id, newActiveState)
    if (res.success) {
      setFeedback({
        type: 'success',
        message: newActiveState ? `เปิดใช้งานบัญชี ${u.name} แล้ว` : `ระงับบัญชี ${u.name} แล้ว`,
      })
      loadData()
    } else {
      setFeedback({ type: 'error', message: res.error || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ' })
    }
  }

  const handleOpenDeleteModal = (u: ProfileWithGroup) => {
    if (u.id === currentUser?.id) {
      setFeedback({ type: 'error', message: 'ไม่สามารถลบบัญชีของตนเองได้' })
      return
    }
    setTargetUser(u)
    setFormError(null)
    setIsDeleteModalOpen(true)
  }

  const handleDeleteSubmit = async () => {
    if (!targetUser) return
    setIsSubmitting(true)
    const res = await deleteUser(targetUser.id)
    setIsSubmitting(false)

    if (res.success) {
      setIsDeleteModalOpen(false)
      setFeedback({ type: 'success', message: `ลบบัญชี ${targetUser.name} เรียบร้อยแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถลบบัญชีได้')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-6 w-6 text-blue-400" />
            <span>จัดการข้อมูลครูและบุคลากร</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            สร้างบัญชีครูใหม่ กำหนดกลุ่มสาระการเรียนรู้ และจัดการสิทธิ์การเข้าใช้งานระบบ
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>เพิ่มคุณครูใหม่</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white cursor-pointer ml-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">บุคลากรทั้งหมด</p>
          <p className="text-2xl font-bold text-white mt-1">{totalCount} <span className="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">กำลังใช้งาน (Active)</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeCount} <span className="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">ถูกระงับสิทธิ์</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{inactiveCount} <span className="text-xs font-normal text-slate-400">คน</span></p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-400">กลุ่มสาระการเรียนรู้</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{groups.length} <span className="text-xs font-normal text-slate-400">กลุ่ม</span></p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ-นามสกุล หรือ Username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Group Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500 shrink-0 hidden sm:block" />
            <select
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">ทุกกลุ่มสาระการเรียนรู้</option>
              <option value="none">ยังไม่ระบุกลุ่มสาระ</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="active">กำลังใช้งาน</option>
              <option value="inactive">ถูกระงับสิทธิ์</option>
            </select>
          </div>
        </div>
      </div>

      {/* Teachers Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs text-slate-400">กำลังโหลดรายชื่อบุคลากร...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-10 w-10 text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-300">ไม่พบรายชื่อที่ค้นหา</p>
            <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหาหรือเพิ่มคุณครูใหม่เข้าสู่ระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-xs font-medium text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">ชื่อ-นามสกุล</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">กลุ่มสาระการเรียนรู้</th>
                  <th className="px-4 py-3.5">บทบาท</th>
                  <th className="px-4 py-3.5">สถานะ</th>
                  <th className="px-4 py-3.5">เข้าใช้งานล่าสุด</th>
                  <th className="px-4 py-3.5 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <span>{u.name}</span>
                          {u.id === currentUser?.id && (
                            <span className="ml-2 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300 font-normal">
                              คุณ
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{u.username}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {u.user_groups?.name ? (
                        <span className="inline-flex rounded-full bg-slate-800 px-2.5 py-0.5 text-slate-200">
                          {u.user_groups.name}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">ไม่ระบุกลุ่ม</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium ${
                          u.role === 'admin'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {u.role === 'admin' && <Shield className="h-3 w-3" />}
                        {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณครู'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.active ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          <span>ปกติ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                          <span>ระงับสิทธิ์</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {u.last_seen ? new Date(u.last_seen).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Reset Password */}
                        <button
                          onClick={() => handleOpenResetModal(u)}
                          title="รีเซ็ตรหัสผ่าน"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 hover:bg-amber-500/10 transition-colors cursor-pointer"
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>

                        {/* Toggle Active */}
                        <button
                          onClick={() => handleToggleActive(u)}
                          title={u.active ? 'ระงับการใช้งาน' : 'เปิดใช้งาน'}
                          disabled={u.id === currentUser?.id}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            u.active
                              ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleOpenDeleteModal(u)}
                          title="ลบบัญชี"
                          disabled={u.id === currentUser?.id}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* Modal: Create User */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-400" />
                <span>เพิ่มคุณครู / บุคลากรใหม่</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อผู้ใช้งาน (Username) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value.toLowerCase())}
                  placeholder="เช่น teacher05"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">พิมพ์ตัวพิมพ์เล็กทั้งหมด ไม่มีช่องว่าง</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น ครูสมชาย ใจดี"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    บทบาท (Role)
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="teacher">คุณครู (Teacher)</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    กลุ่มสาระการเรียนรู้
                  </label>
                  <select
                    value={newGroupId}
                    onChange={(e) => setNewGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- ไม่ระบุกลุ่ม --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  รหัสผ่านเริ่มต้น <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-3.5 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>สร้างบัญชีผู้ใช้</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Reset Password */}
      {/* ===================================================================== */}
      {isResetModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-400" />
                <span>รีเซ็ตรหัสผ่าน</span>
              </h2>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">
                <p>
                  กำลังตั้งรหัสผ่านใหม่สำหรับคุณครู: <strong className="text-white">{targetUser.name}</strong>
                </p>
                <p className="text-slate-500 mt-0.5">Username: {targetUser.username}</p>
              </div>

              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  รหัสผ่านใหม่ <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetPassValue}
                    onChange={(e) => setResetPassValue(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-3.5 pr-10 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-600/20 hover:bg-amber-500 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>เปลี่ยนรหัสผ่าน</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Delete User Confirmation */}
      {/* ===================================================================== */}
      {isDeleteModalOpen && targetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white">ยืนยันการลบบัญชีผู้ใช้</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              คุณต้องการลบบัญชีของคุณครู <strong className="text-white">{targetUser.name}</strong> ({targetUser.username}) หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ ข้อมูลโปรไฟล์และสิทธิ์การเข้าใช้งานจะถูกลบออกจากระบบอย่างถาวร
            </p>

            {formError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 mb-4">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSubmit}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-600/20 hover:bg-red-500 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>กำลังลบ...</span>
                  </>
                ) : (
                  <span>ยืนยันลบบัญชี</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
