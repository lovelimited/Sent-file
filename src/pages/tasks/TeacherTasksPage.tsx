import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckSquare,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
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
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, AssignmentStatus, SubtaskItem } from '@/types/index'
import { fetchTeacherTasks, submitTask, type TeacherTaskItem } from '@/services/taskService'
import { PrintableTaskSlip } from '@/components/tasks/PrintableTaskSlip'
import { supabase } from '@/services/supabase'

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
    setFileToUpload(null)
    setFormError(null)
    setExternalDriveUrl(item.submission_url && item.submission_url.startsWith('http') ? item.submission_url : '')
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
      setFormError('กรุณาอัปโหลดไฟล์ผลงาน หรือแนบลิงก์ Google Drive หรือกรอกบันทึกการส่งงาน')
      return
    }

    setIsSubmitting(true)

    let finalFileUrl = externalDriveUrl.trim() || selectedTask.submission_url || ''

    // If user selected a new file, upload to Supabase Storage bucket 'submissions'
    if (fileToUpload) {
      try {
        const fileExt = fileToUpload.name.split('.').pop() || 'dat'
        const safeName = fileToUpload.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_')
          .substring(0, 40)
        const taskId = selectedTask.task_id || selectedTask.tasks?.id || 'task_general'
        // Organize files into separate task folders: tasks/{taskId}/{userId}_{timestamp}_{filename}
        const filePath = `tasks/${taskId}/${user.id}_${Date.now()}_${safeName}.${fileExt}`

        const { error: uploadErr } = await supabase.storage
          .from('submissions')
          .upload(filePath, fileToUpload, {
            upsert: true,
          })

        if (uploadErr) {
          console.error('Storage upload error:', uploadErr.message)
          setIsSubmitting(false)
          setFormError(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${uploadErr.message} (หากอัปโหลดไฟล์ไม่ผ่าน ท่านสามารถวางลิงก์ Google Drive โดยตรงในช่องด้านล่างได้)`)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('submissions')
          .getPublicUrl(filePath)
        finalFileUrl = publicUrlData.publicUrl
      } catch (err: unknown) {
        console.error('File upload exception:', err)
        setIsSubmitting(false)
        const errMsg = err instanceof Error ? err.message : 'Upload failed'
        setFormError(`เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${errMsg}`)
        return
      }
    }

    const res = await submitTask(selectedTask.id, submissionNote, finalFileUrl)
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
        return <span className="rounded bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-bold">ด่วนที่สุด</span>
      case 'high':
        return <span className="rounded bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 text-[10px] font-bold">ด่วน</span>
      case 'normal':
        return <span className="rounded bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-medium">ปกติ</span>
      case 'low':
        return <span className="rounded bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[10px]">ไม่ด่วน</span>
    }
  }

  const renderStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-800 font-semibold">รอส่งงาน</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 border border-blue-200 px-2.5 py-0.5 text-xs text-blue-800 font-semibold">กำลังทำ</span>
      case 'submitted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-800 font-semibold">ส่งแล้ว (รอตรวจ)</span>
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs text-emerald-800 font-semibold">อนุมัติแล้ว</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs text-red-800 font-semibold">ส่งใหม่ (ต้องแก้ไข)</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <CheckSquare className="h-6 w-6 text-blue-600" />
          <span>ภาระงานของฉัน (My Tasks)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ตรวจสอบภาระงานที่ได้รับมอบหมาย ติดตามกำหนดส่ง และอัปโหลดส่งผลงานออนไลน์
        </p>
      </div>

      {/* Feedback Toast */}
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

      {/* Google Drive Link Quick Bar */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-600 text-white p-2.5 shadow-sm">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">โฟลเดอร์ Google Drive รวมส่งงานของโรงเรียน</h3>
            <p className="text-xs text-slate-500">สามารถกดเพื่อเปิดโฟลเดอร์ Drive หรือลากไฟล์ส่งผ่านระบบได้ทันที</p>
          </div>
        </div>

        <a
          href="https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors shrink-0 self-start sm:self-auto"
        >
          <span>เปิดโฟลเดอร์ Drive</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Summary Tab Bar */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>ต้องทำ / รอส่ง</span>
          <span className="rounded-full bg-amber-200 px-2 py-0.2 text-[10px] font-bold">{pendingCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('submitted')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'submitted'
              ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>ส่งแล้ว (รอตรวจ)</span>
          <span className="rounded-full bg-purple-200 px-2 py-0.2 text-[10px] font-bold">{submittedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>อนุมัติแล้ว</span>
          <span className="rounded-full bg-emerald-200 px-2 py-0.2 text-[10px] font-bold">{approvedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-slate-200 text-slate-900 border border-slate-300 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>งานทั้งหมด</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px]">{tasks.length}</span>
        </button>
      </div>

      {/* Tasks List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
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
            const subtasksList = (task.subtasks as unknown as SubtaskItem[]) || []

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      {renderPriorityBadge(task.priority)}
                      {task.user_groups?.name && (
                        <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-medium">
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

                  {/* Subtasks Checklist (If any) */}
                  {subtasksList.length > 0 && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900 text-[11px]">
                        <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
                        <span>รายการงานย่อยที่ต้องดำเนินการ ({subtasksList.length} รายการ):</span>
                      </div>
                      <div className="space-y-1 pl-1">
                        {subtasksList.map((st, idx) => (
                          <div key={st.id || idx} className="flex items-center gap-2 text-slate-700 text-[11px]">
                            <CheckCircle className="h-3 w-3 text-indigo-500 shrink-0" />
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
                        <span>ข้อเสนอแนะจากผู้ตรวจ (ต้องแก้ไข):</span>
                      </div>
                      <p>{item.feedback}</p>
                    </div>
                  )}

                  {/* Feedback if approved */}
                  {item.status === 'approved' && item.feedback && (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <p className="font-bold text-emerald-700">ข้อคิดเห็น:</p>
                      <p>{item.feedback}</p>
                    </div>
                  )}

                  {/* Task Dedicated Google Drive Folder */}
                  {task.drive_folder_url && (
                    <div className="mt-3">
                      <a
                        href={task.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2.5 py-1 text-[11px] font-medium text-blue-700 transition-colors"
                      >
                        <FolderOpen className="h-3 w-3 text-blue-600" />
                        <span>โฟลเดอร์ Google Drive ประจำงาน</span>
                        <ExternalLink className="h-2.5 w-2.5 text-blue-400" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {task.due_date ? (
                        <span className={isDueSoon ? 'text-amber-700 font-semibold' : ''}>
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
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="พิมพ์ใบนำส่งภาระงานราชการ"
                      >
                        <Printer className="h-3.5 w-3.5 text-blue-600" />
                        <span>ใบนำส่ง</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenSubmitModal(item)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
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
      {/* Modal: Submit Task with Drag and Drop Upload */}
      {/* ===================================================================== */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-600" />
                  <span>บันทึกการส่งภาระงาน</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedTask.tasks.title}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
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

              {/* Subtasks in Modal */}
              {((selectedTask.tasks.subtasks as unknown as SubtaskItem[]) || []).length > 0 && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs space-y-1">
                  <span className="font-bold text-indigo-900 text-[11px]">งานย่อยที่ต้องส่ง:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[11px]">
                    {((selectedTask.tasks.subtasks as unknown as SubtaskItem[]) || []).map((st, i) => (
                      <li key={st.id || i}>{st.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Task Dedicated Google Drive Folder Card */}
              <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/50 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-600 p-2 text-white shadow-xs shrink-0">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">โฟลเดอร์ Google Drive ประจำภาระงานนี้</h4>
                    <p className="text-[11px] text-slate-600">เปิดโฟลเดอร์เพื่อจัดเก็บหรือเรียกดูเอกสารประจำงานนี้</p>
                  </div>
                </div>
                <a
                  href={selectedTask.tasks.drive_folder_url || 'https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50 shadow-xs shrink-0 transition-colors"
                >
                  <span>เปิดโฟลเดอร์งาน</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Drag and Drop File Upload Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    1. อัปโหลดไฟล์ผลงาน (ลากและวางไฟล์ที่นี่)
                  </label>
                  <span className="text-[10px] text-slate-400">ระบบจะจัดเก็บแยกโฟลเดอร์งานให้อัตโนมัติ</span>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-all cursor-pointer ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/70'
                      : 'border-slate-300 hover:border-blue-400 bg-slate-50/60'
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
                    <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2.5 text-left truncate">
                        <FileText className="h-6 w-6 text-blue-600 shrink-0" />
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
                    <div className="space-y-1">
                      <Upload className="h-7 w-7 text-blue-600 mx-auto" />
                      <p className="text-xs font-semibold text-slate-800">
                        ลากและวางไฟล์ผลงานลงในกล่องนี้ หรือคลิกเพื่อเลือกไฟล์
                      </p>
                      <p className="text-[10px] text-slate-500">
                        รองรับไฟล์ PDF, Word, Excel, PowerPoint, รูปภาพ หรือ ZIP
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* External Google Drive Link Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. หรือ แนบลิงก์ไฟล์ / โฟลเดอร์จาก Google Drive
                </label>
                <input
                  type="url"
                  value={externalDriveUrl}
                  onChange={(e) => setExternalDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  หากท่านนำไฟล์ไปวางไว้ใน Google Drive แล้ว สามารถคัดลอกลิงก์มาวางในช่องนี้ได้ทันที
                </p>
              </div>

              {/* Submission Note */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  3. บันทึกการดำเนินงาน / ข้อความสรุปผลงาน
                </label>
                <textarea
                  rows={3}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                  placeholder="เช่น ดำเนินการจัดทำแผนการสอนวิชาภาษาไทย ภาคเรียนที่ 1 เรียบร้อยแล้ว..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Previous Submission Info */}
              {selectedTask.submitted_at && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>เคยส่งเมื่อ: {new Date(selectedTask.submitted_at).toLocaleString('th-TH')}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ปิด
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
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
