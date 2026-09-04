import React, { useState, useEffect, useCallback } from 'react'
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Users,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { UserGroup } from '@/types/index'
import type { ProfileWithGroup } from '@/types/auth.types'
import {
  fetchGroups,
  fetchUsers,
  createGroup,
  updateGroup,
  deleteGroup,
} from '@/services/userService'

export const GroupManagementPage: React.FC = () => {
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [users, setUsers] = useState<ProfileWithGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [targetGroup, setTargetGroup] = useState<UserGroup | null>(null)
  const [groupNameInput, setGroupNameInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const loadData = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchGroups(), fetchUsers()]).then(([groupsRes, usersRes]) => {
      if (groupsRes.data) setGroups(groupsRes.data)
      if (usersRes.data) setUsers(usersRes.data)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([fetchGroups(), fetchUsers()]).then(([groupsRes, usersRes]) => {
      if (isMounted) {
        if (groupsRes.data) setGroups(groupsRes.data)
        if (usersRes.data) setUsers(usersRes.data)
        setIsLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Map teacher counts per group
  const teacherCountByGroup = React.useMemo(() => {
    const map: Record<string, number> = {}
    users.forEach((u) => {
      if (u.group_id) {
        map[u.group_id] = (map[u.group_id] || 0) + 1
      }
    })
    return map
  }, [users])

  const handleOpenCreateModal = () => {
    setGroupNameInput('')
    setFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const clean = groupNameInput.trim()
    if (!clean) {
      setFormError('กรุณาระบุชื่อกลุ่มสาระการเรียนรู้')
      return
    }

    setIsSubmitting(true)
    const res = await createGroup(clean)
    setIsSubmitting(false)

    if (res.success) {
      setIsCreateModalOpen(false)
      setFeedback({ type: 'success', message: `เพิ่มกลุ่มสาระฯ "${clean}" เรียบร้อยแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถเพิ่มกลุ่มสาระฯ ได้')
    }
  }

  const handleOpenEditModal = (g: UserGroup) => {
    setTargetGroup(g)
    setGroupNameInput(g.name)
    setFormError(null)
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetGroup) return
    setFormError(null)

    const clean = groupNameInput.trim()
    if (!clean) {
      setFormError('กรุณาระบุชื่อกลุ่มสาระการเรียนรู้')
      return
    }

    setIsSubmitting(true)
    const res = await updateGroup(targetGroup.id, clean)
    setIsSubmitting(false)

    if (res.success) {
      setIsEditModalOpen(false)
      setFeedback({ type: 'success', message: `แก้ไขชื่อกลุ่มสาระฯ เป็น "${clean}" เรียบร้อยแล้ว` })
      loadData()
    } else {
      setFormError(res.error || 'ไม่สามารถแก้ไขกลุ่มสาระฯ ได้')
    }
  }

  const handleDeleteGroup = async (g: UserGroup) => {
    const count = teacherCountByGroup[g.id] || 0
    if (count > 0) {
      setFeedback({
        type: 'error',
        message: `ไม่สามารถลบกลุ่ม "${g.name}" ได้ เนื่องจากมีคุณครูสังกัดอยู่จำนวน ${count} ท่าน`,
      })
      return
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่มสาระฯ "${g.name}"?`)) return

    const res = await deleteGroup(g.id)
    if (res.success) {
      setFeedback({ type: 'success', message: `ลบกลุ่มสาระฯ "${g.name}" สำเร็จ` })
      loadData()
    } else {
      setFeedback({ type: 'error', message: res.error || 'ไม่สามารถลบกลุ่มได้' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FolderTree className="h-6 w-6 text-purple-600" />
            <span>กลุ่มสาระการเรียนรู้และฝ่ายงาน</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            กำหนดโครงสร้างกลุ่มสาระฯ สำหรับจัดสรรภาระงานและคุณครูในโรงเรียน
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-purple-600/15 hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>เพิ่มกลุ่มสาระฯ ใหม่</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer ml-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Group Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดข้อมูลกลุ่มสาระฯ...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <FolderTree className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">ยังไม่มีกลุ่มสาระการเรียนรู้</p>
          <p className="text-xs text-slate-500 mt-1">กดปุ่ม "เพิ่มกลุ่มสาระฯ ใหม่" ด้านบนเพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => {
            const count = teacherCountByGroup[g.id] || 0

            return (
              <div
                key={g.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900 tracking-tight">{g.name}</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(g)}
                        title="แก้ไขชื่อกลุ่ม"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g)}
                        title={count > 0 ? 'ไม่สามารถลบได้เนื่องจากมีครูสังกัดอยู่' : 'ลบกลุ่มสาระฯ'}
                        disabled={count > 0}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          count > 0
                            ? 'border-slate-200 bg-slate-50 text-slate-300'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-red-600 hover:border-red-300 hover:bg-red-50'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>ครูสังกัดในกลุ่ม: </span>
                    <strong className="text-slate-900 font-semibold">{count} ท่าน</strong>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  สร้างเมื่อ: {new Date(g.created_at).toLocaleDateString('th-TH')}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal: Create Group */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-purple-600" />
                <span>เพิ่มกลุ่มสาระการเรียนรู้</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อกลุ่มสาระฯ หรือฝ่ายงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  placeholder="เช่น วิทยาการคำนวณและหุ่นยนต์"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกกลุ่มสาระฯ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Group */}
      {isEditModalOpen && targetGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-purple-600" />
                <span>แก้ไขชื่อกลุ่มสาระการเรียนรู้</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  ชื่อกลุ่มสาระฯ หรือฝ่ายงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-purple-600/20 hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
                    </>
                  ) : (
                    <span>บันทึกการแก้ไข</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
