import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckSquare,
  Clock,
  Send,
  AlertCircle,
  X,
  Loader2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Printer,
  Upload,
  FileText,
  FolderOpen,
  CheckCircle,
  ListTodo,
  Star,
  Link as LinkIcon,
  Search,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, AssignmentStatus, SubtaskItem } from '@/types/index'
import { fetchTeacherTasks, submitTask, type TeacherTaskItem } from '@/services/taskService'
import { fetchTeacherRatings, type TeacherRating } from '@/services/ratingService'
import { PrintableTaskSlip } from '@/components/tasks/PrintableTaskSlip'
import { supabase } from '@/services/supabase'
import { showConfirm, showToast, showError } from '@/utils/sweetalert'

export const TeacherTasksPage: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'approved' | 'all'>('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [now] = useState(Date.now)

  // Teacher ratings from admin
  const [myRatings, setMyRatings] = useState<TeacherRating[]>([])

  // Submit Modal state (ข้อ 5)
  const [selectedTask, setSelectedTask] = useState<TeacherTaskItem | null>(null)
  const [taskToPrint, setTaskToPrint] = useState<TeacherTaskItem | null>(null)
  const [submissionType, setSubmissionType] = useState<'upload' | 'drive'>('upload')
  const [submissionNote, setSubmissionNote] = useState('')
  const [externalDriveUrl, setExternalDriveUrl] = useState('')
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadTasks = useCallback(() => {
    if (!user?.id) return
    setIsLoading(true)
    fetchTeacherTasks(user.id).then((res) => {
      if (res.data) {
        setTasks(res.data)
      } else if (res.error) {
        showError('ไม่สามารถโหลดภาระงานได้', res.error)
      }
      setIsLoading(false)
    })
  }, [user])

  useEffect(() => {
    let isMounted = true
    if (user?.id) {
      loadTasks()
      // Fetch teacher ratings
      fetchTeacherRatings(user.id).then((res) => {
        if (isMounted && res.data) {
          setMyRatings(res.data)
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [user?.id, loadTasks])

  // Average stars calculation
  const averageStars = useMemo(() => {
    if (myRatings.length === 0) return null
    const total = myRatings.reduce((sum, r) => sum + r.stars, 0)
    return (total / myRatings.length).toFixed(1)
  }, [myRatings])

  // Filter tasks by tab and search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.tasks.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.tasks.description && t.tasks.description.toLowerCase().includes(searchQuery.toLowerCase()))

      if (!matchSearch) return false

      if (activeTab === 'pending') return t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
      if (activeTab === 'submitted') return t.status === 'submitted'
      if (activeTab === 'approved') return t.status === 'approved'
      return true
    })
  }, [tasks, activeTab, searchQuery])

  // Counts
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected').length
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length
  const approvedCount = tasks.filter((t) => t.status === 'approved').length

  const handleOpenSubmitModal = (item: TeacherTaskItem) => {
    setSelectedTask(item)
    setSubmissionNote(item.submission_note || '')
    setFileToUpload(null)
    setFormError(null)
    const hasDriveUrl = item.submission_url && item.submission_url.includes('drive.google.com')
    setExternalDriveUrl(hasDriveUrl ? item.submission_url || '' : '')
    setSubmissionType(hasDriveUrl ? 'drive' : 'upload')
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileToUpload(e.dataTransfer.files[0])
    }
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !user?.id) return
    setFormError(null)

    if (!submissionNote.trim() && !fileToUpload && !externalDriveUrl.trim() && !selectedTask.submission_url) {
      setFormError('กรุณาอัปโหลดไฟล์ หรือระบุลิงก์ Google Drive หรือกรอกบันทึกสรุปงาน')
      return
    }

    const confirmed = await showConfirm(
      'ยืนยันการส่งผลงาน?',
      `ภาระงาน "${selectedTask.tasks.title}" จะถูกส่งไปยังผู้ดูแลระบบเพื่อตรวจรับ`
    )
    if (!confirmed) return

    setIsSubmitting(true)

    let finalFileUrl = submissionType === 'drive'
      ? externalDriveUrl.trim()
      : (selectedTask.submission_url || '')

    // If user uploaded a new file
    if (submissionType === 'upload' && fileToUpload) {
      try {
        const fileExt = fileToUpload.name.split('.').pop() || 'dat'
        const safeName = fileToUpload.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 40)
        const taskId = selectedTask.task_id || selectedTask.tasks?.id || 'task_general'
        const filePath = `tasks/${taskId}/${user.id}_${Date.now()}_${safeName}.${fileExt}`

        const { error: uploadErr } = await supabase.storage
          .from('submissions')
          .upload(filePath, fileToUpload, { upsert: true })

        if (uploadErr) {
          setIsSubmitting(false)
          setFormError(`อัปโหลดไฟล์ไม่สำเร็จ: ${uploadErr.message}`)
          return
        }

        const { data: publicUrlData } = supabase.storage.from('submissions').getPublicUrl(filePath)
        finalFileUrl = publicUrlData.publicUrl
      } catch (err: unknown) {
        setIsSubmitting(false)
        setFormError(err instanceof Error ? err.message : 'Upload failed')
        return
      }
    }

    const res = await submitTask(selectedTask.id, submissionNote, finalFileUrl)
    setIsSubmitting(false)

    if (res.success) {
      setSelectedTask(null)
      showToast('ส่งผลงานเรียบร้อยแล้ว รอการตรวจรับจากผู้ดูแลระบบ', 'success')
      loadTasks()
    } else {
      setFormError(res.error || 'เกิดข้อผิดพลาดในการส่งงาน')
      showError('ไม่สามารถส่งงานได้', res.error)
    }
  }

  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="rounded-md bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">ด่วนที่สุด</span>
      case 'high':
        return <span className="rounded-md bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">ด่วน</span>
      case 'normal':
        return <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium">ปกติ</span>
      case 'low':
        return <span className="rounded-md bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px]">ไม่ด่วน</span>
    }
  }

  const renderStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs text-amber-800 font-semibold">⏳ รอส่งงาน</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-xs text-teal-800 font-semibold">⚙️ กำลังทำ</span>
      case 'submitted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-800 font-semibold">📤 ส่งแล้ว (รอตรวจ)</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs text-emerald-800 font-semibold">✅ ตรวจรับแล้ว</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs text-red-800 font-semibold">⚠️ ส่งใหม่ (ต้องแก้ไข)</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Star Rating Badge (ข้อ 4) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <CheckSquare className="h-6 w-6 text-emerald-600" />
            <span>ภาระงานของฉัน (My Tasks)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ติดตามภาระงานที่ได้รับมอบหมาย กำหนดส่ง และส่งผลงานออนไลน์อย่างเป็นระบบ
          </p>
        </div>

        {/* Teacher's Star Rating Recognition Badge */}
        {averageStars && (
          <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100/60 px-4 py-2 shadow-xs self-start sm:self-auto">
            <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-amber-900">คะแนนการประเมิน:</span>
                <span className="text-sm font-extrabold text-amber-700">{averageStars} / 5.0</span>
              </div>
              <p className="text-[10px] text-amber-700/80">ได้รับ {myRatings.length} การประเมินจากฝ่ายบริหาร</p>
            </div>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 flex items-center justify-between text-xs text-emerald-800">
          <span className="font-semibold">ℹ️ คุณกำลังเปิดดูในฐานะผู้ดูแลระบบ (โหมดดูอย่างเดียว ไม่สามารถส่งงานแทนได้)</span>
          <a href="/admin/tasks" className="font-bold underline hover:text-emerald-950 ml-2 whitespace-nowrap">
            ไปที่หน้าจัดการภาระงาน & ตรวจรับ ↗
          </a>
        </div>
      )}

      {/* Quick Google Drive Link Banner - Admin Only (ข้อ 4) */}
      {isAdmin && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 text-white p-2.5 shadow-sm">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">โฟลเดอร์ Google Drive รวมส่งงานของโรงเรียน</h3>
              <p className="text-xs text-slate-500">สามารถเปิดโฟลเดอร์ Drive หรืออัปโหลดไฟล์ส่งผ่านระบบได้ทันที</p>
            </div>
          </div>

          <a
            href="https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shrink-0 self-start sm:self-auto"
          >
            <span>เปิดโฟลเดอร์ Drive</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>ต้องทำ / รอส่ง</span>
            <span className="rounded-full bg-amber-200 px-1.5 py-0.2 text-[10px] font-bold">{pendingCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('submitted')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'submitted'
                ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>ส่งแล้ว (รอตรวจ)</span>
            <span className="rounded-full bg-purple-200 px-1.5 py-0.2 text-[10px] font-bold">{submittedCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>อนุมัติแล้ว</span>
            <span className="rounded-full bg-emerald-200 px-1.5 py-0.2 text-[10px] font-bold">{approvedCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[10px]">{tasks.length}</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาภาระงาน..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Task Cards Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังโหลดรายการภาระงาน...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800">ไม่มีภาระงานในสถานะนี้</p>
          <p className="text-xs text-slate-500 mt-1">คุณได้ส่งภาระงานครบถ้วนหรือยังไม่มีงานใหม่ที่ได้รับมอบหมาย</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((item) => {
            const task = item.tasks
            const isDueSoon = task.due_date && new Date(task.due_date).getTime() - now < 3 * 24 * 60 * 60 * 1000
            const isOverdue = task.due_date && new Date(task.due_date).getTime() < now && item.status === 'pending'
            const subtasksList = (task.subtasks as unknown as SubtaskItem[]) || []

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {renderPriorityBadge(task.priority)}
                      {task.user_groups?.name && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded font-medium">
                          {task.user_groups.name}
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 tracking-tight">{task.title}</h3>

                  {task.description && (
                    <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Subtasks Checklist */}
                  {subtasksList.length > 0 && (
                    <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-900 text-[11px]">
                        <ListTodo className="h-3.5 w-3.5 text-emerald-600" />
                        <span>รายการงานย่อยที่ต้องดำเนินการ ({subtasksList.length} ข้อ):</span>
                      </div>
                      <div className="space-y-1 pl-1">
                        {subtasksList.map((st, idx) => (
                          <div key={st.id || idx} className="flex items-center gap-2 text-slate-700 text-[11px]">
                            <CheckCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{st.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback if rejected */}
                  {item.status === 'rejected' && item.feedback && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                      <div className="flex items-center gap-1.5 font-bold text-red-700 mb-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>ข้อเสนอแนะจากผู้ตรวจ (ส่งกลับแก้ไข):</span>
                      </div>
                      <p>{item.feedback}</p>
                    </div>
                  )}

                  {/* Feedback if approved */}
                  {item.status === 'approved' && item.feedback && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <p className="font-bold text-emerald-700">ข้อคิดเห็นผลการตรวจ:</p>
                      <p>{item.feedback}</p>
                    </div>
                  )}

                  {/* Task Dedicated Drive Folder */}
                  {task.drive_folder_url && (
                    <div className="mt-3">
                      <a
                        href={task.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 text-[11px] font-medium text-emerald-800 transition-colors"
                      >
                        <FolderOpen className="h-3 w-3 text-emerald-600" />
                        <span>โฟลเดอร์ Google Drive ประจำงาน</span>
                        <ExternalLink className="h-2.5 w-2.5 text-emerald-500" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer of Card */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {task.due_date ? (
                        <span
                          className={
                            isOverdue
                              ? 'text-red-600 font-bold'
                              : isDueSoon
                              ? 'text-amber-700 font-semibold'
                              : ''
                          }
                        >
                          {isOverdue ? 'เลยกำหนดส่ง: ' : 'ส่งภายใน: '}
                          {new Date(task.due_date).toLocaleDateString('th-TH')}
                        </span>
                      ) : (
                        'ไม่ระบุกำหนดส่ง'
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => setTaskToPrint(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="พิมพ์ใบนำส่งภาระงานราชการ"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-600" />
                        <span>ใบนำส่ง</span>
                      </button>
                    )}

                    {!isAdmin && (
                      <button
                        onClick={() => handleOpenSubmitModal(item)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        <span>{item.status === 'pending' ? 'ส่งงาน' : 'ดู/แก้ไขงาน'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Submit Task (ข้อ 5: แก้ไขบักปุ่มปิด/ส่งงานหลุดจอ และปรับโครงสร้าง) */}
      {/* ===================================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-white shrink-0">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send className="h-5 w-5 text-emerald-600" />
                  <span>บันทึกการส่งภาระงาน</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">
                  {selectedTask.tasks.title}
                </p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition-colors"
                title="ปิด"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Task Details Info */}
              {selectedTask.tasks.description && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">คำชี้แจง: </span>
                  {selectedTask.tasks.description}
                </div>
              )}

              {/* Subtasks Checklist in Modal */}
              {((selectedTask.tasks.subtasks as unknown as SubtaskItem[]) || []).length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 text-[11px]">งานย่อยที่ต้องส่ง ({((selectedTask.tasks.subtasks as unknown as SubtaskItem[]) || []).length} รายการ):</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[11px]">
                    {((selectedTask.tasks.subtasks as unknown as SubtaskItem[]) || []).map((st, i) => (
                      <li key={st.id || i}>{st.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Previously Submitted File / URL (If any) */}
              {selectedTask.submission_url && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate text-xs">
                    <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="truncate">
                      <p className="font-bold text-emerald-900">ผลงานที่เคยส่งไว้ในระบบ</p>
                      <p className="text-[10px] text-emerald-700 truncate">{selectedTask.submission_url}</p>
                    </div>
                  </div>
                  <a
                    href={selectedTask.submission_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-2.5 py-1 text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0 shadow-2xs"
                  >
                    <span>เปิดดูผลงาน</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Method Segmented Toggle: Upload vs Google Drive Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลือกวิธีส่งเอกสารผลงาน
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSubmissionType('upload')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      submissionType === 'upload'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>1. อัปโหลดไฟล์จากเครื่อง</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmissionType('drive')}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      submissionType === 'drive'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    <span>2. แนบลิงก์ Google Drive</span>
                  </button>
                </div>
              </div>

              {/* Mode A: Drag & Drop File Upload */}
              {submissionType === 'upload' && (
                <div>
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all cursor-pointer ${
                      isDragging
                        ? 'border-emerald-500 bg-emerald-50/70'
                        : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60'
                    }`}
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input
                      id="file-upload-input"
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFileToUpload(e.target.files[0])
                        }
                      }}
                      accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.png,.jpg,.jpeg,.zip"
                    />

                    {fileToUpload ? (
                      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-300 shadow-xs">
                        <div className="flex items-center gap-2.5 text-left truncate">
                          <FileText className="h-6 w-6 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">{fileToUpload.name}</p>
                            <p className="text-[10px] text-slate-500">
                              {(fileToUpload.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setFileToUpload(null)
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="ลบไฟล์นี้"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Upload className="h-7 w-7 text-emerald-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-800">
                          ลากและวางไฟล์ผลงานลงในกล่องนี้ หรือคลิกเพื่อเลือกไฟล์
                        </p>
                        <p className="text-[10px] text-slate-500">
                          รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ หรือ ZIP (ระบบแยกโฟลเดอร์ให้อัตโนมัติ)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode B: Google Drive Link */}
              {submissionType === 'drive' && (
                <div className="space-y-2">
                  {selectedTask.tasks.drive_folder_url ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">โฟลเดอร์ Google Drive ประจำภาระงานนี้</p>
                        <p className="text-[11px] text-slate-500">สามารถเปิดโฟลเดอร์เพื่อวางไฟล์ หรือนำลิงก์ผลงานมาวางส่ง</p>
                      </div>
                      <a
                        href={selectedTask.tasks.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        <span>เปิดโฟลเดอร์ Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      วาง URL ลิงก์ Google Drive หรือเอกสารออนไลน์
                    </label>
                    <input
                      type="url"
                      value={externalDriveUrl}
                      onChange={(e) => setExternalDriveUrl(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Submission Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  บันทึกการส่งงาน / ข้อความสรุปถึงผู้ตรวจ (ไม่บังคับ)
                </label>
                <textarea
                  rows={3}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="เช่น ดำเนินการจัดทำแผนการสอนและใบงานเรียบร้อยแล้ว..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              {/* Previous Submission Info */}
              {selectedTask.submitted_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>เคยส่งล่าสุดเมื่อ: {new Date(selectedTask.submitted_at).toLocaleString('th-TH')}</span>
                </div>
              )}
            </div>

            {/* Fixed Sticky Footer (ข้อ 5: มองเห็นปุ่มปิดและปุ่มส่งงาน 100% เสมอ) */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={handleSubmitWork}
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>กำลังส่งงาน...</span>
                  </>
                ) : (
                  <span>ยืนยันการส่งงาน</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Task Slip Modal */}
      {taskToPrint && (
        <PrintableTaskSlip
          taskTitle={taskToPrint.tasks.title}
          taskDescription={taskToPrint.tasks.description}
          teacherName={user?.user_metadata?.name || 'ครูผู้สอน'}
          teacherUsername={user?.user_metadata?.username || 'teacher'}
          submittedAt={taskToPrint.submitted_at}
          submissionNote={taskToPrint.submission_note}
          submissionUrl={taskToPrint.submission_url}
          status={taskToPrint.status}
          feedback={taskToPrint.feedback}
          onClose={() => setTaskToPrint(null)}
        />
      )}
    </div>
  )
}
