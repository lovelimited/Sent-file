import React, { useState, useEffect, useCallback } from 'react'
import {
  ClipboardList,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  ThumbsUp,
  RotateCcw,
  Download,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, UserGroup } from '@/types/index'
import type { ProfileWithGroup } from '@/types/auth.types'
import { fetchGroups, fetchUsers } from '@/services/userService'
import {
  fetchAdminTasks,
  fetchTaskSubmissions,
  createTask,
  deleteTask,
  reviewSubmission,
  type AdminTaskItem,
  type TaskSubmissionItem,
} from '@/services/taskService'
import { exportTaskSubmissionsToCSV } from '@/utils/exportUtils'

export const AdminTasksPage: React.FC = () => {
  const { user } = useAuth()

  const [tasks, setTasks] = useState<AdminTaskItem[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [teachers, setTeachers] = useState<ProfileWithGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [activeTaskForReview, setActiveTaskForReview] = useState<AdminTaskItem | null>(null)
  const [submissions, setSubmissions] = useState<TaskSubmissionItem[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)

  // Create Task Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedRole, setAssignedRole] = useState<'all' | 'group' | 'specific'>('all')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Review state
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const loadTasks = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchAdminTasks(), fetchGroups(), fetchUsers()]).then(
      ([tasksRes, groupsRes, usersRes]) => {
        if (tasksRes.data) setTasks(tasksRes.data)
        if (groupsRes.data) setGroups(groupsRes.data)
        if (usersRes.data) setTeachers(usersRes.data)
        setIsLoading(false)
      }
    )
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([fetchAdminTasks(), fetchGroups(), fetchUsers()]).then(
      ([tasksRes, groupsRes, usersRes]) => {
        if (isMounted) {
          if (tasksRes.data) setTasks(tasksRes.data)
          if (groupsRes.data) setGroups(groupsRes.data)
          if (usersRes.data) setTeachers(usersRes.data)
          setIsLoading(false)
        }
      }
    )
    return () => {
      isMounted = false
    }
  }, [])

  const handleOpenCreateModal = () => {
    setTitle('')
    setDescription('')
    setAssignedRole('all')
    setTargetGroupId('')
    setSelectedTeacherIds([])
    setDueDate('')
    setPriority('normal')
    setFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setFormError(null)

    if (!title.trim()) {
      setFormError('กรุณากรอกหัวข้อภาระงาน')
      return
    }

    if (assignedRole === 'group' && !targetGroupId) {
      setFormError('กรุณาเลือกกลุ่มสาระการเรียนรู้ที่ต้องการมอบหมาย')
      return
    }

    if (assignedRole === 'specific' && selectedTeacherIds.length === 0) {
      setFormError('กรุณาเลือกคุณครูอย่างน้อย 1 ท่าน')
      return
    }

    setIsSubmitting(true)
    const res = await createTask({
      title,
      description,
      assigned_to_role: assignedRole,
      target_group_id: assignedRole === 'group' ? targetGroupId : null,
      specific_teacher_ids: assignedRole === 'specific' ? selectedTeacherIds : undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      created_by: user.id,
    })
    setIsSubmitting(false)

    if (res.success) {
      setIsCreateModalOpen(false)
      setFeedback({ type: 'success', message: `มอบหมายงาน "${title}" เรียบร้อยแล้ว` })
      loadTasks()
    } else {
      setFormError(res.error || 'ไม่สามารถสร้างงานได้')
    }
  }

  const handleOpenReviewModal = async (task: AdminTaskItem) => {
    setActiveTaskForReview(task)
    setIsReviewModalOpen(true)
    setIsLoadingSubmissions(true)

    const res = await fetchTaskSubmissions(task.id)
    if (res.data) {
      setSubmissions(res.data)
    }
    setIsLoadingSubmissions(false)
  }

  const handleReviewAction = async (assignmentId: string, status: 'approved' | 'rejected') => {
    if (!user?.id) return
    const currentFeedback = reviewFeedback[assignmentId] || ''
    setReviewingId(assignmentId)

    const res = await reviewSubmission(assignmentId, status, currentFeedback, user.id)
    setReviewingId(null)

    if (res.success) {
      // update local submissions list
      setSubmissions((prev) =>
        prev.map((s) => (s.id === assignmentId ? { ...s, status, feedback: currentFeedback } : s))
      )
      loadTasks()
    } else {
      alert(res.error || 'ไม่สามารถบันทึกการตรวจงานได้')
    }
  }

  const handleDeleteTask = async (task: AdminTaskItem) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบภาระงาน "${task.title}"? การกระทำนี้จะลบการส่งงานทั้งหมดในงานนี้`))
      return

    const res = await deleteTask(task.id, user?.id)
    if (res.success) {
      setFeedback({ type: 'success', message: `ลบภาระงาน "${task.title}" สำเร็จ` })
      loadTasks()
    } else {
      setFeedback({ type: 'error', message: res.error || 'ไม่สามารถลบงานได้' })
    }
  }

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-blue-400" />
            <span>จัดการและมอบหมายภาระงานโรงเรียน</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            สร้างภาระงาน มอบหมายตามกลุ่มสาระฯ และตรวจรับผลงานของคณะครู
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>มอบหมายงานใหม่</span>
        </button>
      </div>

      {/* Feedback Alert */}
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

      {/* Tasks Table / Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-xs text-slate-400">กำลังโหลดรายการภาระงาน...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <ClipboardList className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">ยังไม่มีการมอบหมายภาระงาน</p>
          <p className="text-xs text-slate-500 mt-1">กดปุ่ม "มอบหมายงานใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const stats = task.stats || { total: 0, submitted: 0, approved: 0, pending: 0, progressPercent: 0 }

            return (
              <div
                key={task.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                          task.priority === 'urgent'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : task.priority === 'high'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {task.priority === 'urgent' ? 'ด่วนที่สุด' : task.priority === 'high' ? 'ด่วน' : 'ปกติ'}
                      </span>
                      {task.user_groups?.name && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          กลุ่ม: {task.user_groups.name}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task)}
                      title="ลบภาระงาน"
                      className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-white tracking-tight">{task.title}</h3>

                  {task.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">ความคืบหน้าการส่งงาน:</span>
                      <span className="text-white font-medium">
                        {stats.submitted + stats.approved}/{stats.total} ท่าน ({stats.progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
                        title={`อนุมัติแล้ว ${stats.approved} คน`}
                      />
                      <div
                        className="bg-purple-500 h-full transition-all duration-500"
                        style={{ width: `${stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0}%` }}
                        title={`ส่งแล้วรอตรวจ ${stats.submitted} คน`}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-purple-500"></span> รอตรวจ: {stats.submitted}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> อนุมัติแล้ว: {stats.approved}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-slate-700"></span> ยังไม่ส่ง: {stats.pending}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {task.due_date ? `กำหนดส่ง: ${new Date(task.due_date).toLocaleDateString('th-TH')}` : 'ไม่มีกำหนดส่ง'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReviewModal(task)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-colors cursor-pointer"
                  >
                    <span>ตรวจรับผลงาน ({stats.submitted})</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Create Task */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-blue-400" />
                <span>มอบหมายภาระงานโรงเรียนใหม่</span>
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
                  หัวข้อภาระงาน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ส่งแผนการจัดการเรียนรู้ ภาคเรียนที่ 1/2569"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  รายละเอียด / คำชี้แจง
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเอกสารที่ต้องจัดเตรียม ลิงก์แม่แบบ หรือคำแนะนำเพิ่มเติม..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Assignment Target */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  กลุ่มเป้าหมายที่มอบหมาย <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignedRole('all')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      assignedRole === 'all'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400'
                    }`}
                  >
                    ครูทุกคน
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignedRole('group')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      assignedRole === 'group'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400'
                    }`}
                  >
                    ตามกลุ่มสาระฯ
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignedRole('specific')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer ${
                      assignedRole === 'specific'
                        ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                        : 'border-slate-800 bg-slate-950/70 text-slate-400'
                    }`}
                  >
                    เลือกรายบุคคล
                  </button>
                </div>
              </div>

              {/* Group Selector */}
              {assignedRole === 'group' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    เลือกกลุ่มสาระการเรียนรู้เป้าหมาย
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- เลือกกลุ่มสาระฯ --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Specific Teachers Checklist */}
              {assignedRole === 'specific' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    เลือกคุณครูที่มอบหมาย ({selectedTeacherIds.length} ท่าน)
                  </label>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-2 space-y-1">
                    {teachers.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer text-xs text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTeacherIds.includes(t.id)}
                          onChange={() => toggleTeacherSelection(t.id)}
                          className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0"
                        />
                        <span>{t.name}</span>
                        <span className="text-[10px] text-slate-500">(@{t.username})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    ระดับความสำคัญ
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="high">ด่วน (High)</option>
                    <option value="urgent">ด่วนที่สุด (Urgent)</option>
                    <option value="low">ไม่ด่วน (Low)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    กำหนดส่งงาน (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
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
                      <span>กำลังสร้างภาระงาน...</span>
                    </>
                  ) : (
                    <span>ยืนยันมอบหมายงาน</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Review Task Submissions */}
      {/* ===================================================================== */}
      {isReviewModalOpen && activeTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>ตรวจรับผลงานภาระงาน</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{activeTaskForReview.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportTaskSubmissionsToCSV(activeTaskForReview.title, submissions)}
                  disabled={submissions.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
                  title="ดาวน์โหลดรายงานสรุปการส่งงานเป็นไฟล์ Excel CSV"
                >
                  <Download className="h-3.5 w-3.5 text-blue-400" />
                  <span>ส่งออก CSV</span>
                </button>
                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {isLoadingSubmissions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-blue-500 mb-2" />
                <p className="text-xs text-slate-400">กำลังโหลดรายการส่งงาน...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                ไม่มีครูได้รับมอบหมายงานนี้
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => {
                  const teacher = sub.profiles
                  const isSubmitted = sub.status === 'submitted' || sub.status === 'approved'

                  return (
                    <div
                      key={sub.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                            {teacher?.name ? teacher.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{teacher?.name}</p>
                            <p className="text-[11px] text-slate-400">
                              @{teacher?.username} {teacher?.user_groups?.name && `• ${teacher.user_groups.name}`}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-auto">
                          {sub.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-0.5 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" /> อนุมัติแล้ว
                            </span>
                          )}
                          {sub.status === 'submitted' && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400 px-2.5 py-0.5 text-xs font-medium">
                              <Clock className="h-3.5 w-3.5" /> ส่งแล้ว (รอตรวจ)
                            </span>
                          )}
                          {sub.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 rounded bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-0.5 text-xs font-medium">
                              <RotateCcw className="h-3.5 w-3.5" /> ให้ส่งใหม่
                            </span>
                          )}
                          {sub.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 rounded bg-slate-800 text-slate-400 px-2.5 py-0.5 text-xs">
                              ยังไม่ส่งงาน
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submission Content */}
                      {isSubmitted ? (
                        <div className="rounded-lg bg-slate-900/90 p-3 text-xs space-y-2 border border-slate-800/80">
                          {sub.submission_note && (
                            <div>
                              <span className="text-slate-400 font-medium">บันทึกของครู: </span>
                              <span className="text-slate-200">{sub.submission_note}</span>
                            </div>
                          )}

                          {sub.submission_url && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 font-medium">ลิงก์ผลงาน: </span>
                              <a
                                href={sub.submission_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                              >
                                <span className="truncate max-w-xs">{sub.submission_url}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}

                          {sub.submitted_at && (
                            <p className="text-[10px] text-slate-500">
                              ส่งเมื่อ: {new Date(sub.submitted_at).toLocaleString('th-TH')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">คุณครูยังไม่ได้ส่งผลงาน</p>
                      )}

                      {/* Feedback & Actions */}
                      <div className="pt-2 border-t border-slate-900 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
                        <div className="w-full sm:w-2/3">
                          <input
                            type="text"
                            placeholder="พิมพ์ข้อคิดเห็น / คำแนะนำ..."
                            value={reviewFeedback[sub.id] !== undefined ? reviewFeedback[sub.id] : sub.feedback || ''}
                            onChange={(e) =>
                              setReviewFeedback({ ...reviewFeedback, [sub.id]: e.target.value })
                            }
                            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            onClick={() => handleReviewAction(sub.id, 'rejected')}
                            disabled={reviewingId === sub.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 cursor-pointer disabled:opacity-50"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>ให้ส่งใหม่</span>
                          </button>

                          <button
                            onClick={() => handleReviewAction(sub.id, 'approved')}
                            disabled={reviewingId === sub.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>อนุมัติ</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
