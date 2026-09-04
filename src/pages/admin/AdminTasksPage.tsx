import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Printer,
  ListTodo,
  Search,
  FolderOpen,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, UserGroup, SubtaskItem } from '@/types/index'
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
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false)
  const [activeTaskForReview, setActiveTaskForReview] = useState<AdminTaskItem | null>(null)
  const [submissions, setSubmissions] = useState<TaskSubmissionItem[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)

  // Review modal checklist filter
  const [reviewFilter, setReviewFilter] = useState<'all' | 'submitted' | 'pending'>('all')
  const [reviewSearch, setReviewSearch] = useState('')

  // Create Task Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedRole, setAssignedRole] = useState<'all' | 'group' | 'specific'>('all')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [driveFolderUrl, setDriveFolderUrl] = useState('https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i')
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>([])
  const [newSubtaskInput, setNewSubtaskInput] = useState('')
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
    setDriveFolderUrl('https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i')
    setSubtasks([])
    setNewSubtaskInput('')
    setFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleAddSubtask = () => {
    const text = newSubtaskInput.trim()
    if (!text) return
    const newId = 'st_' + Date.now() + Math.random().toString(36).substring(2, 5)
    setSubtasks((prev) => [...prev, { id: newId, title: text }])
    setNewSubtaskInput('')
  }

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
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
      subtasks,
      drive_folder_url: driveFolderUrl.trim() || 'https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i',
    })
    setIsSubmitting(false)

    if (res.success) {
      setIsCreateModalOpen(false)
      setFeedback({ type: 'success', message: `มอบหมายงาน "${title}" เรียบร้อยแล้ว` })
      loadTasks()
    } else {
      setFormError(res.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน')
    }
  }

  const handleDeleteTask = async (task: AdminTaskItem) => {
    if (!window.confirm(`คุณแน่ใจว่าต้องการลบภาระงาน "${task.title}" ใช่หรือไม่?`)) return
    if (!user?.id) return

    const res = await deleteTask(task.id, user.id)
    if (res.success) {
      setFeedback({ type: 'success', message: `ลบภาระงาน "${task.title}" เรียบร้อยแล้ว` })
      loadTasks()
    } else {
      setFeedback({ type: 'error', message: res.error || 'ไม่สามารถลบภาระงานได้' })
    }
  }

  const handleOpenReviewModal = async (task: AdminTaskItem) => {
    setActiveTaskForReview(task)
    setIsReviewModalOpen(true)
    setIsLoadingSubmissions(true)
    setReviewFilter('all')
    setReviewSearch('')

    const res = await fetchTaskSubmissions(task.id)
    if (res.data) {
      setSubmissions(res.data)
      const initialFeedback: Record<string, string> = {}
      res.data.forEach((sub) => {
        if (sub.feedback) {
          initialFeedback[sub.id] = sub.feedback
        }
      })
      setReviewFeedback(initialFeedback)
    }
    setIsLoadingSubmissions(false)
  }

  const handleReview = async (assignmentId: string, status: 'approved' | 'rejected') => {
    if (!user?.id) return
    setReviewingId(assignmentId)

    const fb = reviewFeedback[assignmentId] || ''
    const res = await reviewSubmission(assignmentId, status, fb, user.id)
    setReviewingId(null)

    if (res.success) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === assignmentId ? { ...s, status, feedback: fb } : s))
      )
      loadTasks()
    } else {
      alert(res.error || 'เกิดข้อผิดพลาดในการตรวจรับงาน')
    }
  }

  const toggleTeacherSelection = (teacherId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(teacherId) ? prev.filter((id) => id !== teacherId) : [...prev, teacherId]
    )
  }

  // Filtered submissions in checklist
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const isSubmitted = sub.status === 'submitted' || sub.status === 'approved'
      if (reviewFilter === 'submitted' && !isSubmitted) return false
      if (reviewFilter === 'pending' && isSubmitted) return false

      if (reviewSearch.trim()) {
        const query = reviewSearch.toLowerCase()
        const teacher = sub.profiles
        const matchName = teacher?.name.toLowerCase().includes(query)
        const matchGroup = teacher?.user_groups?.name?.toLowerCase().includes(query)
        return matchName || matchGroup
      }

      return true
    })
  }, [submissions, reviewFilter, reviewSearch])

  // Checklist counts
  const totalAssigned = submissions.length
  const submittedCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'approved').length
  const approvedCount = submissions.filter((s) => s.status === 'approved').length
  const pendingCount = totalAssigned - submittedCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="h-6 w-6 text-purple-600" />
            <span>จัดการและมอบหมายภาระงานโรงเรียน</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้างภาระงาน กำหนดงานย่อย ตรวจรับผลงาน Checklist และส่งออกรายงานความคืบหน้า
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer self-start sm:self-auto"
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

      {/* Tasks Table / Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดรายการภาระงาน...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">ยังไม่มีการมอบหมายภาระงาน</p>
          <p className="text-xs text-slate-500 mt-1">กดปุ่ม "มอบหมายงานใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const stats = task.stats || { total: 0, submitted: 0, approved: 0, pending: 0, progressPercent: 0 }
            const subtasksList = (task.subtasks as unknown as SubtaskItem[]) || []

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          task.priority === 'urgent'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : task.priority === 'high'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {task.priority === 'urgent' ? 'ด่วนที่สุด' : task.priority === 'high' ? 'ด่วน' : 'ปกติ'}
                      </span>
                      {task.user_groups?.name && (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded font-medium">
                          กลุ่ม: {task.user_groups.name}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task)}
                      title="ลบภาระงาน"
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{task.title}</h3>

                  {task.description && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Subtasks summary */}
                  {subtasksList.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
                      <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
                      <span>มีงานย่อย: {subtasksList.length} รายการ</span>
                    </div>
                  )}

                  {/* Drive Folder Link */}
                  <div className="mt-2 flex items-center gap-1 text-[11px]">
                    <a
                      href={task.drive_folder_url || 'https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <FolderOpen className="h-3 w-3" />
                      <span>โฟลเดอร์ Google Drive ประจำงาน</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">ความคืบหน้าการส่งงาน:</span>
                      <span className="text-slate-900 font-bold">
                        {stats.submitted + stats.approved}/{stats.total} ท่าน ({stats.progressPercent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
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
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-purple-500"></span> รอตรวจ: {stats.submitted}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> อนุมัติ: {stats.approved}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-slate-300"></span> ยังไม่ส่ง: {stats.pending}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {task.due_date ? `กำหนดส่ง: ${new Date(task.due_date).toLocaleDateString('th-TH')}` : 'ไม่มีกำหนดส่ง'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenReviewModal(task)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <span>ตรวจรับงาน & Checklist ({stats.submitted})</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Create Task with Subtasks */}
      {/* ===================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                <span>มอบหมายภาระงานโรงเรียนใหม่</span>
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
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  หัวข้อภาระงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ส่งแผนการจัดการเรียนรู้ ภาคเรียนที่ 1/2569"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  รายละเอียด / คำชี้แจง
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเอกสารที่ต้องจัดเตรียม หรือคำแนะนำเพิ่มเติม..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Subtasks Section (Fix #12) */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-indigo-600" />
                  <span>กำหนดรายการงานย่อย (Subtasks):</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  สามารถเพิ่มรายการย่อย เช่น "1. โครงสร้างรายวิชา", "2. ตารางสอน" เพื่อให้ครูตรวจสอบ
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskInput}
                    onChange={(e) => setNewSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSubtask()
                      }
                    }}
                    placeholder="พิมพ์ชื่องานย่อยแล้วกดเพิ่ม..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    + เพิ่มงานย่อย
                  </button>
                </div>

                {subtasks.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {subtasks.map((st, idx) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>{st.title}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-slate-400 hover:text-red-600 p-0.5"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment Target */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  กลุ่มเป้าหมายที่มอบหมาย <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignedRole('all')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      assignedRole === 'all'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    ครูทุกคน
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignedRole('group')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      assignedRole === 'group'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    ตามกลุ่มสาระฯ
                  </button>

                  <button
                    type="button"
                    onClick={() => setAssignedRole('specific')}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                      assignedRole === 'specific'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    เลือกรายบุคคล
                  </button>
                </div>
              </div>

              {/* Group Selector */}
              {assignedRole === 'group' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลือกกลุ่มสาระการเรียนรู้เป้าหมาย
                  </label>
                  <select
                    value={targetGroupId}
                    onChange={(e) => setTargetGroupId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    เลือกคุณครูที่มอบหมาย ({selectedTeacherIds.length} ท่าน)
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
                    {teachers.map((t) => {
                      const isSelected = selectedTeacherIds.includes(t.id)
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTeacherSelection(t.id)}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-100 text-blue-900 font-medium' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>
                            {t.name} (@{t.username})
                          </span>
                          <input type="checkbox" checked={isSelected} readOnly className="rounded text-blue-600" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Dedicated Google Drive Task Folder */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    โฟลเดอร์ Google Drive ประจำภาระงาน (สร้างโฟลเดอร์แยกงาน)
                  </label>
                  <a
                    href="https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1"
                  >
                    <FolderOpen className="h-3 w-3" />
                    <span>เปิดไดรฟ์รวมเพื่อสร้างโฟลเดอร์แยก ↗</span>
                  </a>
                </div>
                <input
                  type="url"
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  ครูจะได้รับปุ่มเปิดโฟลเดอร์นี้ในหน้าภาระงาน เพื่ออัปโหลดและส่งงานในโฟลเดอร์ของภาระงานนี้โดยตรง
                </p>
              </div>

              {/* Due Date and Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    กำหนดส่งงาน (Due Date)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    ระดับความสำคัญ
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  >
                    <option value="low">ไม่ด่วน (Low)</option>
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="high">ด่วน (High)</option>
                    <option value="urgent">ด่วนที่สุด (Urgent)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>กำลังบันทึก...</span>
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
      {/* Modal: Review Task Submissions & Checklist (Fix #9) */}
      {/* ===================================================================== */}
      {isReviewModalOpen && activeTaskForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 mb-4 gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Checklist & ตรวจรับผลงานภาระงาน</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeTaskForReview.title}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintSummaryOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="พิมพ์รายงานสรุปผลการส่งงานทางการ"
                >
                  <Printer className="h-3.5 w-3.5 text-blue-600" />
                  <span>พิมพ์รายงาน A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportTaskSubmissionsToCSV(activeTaskForReview.title, submissions)}
                  disabled={submissions.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-40"
                  title="ดาวน์โหลดรายงานสรุปการส่งงานเป็นไฟล์ Excel CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>ส่งออก CSV (Excel)</span>
                </button>

                <button
                  onClick={() => setIsReviewModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Checklist Statistics Overview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-center">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <span className="text-[11px] text-slate-500">มอบหมายทั้งหมด</span>
                <p className="text-lg font-bold text-slate-900">{totalAssigned} ท่าน</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-2.5">
                <span className="text-[11px] text-purple-700 font-medium">ส่งผลงานแล้ว</span>
                <p className="text-lg font-bold text-purple-800">{submittedCount} ท่าน</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                <span className="text-[11px] text-emerald-700 font-medium">อนุมัติแล้ว</span>
                <p className="text-lg font-bold text-emerald-800">{approvedCount} ท่าน</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <span className="text-[11px] text-amber-700 font-medium">ยังไม่ส่งงาน</span>
                <p className="text-lg font-bold text-amber-800">{pendingCount} ท่าน</p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setReviewFilter('all')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                    reviewFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ทั้งหมด ({totalAssigned})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('submitted')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                    reviewFilter === 'submitted'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ส่งแล้ว ({submittedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilter('pending')}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-colors cursor-pointer ${
                    reviewFilter === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ยังไม่ส่ง ({pendingCount})
                </button>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหาชื่อครู..."
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Checklist List */}
            {isLoadingSubmissions ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-blue-600 mb-2" />
                <p className="text-xs text-slate-500">กำลังโหลดรายการส่งงาน...</p>
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่พบคณะครูในหมวดหมู่นี้
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSubmissions.map((sub) => {
                  const teacher = sub.profiles
                  const isSubmitted = sub.status === 'submitted' || sub.status === 'approved'

                  return (
                    <div
                      key={sub.id}
                      className={`rounded-2xl border p-4 space-y-3 transition-all ${
                        sub.status === 'approved'
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : sub.status === 'submitted'
                          ? 'border-purple-200 bg-purple-50/30'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-800">
                            {teacher?.name ? teacher.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{teacher?.name}</p>
                            <p className="text-[11px] text-slate-500">
                              @{teacher?.username} {teacher?.user_groups?.name && `• ${teacher.user_groups.name}`}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-auto">
                          {sub.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 px-3 py-0.5 text-xs font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> อนุมัติแล้ว
                            </span>
                          )}
                          {sub.status === 'submitted' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 text-purple-800 px-3 py-0.5 text-xs font-semibold">
                              <Clock className="h-3.5 w-3.5 text-purple-600" /> ส่งแล้ว (รอตรวจ)
                            </span>
                          )}
                          {sub.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 text-red-800 px-3 py-0.5 text-xs font-semibold">
                              <RotateCcw className="h-3.5 w-3.5 text-red-600" /> ให้ส่งใหม่
                            </span>
                          )}
                          {sub.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 px-3 py-0.5 text-xs font-semibold">
                              ยังไม่ส่งงาน
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Submission Content */}
                      {isSubmitted ? (
                        <div className="rounded-xl bg-white p-3 text-xs space-y-2 border border-slate-200">
                          {sub.submission_note && (
                            <div>
                              <span className="text-slate-500 font-medium">บันทึกของครู: </span>
                              <span className="text-slate-900">{sub.submission_note}</span>
                            </div>
                          )}

                          {sub.submission_url && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-medium">ไฟล์/ลิงก์ผลงาน: </span>
                              <a
                                href={sub.submission_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline truncate"
                              >
                                <span className="truncate max-w-sm">{sub.submission_url}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </div>
                          )}

                          {sub.submitted_at && (
                            <p className="text-[10px] text-slate-400">
                              ส่งเมื่อ: {new Date(sub.submitted_at).toLocaleString('th-TH')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">
                          ยังไม่มีการบันทึกส่งงานในระบบ
                        </div>
                      )}

                      {/* Review Action Controls */}
                      {isSubmitted && (
                        <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            placeholder="ข้อคิดเห็น / ข้อเสนอแนะให้ครู..."
                            value={reviewFeedback[sub.id] || ''}
                            onChange={(e) =>
                              setReviewFeedback({ ...reviewFeedback, [sub.id]: e.target.value })
                            }
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={reviewingId === sub.id}
                              onClick={() => handleReview(sub.id, 'approved')}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                              <span>อนุมัติ</span>
                            </button>

                            <button
                              type="button"
                              disabled={reviewingId === sub.id}
                              onClick={() => handleReview(sub.id, 'rejected')}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>ให้ส่งใหม่</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Printable Task Summary Report (A4) */}
      {/* ===================================================================== */}
      {isPrintSummaryOpen && activeTaskForReview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-in fade-in duration-150">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-4 sm:my-8">
            {/* Action Bar */}
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white/95 backdrop-blur-md shadow-xs print:hidden">
              <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
                <Printer className="h-4 w-4 text-blue-600" />
                <span>ตัวอย่างก่อนพิมพ์: รายงานสรุปผลการส่งภาระงานราชการ</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>สั่งพิมพ์ (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintSummaryOpen(false)}
                  className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:m-0 text-xs">
              {/* Header with Sarasas Crest */}
              <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <img
                    src="/school-logo.png"
                    alt="School Emblem"
                    className="h-14 w-14 object-contain rounded-full border border-amber-300 p-0.5"
                  />
                  <div className="text-left">
                    <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                      โรงเรียนสารสาสน์วิเทศราชพฤกษ์
                    </h1>
                    <p className="text-xs text-blue-800 font-medium">
                      Sarasas Witaed Ratchaphruek School
                    </p>
                  </div>
                </div>
                <h2 className="text-base font-bold text-slate-800 mt-2">
                  รายงานสรุปผลการส่งภาระงานและแผนการสอนฝ่ายวิชาการ
                </h2>
                <p className="text-[11px] text-slate-500">
                  หัวข้อ: <strong className="text-slate-900">{activeTaskForReview.title}</strong>
                </p>
              </div>

              {/* Summary Stats Table */}
              <div className="grid grid-cols-4 gap-2 mb-6 border border-slate-300 rounded-lg p-3 bg-slate-50 text-center">
                <div>
                  <span className="text-slate-500 text-[10px]">มอบหมายทั้งหมด</span>
                  <p className="font-bold text-sm text-slate-900">{totalAssigned} ท่าน</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">ส่งผลงานแล้ว</span>
                  <p className="font-bold text-sm text-purple-700">{submittedCount} ท่าน</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">อนุมัติแล้ว</span>
                  <p className="font-bold text-sm text-emerald-700">{approvedCount} ท่าน</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">ยังไม่ส่งงาน</span>
                  <p className="font-bold text-sm text-amber-700">{pendingCount} ท่าน</p>
                </div>
              </div>

              {/* Submissions Checklist Table */}
              <table className="w-full border-collapse border border-slate-300 mb-8 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 p-2 text-center w-10">ลำดับ</th>
                    <th className="border border-slate-300 p-2 text-left">ชื่อ-นามสกุล</th>
                    <th className="border border-slate-300 p-2 text-left">กลุ่มสาระฯ</th>
                    <th className="border border-slate-300 p-2 text-center">สถานะ</th>
                    <th className="border border-slate-300 p-2 text-center">วันที่ส่ง</th>
                    <th className="border border-slate-300 p-2 text-left">ข้อคิดเห็น / หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => (
                    <tr key={sub.id} className="border-b border-slate-200">
                      <td className="border border-slate-300 p-2 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 p-2 font-medium text-slate-900">
                        {sub.profiles?.name || '-'}
                      </td>
                      <td className="border border-slate-300 p-2">
                        {sub.profiles?.user_groups?.name || '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-medium">
                        {sub.status === 'approved' && 'อนุมัติแล้ว'}
                        {sub.status === 'submitted' && 'ส่งแล้ว (รอตรวจ)'}
                        {sub.status === 'rejected' && 'ให้ส่งใหม่'}
                        {sub.status === 'pending' && 'ยังไม่ส่งงาน'}
                      </td>
                      <td className="border border-slate-300 p-2 text-center">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="border border-slate-300 p-2 text-slate-600">
                        {sub.feedback || sub.submission_note || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 text-center mt-12 pt-6">
                <div className="space-y-1">
                  <p className="mb-8 text-slate-400">ลงชื่อ..........................................................</p>
                  <p className="font-bold text-slate-900">( .......................................................... )</p>
                  <p className="text-slate-600">หัวหน้าฝ่ายวิชาการ / ผู้รวบรวม</p>
                  <p className="text-slate-400 mt-1">วันที่......../......../............</p>
                </div>

                <div className="space-y-1">
                  <p className="mb-8 text-slate-400">ลงชื่อ..........................................................</p>
                  <p className="font-bold text-slate-900">( .......................................................... )</p>
                  <p className="text-slate-600">ผู้อำนวยการโรงเรียนสารสาสน์วิเทศราชพฤกษ์</p>
                  <p className="text-slate-400 mt-1">วันที่......../......../............</p>
                </div>
              </div>
            </div>

            {/* Bottom Close */}
            <div className="border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-end print:hidden">
              <button
                type="button"
                onClick={() => setIsPrintSummaryOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
