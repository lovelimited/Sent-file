import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckSquare,
  Clock,
  Send,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Printer,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, AssignmentStatus } from '@/types/index'
import { fetchTeacherTasks, submitTask, type TeacherTaskItem } from '@/services/taskService'
import { PrintableTaskSlip } from '@/components/tasks/PrintableTaskSlip'

export const TeacherTasksPage: React.FC = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'approved' | 'all'>('pending')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [now] = useState(Date.now)

  // Submit Modal
  const [selectedTask, setSelectedTask] = useState<TeacherTaskItem | null>(null)
  const [taskToPrint, setTaskToPrint] = useState<TeacherTaskItem | null>(null)
  const [submissionNote, setSubmissionNote] = useState('')
  const [submissionUrl, setSubmissionUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const loadTasks = useCallback(() => {
    if (!user?.id) return
    setIsLoading(true)
    fetchTeacherTasks(user.id).then((res) => {
      if (res.data) {
        setTasks(res.data)
      } else if (res.error) {
        setFeedback({ type: 'error', message: res.error })
      }
      setIsLoading(false)
    })
  }, [user])

  useEffect(() => {
    let isMounted = true
    if (user?.id) {
      fetchTeacherTasks(user.id).then((res) => {
        if (isMounted) {
          if (res.data) setTasks(res.data)
          setIsLoading(false)
        }
      })
    }
    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Filter tasks by tab
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (activeTab === 'pending') return t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
      if (activeTab === 'submitted') return t.status === 'submitted'
      if (activeTab === 'approved') return t.status === 'approved'
      return true
    })
  }, [tasks, activeTab])

  // Counts
  const pendingCount = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected').length
  const submittedCount = tasks.filter((t) => t.status === 'submitted').length
  const approvedCount = tasks.filter((t) => t.status === 'approved').length

  const handleOpenSubmitModal = (item: TeacherTaskItem) => {
    setSelectedTask(item)
    setSubmissionNote(item.submission_note || '')
    setSubmissionUrl(item.submission_url || '')
    setFormError(null)
  }

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask) return
    setFormError(null)

    if (!submissionNote.trim() && !submissionUrl.trim()) {
      setFormError('กรุณากรอกบันทึกการส่งงาน หรือแนบลิงก์ผลงาน')
      return
    }

    setIsSubmitting(true)
    const res = await submitTask(selectedTask.id, submissionNote, submissionUrl)
    setIsSubmitting(false)

    if (res.success) {
      setSelectedTask(null)
      setFeedback({ type: 'success', message: 'ส่งผลงานเรียบร้อยแล้ว รอการตรวจจากผู้ดูแลระบบ' })
      loadTasks()
    } else {
      setFormError(res.error || 'เกิดข้อผิดพลาดในการส่งงาน')
    }
  }

  const renderPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return <span className="rounded bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-0.5 text-[10px] font-semibold">ด่วนที่สุด</span>
      case 'high':
        return <span className="rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 text-[10px] font-semibold">ด่วน</span>
      case 'normal':
        return <span className="rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 px-2 py-0.5 text-[10px] font-medium">ปกติ</span>
      case 'low':
        return <span className="rounded bg-slate-800 text-slate-400 px-2 py-0.5 text-[10px]">ไม่ด่วน</span>
    }
  }

  const renderStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs text-amber-400 font-medium">รอส่งงาน</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs text-blue-400 font-medium">กำลังทำ</span>
      case 'submitted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 text-xs text-purple-400 font-medium">ส่งแล้ว (รอตรวจ)</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400 font-medium">อนุมัติแล้ว</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-xs text-red-400 font-medium">ส่งใหม่ (ต้องแก้ไข)</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <CheckSquare className="h-6 w-6 text-blue-400" />
          <span>ภาระงานของฉัน (My Tasks)</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          ตรวจสอบภาระงานที่ได้รับมอบหมาย ติดตามกำหนดส่ง และบันทึกส่งผลงานออนไลน์
        </p>
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

      {/* Summary Tab Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>ต้องทำ / รอส่ง</span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.2 text-[10px]">{pendingCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'submitted'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>ส่งแล้ว (รอตรวจ)</span>
          <span className="rounded-full bg-purple-500/20 px-2 py-0.2 text-[10px]">{submittedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>อนุมัติแล้ว</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.2 text-[10px]">{approvedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
          }`}
        >
          <span>งานทั้งหมด</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.2 text-[10px]">{tasks.length}</span>
        </button>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
          <p className="text-xs text-slate-400">กำลังโหลดรายการภาระงาน...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <CheckSquare className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">ไม่มีภาระงานในสถานะนี้</p>
          <p className="text-xs text-slate-500 mt-1">คุณได้ส่งภาระงานครบถ้วนหรือยังไม่มีงานใหม่ที่ได้รับมอบหมาย</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((item) => {
            const task = item.tasks
            const isDueSoon = task.due_date && new Date(task.due_date).getTime() - now < 3 * 24 * 60 * 60 * 1000

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur flex flex-col justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {renderPriorityBadge(task.priority)}
                      {task.user_groups?.name && (
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {task.user_groups.name}
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(item.status)}
                  </div>

                  <h3 className="text-base font-semibold text-white tracking-tight">{task.title}</h3>

                  {task.description && (
                    <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {/* Feedback if rejected */}
                  {item.status === 'rejected' && item.feedback && (
                    <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
                      <div className="flex items-center gap-1.5 font-semibold text-red-400 mb-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>ข้อเสนอแนะจากผู้ตรวจ (ต้องแก้ไข):</span>
                      </div>
                      <p>{item.feedback}</p>
                    </div>
                  )}

                  {/* Feedback if approved */}
                  {item.status === 'approved' && item.feedback && (
                    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300">
                      <p className="font-semibold text-emerald-400">ข้อคิดเห็น:</p>
                      <p>{item.feedback}</p>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      {task.due_date ? (
                        <span className={isDueSoon ? 'text-amber-400 font-medium' : ''}>
                          ส่งภายใน: {new Date(task.due_date).toLocaleDateString('th-TH')}
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
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                        title="พิมพ์ใบนำส่งภาระงานราชการ"
                      >
                        <Printer className="h-3.5 w-3.5 text-blue-400" />
                        <span className="hidden sm:inline">ใบนำส่ง</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenSubmitModal(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-colors cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>{item.status === 'pending' ? 'ส่งงาน' : 'ดู/แก้ไขงาน'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Submit Task */}
      {/* ===================================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-400" />
                  <span>บันทึกการส่งภาระงาน</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">{selectedTask.tasks.title}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Task Details Info */}
              {selectedTask.tasks.description && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                  <span className="font-semibold text-slate-200">คำชี้แจง: </span>
                  {selectedTask.tasks.description}
                </div>
              )}

              {/* Submission Note */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  บันทึกการดำเนินงาน / ข้อความสรุปผลงาน
                </label>
                <textarea
                  rows={4}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="เช่น ดำเนินการจัดทำแผนการสอนวิชาคณิตศาสตร์ ภาคเรียนที่ 1 เรียบร้อยแล้ว..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Submission URL */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-blue-400" />
                    <span>แนบลิงก์เอกสาร / ไฟล์ออนไลน์</span>
                  </span>
                  <span className="text-[10px] text-slate-500">Google Drive, Canva, Docs, ฯลฯ</span>
                </label>
                <input
                  type="url"
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {submissionUrl && (
                  <a
                    href={submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mt-1"
                  >
                    <span>ทดสอบเปิดลิงก์</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Previous Submission Info */}
              {selectedTask.submitted_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  <span>เคยส่งเมื่อ: {new Date(selectedTask.submitted_at).toLocaleString('th-TH')}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 cursor-pointer transition-colors"
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
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* Modal: Printable Task Slip */}
      {/* ===================================================================== */}
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
