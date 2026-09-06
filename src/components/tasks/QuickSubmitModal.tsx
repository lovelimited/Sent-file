import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Upload,
  CheckCircle2,
  Loader2,
  ExternalLink,
  FolderOpen,
  CheckSquare,
  Sparkles,
  RefreshCw,
  Clock,
  FileCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchTeacherTasks,
  submitSubtaskWork,
  type TeacherTaskItem,
} from '@/services/taskService'
import {
  uploadSubmissionFile,
  type UploadProgressInfo,
} from '@/services/driveService'
import { showToast, showError } from '@/utils/sweetalert'
import type { SubtaskItem } from '@/types/index'

interface QuickSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  initialTaskId?: string
  onSubmitted?: () => void
}

interface SubtaskUploadState {
  isUploading: boolean
  progress: number
  statusText: string
  error?: string
}

export const QuickSubmitModal: React.FC<QuickSubmitModalProps> = ({
  isOpen,
  onClose,
  initialTaskId,
  onSubmitted,
}) => {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [submissionNote, setSubmissionNote] = useState('')
  const [subtaskProgress, setSubtaskProgress] = useState<Record<string, SubtaskUploadState>>({})
  const [dragOverSubtaskId, setDragOverSubtaskId] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load active teacher's tasks
  const loadTasks = async () => {
    if (!user?.id) return
    setIsLoading(true)
    const res = await fetchTeacherTasks(user.id)
    if (res.data) {
      setTasks(res.data)
      if (initialTaskId) {
        setSelectedTaskId(initialTaskId)
      } else if (res.data.length > 0 && !selectedTaskId) {
        // Pick first pending or in_progress task
        const pending = res.data.find(
          (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
        )
        setSelectedTaskId(pending ? pending.id : res.data[0].id)
      }
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (isOpen && user?.id) {
      loadTasks()
    }
  }, [isOpen, user?.id, initialTaskId])

  if (!isOpen) return null

  const selectedTask = tasks.find((t) => t.id === selectedTaskId)
  const rawSubtasks = selectedTask?.tasks?.subtasks
  const subtaskList: SubtaskItem[] = Array.isArray(rawSubtasks)
    ? (rawSubtasks as unknown as SubtaskItem[])
    : []

  const completedIds: string[] = Array.isArray(selectedTask?.completed_subtask_ids)
    ? selectedTask.completed_subtask_ids
    : []

  const subtaskFiles = (selectedTask?.subtask_files as Record<string, any>) || {}

  // Handle single file upload for a subtask or main task
  const handleFileUpload = async (subtaskId: string, file: File) => {
    if (!selectedTask || !user?.id) return

    setSubtaskProgress((prev) => ({
      ...prev,
      [subtaskId]: {
        isUploading: true,
        progress: 10,
        statusText: 'กำลังเริ่มส่งไฟล์...',
      },
    }))

    const teacherDisplayName = profile?.name || user.email || 'คุณครู'
    const categoryName = selectedTask.tasks?.category || selectedTask.tasks?.user_groups?.name || 'ฝ่ายวิชาการ'
    const taskTitle = selectedTask.tasks?.title || 'ภาระงาน'

    let subtaskTitle = ''
    if (subtaskId !== 'main') {
      const found = subtaskList.find((s) => s.id === subtaskId)
      subtaskTitle = found ? found.title : ''
    }

    const uploadRes = await uploadSubmissionFile({
      file,
      category: categoryName,
      taskTitle,
      teacherName: teacherDisplayName,
      subtaskTitle,
      onProgress: (info: UploadProgressInfo) => {
        setSubtaskProgress((prev) => ({
          ...prev,
          [subtaskId]: {
            isUploading: true,
            progress: info.percent,
            statusText: info.message,
          },
        }))
      },
    })

    if (!uploadRes.success || !uploadRes.url) {
      setSubtaskProgress((prev) => ({
        ...prev,
        [subtaskId]: {
          isUploading: false,
          progress: 0,
          statusText: '',
          error: uploadRes.error || 'อัปโหลดไฟล์ไม่สำเร็จ',
        },
      }))
      showError('ส่งไฟล์ไม่สำเร็จ', uploadRes.error || 'กรุณาลองใหม่อีกครั้ง')
      return
    }

    // Save to task_assignments in database
    const submitRes = await submitSubtaskWork({
      assignmentId: selectedTask.id,
      subtaskId: subtaskId === 'main' ? undefined : subtaskId,
      fileInfo: {
        url: uploadRes.url,
        fileName: uploadRes.fileName || file.name,
        fileSize: uploadRes.fileSize || file.size,
        fileType: uploadRes.fileType || file.type,
        driveFileId: uploadRes.driveFileId,
        folderUrl: uploadRes.folderUrl,
      },
      note: submissionNote,
      teacherId: user.id,
      allSubtaskCount: subtaskList.length,
    })

    setSubtaskProgress((prev) => ({
      ...prev,
      [subtaskId]: {
        isUploading: false,
        progress: 100,
        statusText: 'บันทึกเรียบร้อย',
      },
    }))

    if (submitRes.success) {
      showToast(`ส่งไฟล์ "${file.name}" สำเร็จเรียบร้อย 🎉`, 'success')
      await loadTasks()
      onSubmitted?.()
    } else {
      showError('ไม่สามารถบันทึกข้อมูลการส่งได้', submitRes.error)
    }
  }

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent, subtaskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSubtaskId(subtaskId)
  }

  const handleDragLeave = (e: React.DragEvent, subtaskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragOverSubtaskId === subtaskId) {
      setDragOverSubtaskId(null)
    }
  }

  const handleDrop = (e: React.DragEvent, subtaskId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverSubtaskId(null)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(subtaskId, e.dataTransfer.files[0])
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="flex min-h-full items-center justify-center p-1 sm:p-2">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col overflow-hidden my-auto max-h-[95vh]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-white/20 p-2 text-white shadow-xs backdrop-blur-xs">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold">ส่งไฟล์งานด่วน (Quick Submit)</h3>
                  <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
                    ลากไฟล์ส่งได้ทันที
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100">
                  ส่งไฟล์งานแยกตามแต่ละงานย่อย จัดเก็บลง Google Drive โรงเรียนอัตโนมัติ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                <span>กำลังโหลดรายการภาระงานของคุณ...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="font-semibold text-sm text-slate-800">ไม่มีภาระงานที่ต้องส่งในขณะนี้</p>
                <p className="text-xs text-slate-400">คุณได้ดำเนินการส่งภาระงานที่ได้รับมอบหมายครบถ้วนแล้ว</p>
              </div>
            ) : (
              <>
                {/* Task Selection Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                    <span>1. เลือกภาระงานที่ต้องการส่ง:</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      มีทั้งหมด {tasks.length} ภาระงาน
                    </span>
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all cursor-pointer"
                  >
                    {tasks.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.status === 'submitted' || item.status === 'approved' ? '✓ ' : '⏳ '}
                        {item.tasks?.title} ({item.tasks?.category || 'ทั่วไป'}) —{' '}
                        {item.status === 'approved'
                          ? 'ตรวจรับแล้ว'
                          : item.status === 'submitted'
                          ? 'ส่งแล้ว'
                          : item.status === 'in_progress'
                          ? 'กำลังทำ'
                          : 'รอส่งงาน'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Task Summary Card */}
                {selectedTask && (
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-white p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs sm:text-sm">
                        <CheckSquare className="h-4 w-4 text-emerald-600" />
                        <span>{selectedTask.tasks?.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {selectedTask.tasks?.category && (
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                            📁 {selectedTask.tasks.category}
                          </span>
                        )}
                        {selectedTask.tasks?.due_date && (
                          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>กำหนดส่ง: {new Date(selectedTask.tasks.due_date).toLocaleDateString('th-TH')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedTask.tasks?.description && (
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-5">
                        {selectedTask.tasks.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Subtasks or Main File Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                      <span>2. ส่งไฟล์งานแยกตามงานย่อย (ลากไฟล์เข้าได้เลย ไม่ต้องก๊อปลิงก์):</span>
                    </label>
                    {subtaskList.length > 0 && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ส่งแล้ว {completedIds.length} จาก {subtaskList.length} ข้อ
                      </span>
                    )}
                  </div>

                  {/* If task has subtasks */}
                  {subtaskList.length > 0 ? (
                    <div className="space-y-2.5">
                      {subtaskList.map((subtask, index) => {
                        const isDone = completedIds.includes(subtask.id)
                        const fileInfo = subtaskFiles[subtask.id]
                        const prog = subtaskProgress[subtask.id]
                        const isDrag = dragOverSubtaskId === subtask.id

                        return (
                          <div
                            key={subtask.id}
                            className={`rounded-xl border p-3 transition-all ${
                              isDrag
                                ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-400 shadow-md'
                                : isDone
                                ? 'border-emerald-200 bg-emerald-50/30'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onDragOver={(e) => handleDragOver(e, subtask.id)}
                            onDragLeave={(e) => handleDragLeave(e, subtask.id)}
                            onDrop={(e) => handleDrop(e, subtask.id)}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <span
                                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                    isDone
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {isDone ? '✓' : index + 1}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 text-xs">
                                    {subtask.title}
                                  </div>
                                  {fileInfo ? (
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-emerald-700">
                                      <span className="flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-emerald-200">
                                        <FileCheck className="h-3 w-3 text-emerald-600" />
                                        <span className="truncate max-w-xs font-mono">{fileInfo.fileName}</span>
                                        {fileInfo.fileSize && (
                                          <span className="text-slate-400">({formatFileSize(fileInfo.fileSize)})</span>
                                        )}
                                      </span>
                                      <a
                                        href={fileInfo.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-emerald-800 hover:underline font-semibold"
                                      >
                                        <span>เปิดดูผลงาน</span>
                                        <ExternalLink className="h-2.5 w-2.5" />
                                      </a>
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                      ยังไม่ได้ส่งไฟล์สำหรับข้อนี้
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Upload Action Button / Re-upload */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                <input
                                  type="file"
                                  ref={(el) => {
                                    fileInputRefs.current[subtask.id] = el
                                  }}
                                  className="hidden"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      handleFileUpload(subtask.id, e.target.files[0])
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={prog?.isUploading}
                                  onClick={() => fileInputRefs.current[subtask.id]?.click()}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                                    isDone
                                      ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                  }`}
                                >
                                  {prog?.isUploading ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>กำลังส่ง...</span>
                                    </>
                                  ) : isDone ? (
                                    <>
                                      <RefreshCw className="h-3 w-3" />
                                      <span>ส่งไฟล์ใหม่</span>
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-3 w-3" />
                                      <span>ลากหรือเลือกไฟล์</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Progress bar if uploading */}
                            {prog?.isUploading && (
                              <div className="mt-2 space-y-1 pt-1 border-t border-slate-100">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-semibold text-emerald-800 animate-pulse">
                                    {prog.statusText}
                                  </span>
                                  <span className="font-bold text-emerald-700">{prog.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${prog.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    /* Main File Single Upload Zone if no subtasks */
                    <div
                      className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                        dragOverSubtaskId === 'main'
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-400'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60 hover:border-slate-300'
                      }`}
                      onDragOver={(e) => handleDragOver(e, 'main')}
                      onDragLeave={(e) => handleDragLeave(e, 'main')}
                      onDrop={(e) => handleDrop(e, 'main')}
                    >
                      <input
                        type="file"
                        ref={(el) => {
                          fileInputRefs.current['main'] = el
                        }}
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileUpload('main', e.target.files[0])
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-slate-800">
                            ลากไฟล์ผลงานมาวางที่นี่ หรือ{' '}
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current['main']?.click()}
                              className="text-emerald-700 underline font-extrabold cursor-pointer hover:text-emerald-800"
                            >
                              คลิกเพื่อเลือกไฟล์
                            </button>
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            รองรับไฟล์ PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), รูปภาพ และ ZIP
                          </p>
                        </div>

                        {selectedTask?.submission_url && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 font-semibold">
                            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>เคยส่งไฟล์แล้ว:</span>
                            <a
                              href={selectedTask.submission_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-emerald-950 inline-flex items-center gap-0.5"
                            >
                              <span>เปิดดูผลงานเดิม ↗</span>
                            </a>
                          </div>
                        )}

                        {subtaskProgress['main']?.isUploading && (
                          <div className="w-full max-w-sm mt-3 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-emerald-800 animate-pulse">
                                {subtaskProgress['main'].statusText}
                              </span>
                              <span className="font-bold text-emerald-700">{subtaskProgress['main'].progress}%</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 rounded-full"
                                style={{ width: `${subtaskProgress['main'].progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Optional Teacher Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    บันทึกสรุปหรือข้อความถึงผู้ตรวจรับ (ไม่บังคับ):
                  </label>
                  <textarea
                    rows={2}
                    value={submissionNote}
                    onChange={(e) => setSubmissionNote(e.target.value)}
                    placeholder="เช่น ส่งครบทั้ง 3 สัปดาห์แล้วครับ หรือแจ้งรายละเอียดเพิ่มเติม..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
            <div className="text-[11px] text-slate-500 flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
              <span>ไฟล์จะถูกบันทึกและจัดหมวดใน Google Drive อัตโนมัติ</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 transition-colors cursor-pointer shadow-xs"
            >
              เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
