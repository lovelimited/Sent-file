import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  CheckSquare,
  Send,
  X,
  Loader2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Printer,
  FileText,
  FolderOpen,
  CheckCircle2,
  Check,
  ListTodo,
  Star,
  Search,
  Download,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TaskPriority, AssignmentStatus, SubtaskItem } from '@/types/index'
import { fetchTeacherTasks, type TeacherTaskItem } from '@/services/taskService'
import { fetchTeacherRatings, type TeacherRating } from '@/services/ratingService'
import { PrintableTaskSlip } from '@/components/tasks/PrintableTaskSlip'
import { QuickSubmitModal } from '@/components/tasks/QuickSubmitModal'
import { supabase } from '@/services/supabase'
import { showError } from '@/utils/sweetalert'

export const TeacherTasksPage: React.FC = () => {
  const { user, isAdmin } = useAuth()
  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted' | 'approved' | 'all'>('pending')
  const [hasAutoSwitchedTab, setHasAutoSwitchedTab] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [now] = useState(Date.now)

  // Teacher ratings from admin
  const [myRatings, setMyRatings] = useState<TeacherRating[]>([])

  // Modal states
  const [viewingTask, setViewingTask] = useState<TeacherTaskItem | null>(null)
  const [selectedTask, setSelectedTask] = useState<TeacherTaskItem | null>(null)
  const [taskToPrint, setTaskToPrint] = useState<TeacherTaskItem | null>(null)

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

  // Auto-switch to 'all' tab if pending count is 0 and tasks exist (ข้อ 5)
  useEffect(() => {
    if (!isLoading && tasks.length > 0 && !hasAutoSwitchedTab) {
      const pending = tasks.filter(
        (t) => t.status === 'pending' || t.status === 'in_progress' || t.status === 'rejected'
      ).length

      if (pending === 0) {
        setActiveTab('all')
        setHasAutoSwitchedTab(true)
      }
    }
  }, [isLoading, tasks, hasAutoSwitchedTab])

  // Toggle completed subtask (ข้อ 1)
  const handleToggleSubtask = async (assignmentId: string, subtaskId: string, currentCompletedIds: string[]) => {
    const isDone = currentCompletedIds.includes(subtaskId)
    const newCompleted = isDone
      ? currentCompletedIds.filter((id) => id !== subtaskId)
      : [...currentCompletedIds, subtaskId]

    setTasks((prev) =>
      prev.map((item) =>
        item.id === assignmentId ? { ...item, completed_subtask_ids: newCompleted } : item
      )
    )

    if (viewingTask && viewingTask.id === assignmentId) {
      setViewingTask({ ...viewingTask, completed_subtask_ids: newCompleted })
    }

    try {
      await supabase
        .from('task_assignments')
        .update({ completed_subtask_ids: newCompleted })
        .eq('id', assignmentId)
    } catch {
      // rollback if error
    }
  }

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

      {/* Completion Banner (ข้อ 5: แสดงเมื่อส่งงานครบทั้งหมดแล้ว) */}
      {pendingCount === 0 && tasks.length > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-4 sm:p-5 text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-emerald-950">
                🎉 ยอดเยี่ยมมาก! คุณครูส่งภาระงานที่ได้รับมอบหมายครบถ้วนแล้ว
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                ขณะนี้แสดงภาระงานทั้งหมด ({tasks.length} งาน) คุณครูสามารถเปิดดูรายละเอียดงาน หรือพิมพ์ใบนำส่งได้ตลอดเวลา
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            ดูงานทั้งหมด
          </button>
        </div>
      )}

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

                  {/* Subtasks Checklist (ข้อ 1: แสดงงานย่อยให้ดูได้ง่ายๆ พร้อม Progress) */}
                  {subtasksList.length > 0 && (() => {
                    const completedIds = (item.completed_subtask_ids as string[]) || []
                    const completedCount = subtasksList.filter((st) => completedIds.includes(st.id)).length
                    const percent = Math.round((completedCount / subtasksList.length) * 100)

                    return (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-950">
                          <div className="flex items-center gap-1.5">
                            <ListTodo className="h-3.5 w-3.5 text-emerald-600" />
                            <span>งานย่อย ({completedCount}/{subtasksList.length} ข้อ):</span>
                          </div>
                          <span className="text-emerald-700 font-semibold">{percent}%</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-emerald-200/60 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {/* Preview first 3 subtasks */}
                        <div className="space-y-1 pt-0.5">
                          {subtasksList.slice(0, 3).map((st, idx) => {
                            const isDone = completedIds.includes(st.id)
                            return (
                              <div
                                key={st.id || idx}
                                onClick={() => handleToggleSubtask(item.id, st.id, completedIds)}
                                className="flex items-center gap-2 text-slate-700 text-[11px] cursor-pointer hover:text-emerald-900 transition-colors"
                              >
                                <span
                                  className={`h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isDone && <Check className="h-2.5 w-2.5" />}
                                </span>
                                <span className={isDone ? 'line-through text-slate-400' : 'text-slate-700'}>
                                  {st.title}
                                </span>
                              </div>
                            )
                          })}
                          {subtasksList.length > 3 && (
                            <button
                              type="button"
                              onClick={() => setViewingTask(item)}
                              className="text-[10px] text-emerald-700 hover:underline pl-5 block text-left"
                            >
                              + และอีก {subtasksList.length - 3} ข้อ (คลิกเพื่อดูทั้งหมด)
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })()}

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

                  <div className="flex items-center gap-1.5">
                    {/* View Details Button (ข้อ 1: เปิดเข้าไปดูงานได้ง่าย) */}
                    <button
                      type="button"
                      onClick={() => setViewingTask(item)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                      title="ดูรายละเอียดภาระงานและเอกสารแนบ"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ดูงาน</span>
                    </button>

                    {item.status !== 'pending' && (
                      <button
                        type="button"
                        onClick={() => setTaskToPrint(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="พิมพ์ใบนำส่งภาระงานราชการ"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-600" />
                        <span className="hidden sm:inline">ใบนำส่ง</span>
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
      {/* Modal: Quick Submit Subtasks & Google Drive */}
      {/* ===================================================================== */}
      {selectedTask && (
        <QuickSubmitModal
          isOpen={!!selectedTask}
          initialTaskId={selectedTask.id}
          onClose={() => setSelectedTask(null)}
          onSubmitted={() => {
            loadTasks();
          }}
        />
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

      {/* ===================================================================== */}
      {/* Modal: Task Details & Attachments (ข้อ 1: เปิดเข้าไปดูงานได้ ดาวน์โหลดได้ แสดงงานย่อยง่ายๆ) */}
      {/* ===================================================================== */}
      {viewingTask && (() => {
        const t = viewingTask.tasks
        const subtasksList = (t.subtasks as unknown as SubtaskItem[]) || []
        const completedIds = (viewingTask.completed_subtask_ids as string[]) || []
        const completedCount = subtasksList.filter((s) => completedIds.includes(s.id)).length
        const percent = subtasksList.length ? Math.round((completedCount / subtasksList.length) * 100) : 0

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-600 p-2 text-white shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      {renderPriorityBadge(t.priority)}
                      {renderStatusBadge(viewingTask.status)}
                      {t.user_groups?.name && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded font-medium">
                          {t.user_groups.name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{t.title}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingTask(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
                {/* Due Date & Assignment info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">กำหนดส่งงาน (Due Date)</p>
                      <p className="text-xs font-semibold text-slate-800">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : 'ไม่ระบุกำหนดส่ง'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium">หมวดหมู่ภาระงาน</p>
                      <p className="text-xs font-semibold text-slate-800">
                        {(t as any).category || 'ภาระงานทั่วไป'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-bold text-slate-900 mb-1.5 text-xs flex items-center gap-1.5">
                    <CheckSquare className="h-4 w-4 text-emerald-600" />
                    <span>คำชี้แจงและรายละเอียดภาระงาน</span>
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 leading-relaxed whitespace-pre-wrap text-slate-800">
                    {t.description || 'ไม่มีคำชี้แจงเพิ่มเติม'}
                  </div>
                </div>

                {/* Subtasks Section (ข้อ 1: แสดงงานย่อยและสามารถติ๊กถูกได้สะดวก) */}
                {subtasksList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <ListTodo className="h-4 w-4 text-emerald-600" />
                        <span>รายการงานย่อยที่ต้องดำเนินการ ({completedCount}/{subtasksList.length} ข้อ)</span>
                      </h4>
                      <span className="font-bold text-emerald-700 text-xs">{percent}% สำเร็จแล้ว</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white overflow-hidden shadow-2xs">
                      {subtasksList.map((st, idx) => {
                        const isDone = completedIds.includes(st.id)
                        const fileInfo = (viewingTask.subtask_files as Record<string, any>)?.[st.id]
                        return (
                          <div
                            key={st.id || idx}
                            className={`p-3 text-xs transition-colors ${
                              isDone ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div
                                onClick={() => handleToggleSubtask(viewingTask.id, st.id, completedIds)}
                                className="flex items-center gap-3 cursor-pointer flex-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={isDone}
                                  readOnly
                                  className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <span className={`font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                  {st.title}
                                </span>
                              </div>
                              {fileInfo && (
                                <a
                                  href={fileInfo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-200 hover:bg-emerald-100 shrink-0"
                                >
                                  <FileText className="h-3 w-3 text-emerald-600" />
                                  <span className="truncate max-w-[130px] font-mono">{fileInfo.fileName}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 pl-1">
                      💡 คลิกที่รายการเพื่อทำเครื่องหมายว่าดำเนินการแล้วเสร็จ ระบบจะบันทึกความคืบหน้าให้โดยอัตโนมัติ
                    </p>
                  </div>
                )}

                {/* Attachments & Google Drive Folder Section */}
                <div className="space-y-2.5">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <FolderOpen className="h-4 w-4 text-emerald-600" />
                    <span>เอกสารประกอบและไดรฟ์สำหรับส่งงาน</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {t.drive_folder_url && (
                      <a
                        href={t.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-950 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderOpen className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-semibold text-xs">โฟลเดอร์ Google Drive ประจำงาน</p>
                            <p className="text-[10px] text-emerald-700">เปิดเพื่ออัปโหลดไฟล์ลงโฟลเดอร์นี้</p>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                      </a>
                    )}

                    {viewingTask.submission_url && (
                      <a
                        href={viewingTask.submission_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-950 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Download className="h-5 w-5 text-blue-600 shrink-0" />
                          <div>
                            <p className="font-semibold text-xs">ดาวน์โหลดไฟล์ผลงานที่ส่ง</p>
                            <p className="text-[10px] text-blue-700">เปิดดูเอกสารหรือไฟล์ที่ท่านได้ส่ง</p>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                      </a>
                    )}
                  </div>
                </div>

                {/* My Submission Info */}
                {viewingTask.status !== 'pending' && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2">
                    <h4 className="font-bold text-slate-900 text-xs">ข้อมูลการส่งงานของท่าน</h4>
                    <p className="text-[11px] text-slate-500">
                      ส่งเมื่อ: {viewingTask.submitted_at ? new Date(viewingTask.submitted_at).toLocaleString('th-TH') : '-'}
                    </p>
                    {viewingTask.submission_note && (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                        {viewingTask.submission_note}
                      </p>
                    )}
                    {viewingTask.feedback && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <p className="font-semibold text-[11px]">ข้อเสนอแนะจากผู้ตรวจ:</p>
                        <p className="text-xs mt-0.5">{viewingTask.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingTask(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  ปิด
                </button>

                <div className="flex items-center gap-2">
                  {viewingTask.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        setTaskToPrint(viewingTask)
                        setViewingTask(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" />
                      <span>พิมพ์ใบนำส่ง</span>
                    </button>
                  )}

                  {!isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenSubmitModal(viewingTask)
                        setViewingTask(null)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{viewingTask.status === 'pending' ? 'ส่งผลงานชิ้นนี้' : 'แก้ไขผลงานที่ส่ง'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
