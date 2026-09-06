import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  FileText,
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
import { getMasterDriveUrl } from '@/services/driveService'
import { showConfirm, showSuccess, showError } from '@/utils/sweetalert'

const CATEGORIES = [
  'แผนการจัดการเรียนรู้',
  'รายงานผลการปฏิบัติงาน (PA)',
  'วิจัยในชั้นเรียนและนวัตกรรม',
  'เอกสารวัดผลและวิชาการ',
  'เกียรติบัตรและผลงาน',
  'แบบฟอร์มโรงเรียน',
  'งานธุรการและบริหารทั่วไป',
  'ภาระงานทั่วไป',
]

const SUBTASK_PRESETS = [
  'แผนการจัดการเรียนรู้ สัปดาห์ที่ 1-4',
  'แผนการจัดการเรียนรู้ สัปดาห์ที่ 5-8',
  'แผนการจัดการเรียนรู้ สัปดาห์ที่ 9-12',
  'ใบงานและแบบฝึกหัดประกอบการสอน',
  'บันทึกผลหลังการจัดการเรียนรู้',
  'แบบประเมินผลการเรียนรู้รายบุคคล',
]

export const AdminTasksPage: React.FC = () => {
  const { user } = useAuth()

  const [tasks, setTasks] = useState<AdminTaskItem[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [teachers, setTeachers] = useState<ProfileWithGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters for task cards
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false)
  const [activeTaskForReview, setActiveTaskForReview] = useState<AdminTaskItem | null>(null)
  const [submissions, setSubmissions] = useState<TaskSubmissionItem[]>([])
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false)

  // Review modal checklist filter
  const [reviewFilter, setReviewFilter] = useState<'all' | 'submitted' | 'approved' | 'pending'>('all')
  const [reviewSearch, setReviewSearch] = useState('')

  // Create Task Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedRole, setAssignedRole] = useState<'all' | 'group' | 'specific'>('all')
  const [targetGroupId, setTargetGroupId] = useState('')
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [taskCategory, setTaskCategory] = useState<string>('แผนการจัดการเรียนรู้')
  const [masterDriveUrl, setMasterDriveUrl] = useState<string>('https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i')
  const [groupSearchQuery, setGroupSearchQuery] = useState('')
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [subtasks, setSubtasks] = useState<{ id: string; title: string }[]>([])
  const [newSubtaskInput, setNewSubtaskInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Review state
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({})
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const loadTasks = useCallback(() => {
    setIsLoading(true)
    Promise.all([fetchAdminTasks(), fetchGroups(), fetchUsers()])
      .then(([tasksRes, groupsRes, usersRes]) => {
        if (tasksRes.data) setTasks(tasksRes.data)
        if (groupsRes.data) setGroups(groupsRes.data)
        if (usersRes.data) setTeachers(usersRes.data.filter((u) => u.role !== 'admin'))
        setIsLoading(false)
      })
      .catch((err) => {
        console.warn('[AdminTasksPage] Load tasks error:', err)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([fetchAdminTasks(), fetchGroups(), fetchUsers(), getMasterDriveUrl()])
      .then(([tasksRes, groupsRes, usersRes, dUrl]) => {
        if (isMounted) {
          if (tasksRes.data) setTasks(tasksRes.data)
          if (groupsRes.data) setGroups(groupsRes.data)
          if (usersRes.data) setTeachers(usersRes.data)
          if (dUrl) setMasterDriveUrl(dUrl)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[AdminTasksPage] Initial load error:', err)
          setIsLoading(false)
        }
      })
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
    setTaskCategory('แผนการจัดการเรียนรู้')
    getMasterDriveUrl()
      .then((url) => {
        setMasterDriveUrl(url)
      })
      .catch(() => {})
    setSubtasks([])
    setNewSubtaskInput('')
    setFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleAddSubtask = (textToAdd?: string) => {
    const text = (textToAdd || newSubtaskInput).trim()
    if (!text) return
    const newId = 'st_' + Date.now() + Math.random().toString(36).substring(2, 5)
    setSubtasks((prev) => [...prev, { id: newId, title: text }])
    if (!textToAdd) setNewSubtaskInput('')
  }

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) return
    setFormError(null)

    if (!title.trim()) {
      showError('กรุณากรอกหัวข้อภาระงาน')
      setFormError('กรุณากรอกหัวข้อภาระงาน')
      return
    }

    if (assignedRole === 'group' && !targetGroupId) {
      setTargetGroupId('all_groups')
    }

    if (assignedRole === 'specific' && selectedTeacherIds.length === 0) {
      showError('กรุณาเลือกคุณครูอย่างน้อย 1 ท่าน')
      setFormError('กรุณาเลือกคุณครูอย่างน้อย 1 ท่าน')
      return
    }

    const effectiveTargetGroupId = assignedRole === 'group' && !targetGroupId ? 'all_groups' : targetGroupId
    const targetLabel =
      assignedRole === 'all' || effectiveTargetGroupId === 'all_groups'
        ? 'ครูทุกคน (ทั้งโรงเรียน)'
        : assignedRole === 'group'
        ? `กลุ่มสาระฯ: ${groups.find((g) => g.id === effectiveTargetGroupId)?.name || 'ที่เลือก'}`
        : `คุณครู ${selectedTeacherIds.length} ท่าน`

    const confirmed = await showConfirm(
      'ยืนยันการมอบหมายภาระงาน?',
      `หัวข้องาน: "${title.trim()}"\nเป้าหมาย: ${targetLabel}\nหมวดหมู่: ${taskCategory}`,
      'ยืนยันมอบหมาย',
      'ยกเลิก'
    )
    if (!confirmed) return

    const effectiveRole = assignedRole === 'group' && effectiveTargetGroupId === 'all_groups' ? 'all' : assignedRole
    const effectiveGroupId = effectiveTargetGroupId === 'all_groups' ? null : effectiveTargetGroupId

    setIsSubmitting(true)
    const res = await createTask({
      title: title.trim(),
      description: description.trim() || undefined,
      assigned_to_role: effectiveRole,
      target_group_id: effectiveRole === 'group' ? effectiveGroupId : null,
      specific_teacher_ids: effectiveRole === 'specific' ? selectedTeacherIds : undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      created_by: user.id,
      subtasks,
      drive_folder_url: masterDriveUrl,
      category: taskCategory,
    })
    setIsSubmitting(false)

    if (res.success) {
      setIsCreateModalOpen(false)
      await showSuccess('มอบหมายงานสำเร็จ', `ภาระงาน "${title.trim()}" ได้รับการจัดส่งไปยังคุณครูเป้าหมายเรียบร้อยแล้ว`)
      loadTasks()
    } else {
      showError('ไม่สามารถมอบหมายงานได้', res.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล')
      setFormError(res.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน')
    }
  }

  const handleDeleteTask = async (task: AdminTaskItem) => {
    if (!user?.id) return
    const confirmed = await showConfirm(
      'ยืนยันการลบภาระงาน?',
      `คุณแน่ใจว่าต้องการลบภาระงาน "${task.title}" ใช่หรือไม่? ข้อมูลการส่งงานของครูทั้งหมดในภาระงานนี้จะถูกลบด้วย`,
      'ลบภาระงาน',
      'ยกเลิก',
      true
    )
    if (!confirmed) return

    const res = await deleteTask(task.id, user.id)
    if (res.success) {
      await showSuccess('ลบภาระงานสำเร็จ', `ลบภาระงาน "${task.title}" เรียบร้อยแล้ว`)
      loadTasks()
    } else {
      await showError('ไม่สามารถลบภาระงานได้', res.error || 'เกิดข้อผิดพลาดในการลบงาน')
    }
  }

  const handleOpenReviewModal = async (task: AdminTaskItem) => {
    setActiveTaskForReview(task)
    setIsReviewModalOpen(true)
    setIsLoadingSubmissions(true)
    setReviewFilter('all')
    setReviewSearch('')

    try {
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
    } catch (err) {
      console.warn('[AdminTasksPage] Load submissions error:', err)
    } finally {
      setIsLoadingSubmissions(false)
    }
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

  // Filter tasks on main page
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchSearch) return false

      if (selectedCategoryFilter !== 'all') {
        if (task.category !== selectedCategoryFilter) return false
      }

      if (selectedPriorityFilter !== 'all') {
        if (task.priority !== selectedPriorityFilter) return false
      }

      return true
    })
  }, [tasks, searchQuery, selectedCategoryFilter, selectedPriorityFilter])

  // Overview KPIs
  const totalTasksCount = tasks.length
  const totalAssignmentsCount = tasks.reduce((sum, t) => sum + (t.stats?.total || 0), 0)
  const totalWaitingReviewCount = tasks.reduce((sum, t) => sum + (t.stats?.submitted || 0), 0)
  const totalApprovedCount = tasks.reduce((sum, t) => sum + (t.stats?.approved || 0), 0)

  // Filtered submissions in checklist modal
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const isApproved = sub.status === 'approved'
      const isSubmitted = sub.status === 'submitted'
      const isPending = sub.status === 'pending' || sub.status === 'in_progress' || sub.status === 'rejected'

      if (reviewFilter === 'submitted' && !isSubmitted) return false
      if (reviewFilter === 'approved' && !isApproved) return false
      if (reviewFilter === 'pending' && !isPending) return false

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

  const totalAssigned = submissions.length
  const submittedCount = submissions.filter((s) => s.status === 'submitted').length
  const approvedCount = submissions.filter((s) => s.status === 'approved').length
  const pendingCount = totalAssigned - submittedCount - approvedCount

  return (
    <div className="space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2.5">
              <ClipboardList className="h-6 w-6 text-emerald-600" />
              <span>จัดการและมอบหมายภาระงานโรงเรียน</span>
            </h1>
            <span className="rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 border border-emerald-200">
              {totalTasksCount} ภาระงาน
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            สร้างภาระงาน กำหนดงานย่อย ตรวจรับผลงาน Checklist และเชื่อมต่อ Google Drive อัตโนมัติ
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>+ มอบหมายภาระงานใหม่</span>
        </button>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">ภาระงานทั้งหมด</span>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalTasksCount} งาน</p>
          <span className="text-[10px] text-slate-400">ในระบบปัจจุบัน</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">คุณครูที่ได้รับมอบหมาย</span>
          <p className="text-xl font-extrabold text-blue-700 mt-0.5">{totalAssignmentsCount} รายการ</p>
          <span className="text-[10px] text-blue-600/80">รวมทุกภาระงาน</span>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-purple-700">ส่งแล้ว รอตรวจรับ</span>
          <p className="text-xl font-extrabold text-purple-800 mt-0.5">{totalWaitingReviewCount} ท่าน</p>
          <span className="text-[10px] text-purple-600 font-medium">ต้องดำเนินการตรวจ</span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700">ตรวจรับและอนุมัติแล้ว</span>
          <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{totalApprovedCount} ท่าน</p>
          <span className="text-[10px] text-emerald-600 font-medium">เสร็จสิ้นสมบูรณ์</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อภาระงาน หรือคำชี้แจง..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Category Filter */}
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="all">📁 ทุกหมวดหมู่</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
          >
            <option value="all">⚡ ทุกความสำคัญ</option>
            <option value="urgent">ด่วนที่สุด</option>
            <option value="high">ด่วน</option>
            <option value="normal">ปกติ</option>
            <option value="low">ไม่ด่วน</option>
          </select>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
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

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดรายการภาระงาน...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <ClipboardList className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">ไม่พบรายการภาระงานที่ค้นหา</p>
          <p className="text-xs text-slate-500 mt-1">ลองเปลี่ยนคำค้นหา หรือกด "มอบหมายภาระงานใหม่"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const stats = task.stats || { total: 0, submitted: 0, approved: 0, pending: 0, progressPercent: 0 }
            const subtasksList = (task.subtasks as unknown as SubtaskItem[]) || []

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-2xs"
              >
                <div>
                  {/* Top Badges & Priority */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                          task.priority === 'urgent'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : task.priority === 'high'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {task.priority === 'urgent' ? '⚡ ด่วนที่สุด' : task.priority === 'high' ? 'ด่วน' : 'ปกติ'}
                      </span>

                      {task.category && (
                        <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 text-[10px] font-medium">
                          📁 {task.category}
                        </span>
                      )}

                      {task.user_groups?.name ? (
                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md font-semibold">
                          กลุ่ม: {task.user_groups.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                          👥 ทั้งโรงเรียน
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task)}
                      title="ลบภาระงานนี้"
                      className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer p-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Subtasks Summary Pill */}
                  {subtasksList.length > 0 && (
                    <div className="mt-2 text-[11px] text-slate-600 flex items-center gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <ListTodo className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-slate-800">งานย่อย {subtasksList.length} ข้อ:</span>
                      <span className="truncate max-w-sm text-slate-500">
                        {subtasksList.map((s) => s.title).join(' • ')}
                      </span>
                    </div>
                  )}

                  {/* Google Drive Auto Hierarchy Pill */}
                  <div className="mt-2 flex items-center justify-between text-[11px] bg-emerald-50/60 p-2 rounded-lg border border-emerald-100 text-emerald-900">
                    <div className="flex items-center gap-1.5 truncate">
                      <FolderOpen className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        โฟลเดอร์ Google Drive: <strong className="font-semibold">{task.category || 'งานทั่วไป'}</strong> ➔ <strong className="font-semibold">{task.title}</strong>
                      </span>
                    </div>
                    <a
                      href={masterDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-0.5 shrink-0 ml-1"
                    >
                      <span>เปิด Drive ↗</span>
                    </a>
                  </div>

                  {/* Progress Bar & Submissions breakdown */}
                  <div className="mt-3.5 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-medium">ความคืบหน้าการส่งงาน:</span>
                      <span className="text-slate-900 font-extrabold">
                        {stats.submitted + stats.approved}/{stats.total} คน ({stats.progressPercent}%)
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
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-purple-700">
                        <span className="h-2 w-2 rounded-full bg-purple-500"></span> รอตรวจ: {stats.submitted}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span> อนุมัติ: {stats.approved}
                      </span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <span className="h-2 w-2 rounded-full bg-slate-300"></span> ยังไม่ส่ง: {stats.pending}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {task.due_date ? `กำหนดส่ง: ${new Date(task.due_date).toLocaleDateString('th-TH')}` : 'ไม่มีกำหนดส่ง'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenReviewModal(task)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                        stats.submitted > 0
                          ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>ตรวจรับงาน & Checklist {stats.submitted > 0 ? `(${stats.submitted} รอตรวจ)` : ''}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Create Task with Subtasks & Google Drive Auto Sync */}
      {/* ===================================================================== */}
      {isCreateModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[94vh] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      มอบหมายภาระงานโรงเรียนใหม่
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      กำหนดงานย่อย และเชื่อมต่อโฟลเดอร์ Google Drive อัตโนมัติ
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="p-5 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4 text-xs">
                  {formError && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Section 1: Task Details */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      1. หัวข้อภาระงาน <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="เช่น ส่งแผนการจัดการเรียนรู้ ประจำภาคเรียนที่ 1/2569"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      2. หมวดหมู่เอกสารและคลังโรงเรียน
                    </label>
                    <select
                      value={taskCategory}
                      onChange={(e) => setTaskCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 cursor-pointer"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          📁 {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      3. คำชี้แจง / รายละเอียดเอกสาร
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="ระบุข้อกำหนด เช่น ส่งเป็นไฟล์ PDF หรือ Word ขนาดไม่เกิน 50MB..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  {/* Section 2: Subtasks (งานย่อย) */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                        <ListTodo className="h-4 w-4 text-emerald-600" />
                        <span>4. กำหนดรายการงานย่อย (ครูลากส่งไฟล์แยกตามข้อได้):</span>
                      </label>
                      <span className="text-[11px] font-semibold text-emerald-800">
                        {subtasks.length} งานย่อย
                      </span>
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-medium">⚡ กดเพิ่มงานย่อยด่วน:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {SUBTASK_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAddSubtask(preset)}
                            className="rounded-lg bg-white border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Manual Input */}
                    <div className="flex gap-2 pt-1">
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
                        placeholder="พิมพ์ชื่องานย่อยเอง แล้วกดเพิ่ม..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSubtask()}
                        className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        + เพิ่มข้อ
                      </button>
                    </div>

                    {/* Subtask Chips */}
                    {subtasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {subtasks.map((st, idx) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-4 w-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-medium">{st.title}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubtask(st.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Section 3: Target Role / Teachers */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      5. มอบหมายให้คุณครูกลุ่มใด <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignedRole('all')}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                          assignedRole === 'all'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        ครูทุกคน ({teachers.length} คน)
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignedRole('group')}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
                          assignedRole === 'group'
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
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
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        เลือกรายบุคคล ({selectedTeacherIds.length})
                      </button>
                    </div>
                  </div>

                  {/* Group Selector */}
                  {assignedRole === 'group' && (
                    <div className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={groupSearchQuery}
                          onChange={(e) => setGroupSearchQuery(e.target.value)}
                          placeholder="ค้นหากลุ่มสาระฯ เช่น วิทยาศาสตร์, ภาษาไทย..."
                          className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      <div className="max-h-40 overflow-y-auto space-y-1">
                        <div
                          onClick={() => setTargetGroupId('all_groups')}
                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer ${
                            targetGroupId === 'all_groups'
                              ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                              : 'hover:bg-slate-200/60 text-slate-800 bg-white'
                          }`}
                        >
                          <span>🌟 ส่งทุกกลุ่มสาระฯ (ทั้งโรงเรียน)</span>
                          <span className="text-[10px] text-emerald-800 font-semibold">{teachers.length} คน</span>
                        </div>
                        {groups
                          .filter((g) => !groupSearchQuery.trim() || g.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                          .map((g) => {
                            const count = teachers.filter((t) => t.group_id === g.id).length
                            const isSelected = targetGroupId === g.id
                            return (
                              <div
                                key={g.id}
                                onClick={() => setTargetGroupId(g.id)}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300'
                                    : 'hover:bg-slate-200/60 text-slate-800 bg-white'
                                }`}
                              >
                                <span>{g.name}</span>
                                <span className="text-[10px] text-slate-500 font-semibold">{count} คน</span>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Specific Teachers Checklist */}
                  {assignedRole === 'specific' && (
                    <div className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          placeholder="ค้นหาชื่อครู..."
                          className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {teachers
                          .filter((t) => !teacherSearchQuery.trim() || t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) || t.username.toLowerCase().includes(teacherSearchQuery.toLowerCase()))
                          .map((t) => {
                            const isSelected = selectedTeacherIds.includes(t.id)
                            return (
                              <div
                                key={t.id}
                                onClick={() => toggleTeacherSelection(t.id)}
                                className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer ${
                                  isSelected ? 'bg-emerald-100 text-emerald-950 font-semibold' : 'hover:bg-slate-100 bg-white text-slate-800'
                                }`}
                              >
                                <span>{t.name} (@{t.username})</span>
                                <input type="checkbox" checked={isSelected} readOnly className="rounded text-emerald-600" />
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}

                  {/* Section 4: Due Date and Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        6. กำหนดส่งงาน (Due Date)
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        7. ระดับความสำคัญ
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as TaskPriority)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none cursor-pointer"
                      >
                        <option value="low">ไม่ด่วน (Low)</option>
                        <option value="normal">ปกติ (Normal)</option>
                        <option value="high">ด่วน (High)</option>
                        <option value="urgent">ด่วนที่สุด (Urgent)</option>
                      </select>
                    </div>
                  </div>

                  {/* Section 5: Google Drive Auto Hierarchy Preview */}
                  <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-teal-950 text-xs">
                      <FolderOpen className="h-4 w-4 text-teal-600" />
                      <span>โครงสร้างโฟลเดอร์ Google Drive อัตโนมัติ (Google Apps Script)</span>
                    </div>
                    <p className="text-[11px] text-teal-800 leading-relaxed font-mono">
                      Flie ➔ {taskCategory} ➔ {title.trim() || '[ชื่อภาระงานนี้]'} ➔ [ชื่อครูผู้ส่ง]
                    </p>
                    <p className="text-[10px] text-teal-700">
                      ✨ เมื่อครูลากไฟล์ส่งงาน ระบบจะสร้างโฟลเดอร์แยกหมวดและชื่อครูใน Google Drive ให้อัตโนมัติ 100%
                    </p>
                  </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>กำลังบันทึกและกระจายงาน...</span>
                      </>
                    ) : (
                      <span>ยืนยันมอบหมายภาระงาน</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================== */}
      {/* Modal: Review Task Submissions & Checklist */}
      {/* ===================================================================== */}
      {isReviewModalOpen && activeTaskForReview &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-6 py-4 gap-3 shrink-0 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>Checklist & ตรวจรับผลงานภาระงาน</span>
                    </h2>
                    {activeTaskForReview.category && (
                      <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200">
                        📁 {activeTaskForReview.category}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{activeTaskForReview.title}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportTaskSubmissionsToCSV(activeTaskForReview.title, submissions)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5 text-slate-500" />
                    <span>ส่งออก CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPrintSummaryOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-500" />
                    <span>พิมพ์สรุป (Print)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                    <span className="text-slate-500 text-[10px]">มอบหมายทั้งหมด</span>
                    <p className="font-extrabold text-sm text-slate-900">{totalAssigned}</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-2.5">
                    <span className="text-purple-700 text-[10px] font-semibold">ส่งแล้ว รอตรวจ</span>
                    <p className="font-extrabold text-sm text-purple-800">{submittedCount}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5">
                    <span className="text-emerald-700 text-[10px] font-semibold">อนุมัติแล้ว</span>
                    <p className="font-extrabold text-sm text-emerald-800">{approvedCount}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <span className="text-amber-700 text-[10px]">ยังไม่ส่งงาน</span>
                    <p className="font-extrabold text-sm text-amber-800">{pendingCount}</p>
                  </div>
                </div>

                {/* Filter and Search in Checklist */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setReviewFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        reviewFilter === 'all' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ทั้งหมด ({totalAssigned})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('submitted')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        reviewFilter === 'submitted' ? 'bg-white text-purple-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      รอตรวจ ({submittedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('approved')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        reviewFilter === 'approved' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      อนุมัติแล้ว ({approvedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewFilter('pending')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        reviewFilter === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ยังไม่ส่ง ({pendingCount})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อครู หรือกลุ่มสาระฯ..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Checklist Rows */}
                {isLoadingSubmissions ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-7 w-7 animate-spin text-emerald-600 mb-2" />
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
                                  @{teacher?.username} {teacher?.user_groups?.name && `• กลุ่มสาระฯ ${teacher.user_groups.name}`}
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
                                  <Clock className="h-3.5 w-3.5 text-purple-600" /> ส่งแล้ว (รอตรวจรับ)
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

                          {/* Submission Content & Subtask Files */}
                          {isSubmitted ? (
                            <div className="rounded-xl bg-white p-3.5 text-xs space-y-2.5 border border-slate-200 shadow-2xs">
                              {sub.submission_note && (
                                <div>
                                  <span className="text-slate-500 font-medium">บันทึกของครู: </span>
                                  <span className="text-slate-900 font-medium">{sub.submission_note}</span>
                                </div>
                              )}

                              {/* Subtask Files Breakdown */}
                              {sub.subtask_files && Object.keys(sub.subtask_files).length > 0 ? (
                                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                    <span>ไฟล์งานแยกตามแต่ละงานย่อย ({Object.keys(sub.subtask_files).length} ไฟล์):</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Object.entries(sub.subtask_files).map(([sId, fileInfo]: [string, any]) => (
                                      <a
                                        key={sId}
                                        href={fileInfo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 transition-colors text-xs group"
                                      >
                                        <div className="flex items-center gap-1.5 truncate">
                                          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                                          <span className="truncate font-semibold text-emerald-950 group-hover:underline">
                                            {fileInfo.fileName}
                                          </span>
                                        </div>
                                        <ExternalLink className="h-3 w-3 text-emerald-700 shrink-0 ml-1" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : sub.submission_url ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-medium">ไฟล์/ลิงก์ผลงาน: </span>
                                  <a
                                    href={sub.submission_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-blue-600 font-semibold hover:underline truncate"
                                  >
                                    <span className="truncate max-w-sm">{sub.submission_url}</span>
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </a>
                                </div>
                              ) : null}

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                                {sub.submitted_at && (
                                  <span>ส่งเมื่อ: {new Date(sub.submitted_at).toLocaleString('th-TH')}</span>
                                )}
                                {/* Teacher Google Drive Folder if available */}
                                {(() => {
                                  const files = (sub.subtask_files as Record<string, any>) || {}
                                  const firstFile = Object.values(files)[0]
                                  const folderUrl = firstFile?.folderUrl
                                  if (folderUrl) {
                                    return (
                                      <a
                                        href={folderUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                                      >
                                        <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                                        <span>เปิดโฟลเดอร์ Google Drive ของครูท่านนี้ ↗</span>
                                      </a>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
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
                                placeholder="ข้อคิดเห็น / ข้อเสนอแนะการตรวจให้คุณครู..."
                                value={reviewFeedback[sub.id] || ''}
                                onChange={(e) =>
                                  setReviewFeedback({ ...reviewFeedback, [sub.id]: e.target.value })
                                }
                                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                              />

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={reviewingId === sub.id}
                                  onClick={() => handleReview(sub.id, 'approved')}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  <span>อนุมัติ</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={reviewingId === sub.id}
                                  onClick={() => handleReview(sub.id, 'rejected')}
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
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

              {/* Bottom Close */}
              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ===================================================================== */}
      {/* Modal: Printable Task Summary Report (A4) */}
      {/* ===================================================================== */}
      {isPrintSummaryOpen && activeTaskForReview &&
        createPortal(
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 flex justify-center items-start animate-in fade-in duration-150">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden my-4 sm:my-8">
              {/* Action Bar */}
              <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-white/95 backdrop-blur-md shadow-xs print:hidden">
                <div className="flex items-center gap-2 text-slate-800 text-sm font-semibold">
                  <Printer className="h-4 w-4 text-emerald-600" />
                  <span>ตัวอย่างก่อนพิมพ์: รายงานสรุปผลการส่งภาระงานราชการ</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>สั่งพิมพ์ (Print)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrintSummaryOpen(false)}
                    className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
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
          </div>,
          document.body
        )}
    </div>
  )
}
