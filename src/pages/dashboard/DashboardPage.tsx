import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  PieChart,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  Calendar,
  Search,
  ExternalLink,
  Loader2,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Send,
  ListTodo,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchTeacherTasks, type TeacherTaskItem } from '@/services/taskService'
import type { SubtaskItem, AssignmentStatus, TaskPriority } from '@/types/index'
import { TaskOverviewPage } from '@/pages/admin/TaskOverviewPage'

export const DashboardPage: React.FC = () => {
  const { user, profile, isAdmin } = useAuth()

  // Requirement 3: Admin dashboard is the school-wide TaskOverviewPage with circular proportion chart
  if (isAdmin) {
    return <TaskOverviewPage />
  }

  const [tasks, setTasks] = useState<TeacherTaskItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'submitted' | 'approved'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    let isMounted = true
    setIsLoading(true)

    // Strictly fetch ONLY the logged in user's tasks
    fetchTeacherTasks(user.id).then((res) => {
      if (isMounted) {
        if (res.data) setTasks(res.data)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Helper to compute subtasks breakdown and percent for a task
  const getTaskProgress = (item: TeacherTaskItem) => {
    const subtasks = ((item.tasks.subtasks as unknown as SubtaskItem[]) || [])
    const completedIds = new Set<string>(
      (item as unknown as { completed_subtask_ids?: string[] }).completed_subtask_ids || []
    )

    if (subtasks.length === 0) {
      // Simple task without subtasks
      if (item.status === 'approved') return { percent: 100, completed: [], missing: [], isSimple: true }
      if (item.status === 'submitted') return { percent: 100, completed: [{ id: 'all', title: 'ส่งเอกสารผลงานแล้ว' }], missing: [], isSimple: true }
      if (item.status === 'in_progress') return { percent: 50, completed: [], missing: [{ id: 'all', title: 'เอกสารผลงานตามคำสั่ง' }], isSimple: true }
      if (item.status === 'rejected') return { percent: 20, completed: [], missing: [{ id: 'all', title: 'แก้ไขเอกสารตามข้อเสนอแนะ' }], isSimple: true }
      return { percent: 0, completed: [], missing: [{ id: 'all', title: 'เอกสารผลงานตามคำสั่ง' }], isSimple: true }
    }

    // Task with subtasks (งานย่อย)
    if (item.status === 'approved') {
      return {
        percent: 100,
        completed: subtasks,
        missing: [],
        isSimple: false,
      }
    }

    const completed: SubtaskItem[] = []
    const missing: SubtaskItem[] = []

    subtasks.forEach((st) => {
      const isDone = completedIds.has(st.id) || (item.status === 'submitted' && completedIds.size === 0)
      if (isDone) {
        completed.push(st)
      } else {
        missing.push(st)
      }
    })

    const percent = subtasks.length > 0 ? Math.round((completed.length / subtasks.length) * 100) : 0
    return { percent, completed, missing, isSimple: false }
  }

  // Summary statistics
  const stats = useMemo(() => {
    const total = tasks.length
    const approved = tasks.filter((t) => t.status === 'approved').length
    const submitted = tasks.filter((t) => t.status === 'submitted').length
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'rejected').length

    let totalPercentSum = 0
    tasks.forEach((t) => {
      totalPercentSum += getTaskProgress(t).percent
    })
    const overallPercent = total > 0 ? Math.round(totalPercentSum / total) : 0

    return { total, approved, submitted, pending, overallPercent }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((item) => {
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && (item.status === 'pending' || item.status === 'rejected')) ||
        item.status === statusFilter

      const matchSearch =
        item.tasks.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.tasks.description && item.tasks.description.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchStatus && matchSearch
    })
  }, [tasks, statusFilter, searchQuery])

  // SVG Circular Progress Ring Component
  const renderCircularProgress = (percent: number, size = 64, strokeWidth = 6) => {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Track background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Green progress bar */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={percent === 100 ? '#059669' : percent > 0 ? '#10b981' : '#cbd5e1'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <span className="absolute font-bold text-xs text-slate-800">
          {percent}%
        </span>
      </div>
    )
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
      case 'approved':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs text-emerald-800 font-semibold">✅ ตรวจรับแล้ว</span>
      case 'submitted':
        return <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-xs text-purple-800 font-semibold">📤 ส่งแล้ว (รอตรวจ)</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs text-red-800 font-semibold">⚠️ ขอให้ส่งใหม่</span>
      case 'in_progress':
        return <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-xs text-teal-800 font-semibold">⚙️ กำลังทำ</span>
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs text-amber-800 font-semibold">⏳ รอส่งงาน</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/50 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 text-emerald-800 px-3 py-0.5 text-xs font-semibold mb-2">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              <span>แดชบอร์ดความก้าวหน้าภาระงานส่วนบุคคล</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <PieChart className="h-7 w-7 text-emerald-600" />
              <span>แดชบอร์ดงานของฉัน</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
              ติดตามความคืบหน้าการส่งภาระงานและงานย่อยของคุณ {profile?.name} แบบเรียลไทม์ (เฉพาะข้อมูลของคุณ ไม่สามารถดูงานของครูท่านอื่นได้)
            </p>
          </div>

          {/* Overall Circular Progress Card */}
          <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-200 p-4 shadow-xs self-start sm:self-auto">
            {renderCircularProgress(stats.overallPercent, 72, 7)}
            <div>
              <p className="text-[11px] text-slate-500 font-medium">ความก้าวหน้ารวมทั้งภาค</p>
              <p className="text-lg font-bold text-slate-900">{stats.overallPercent}% เสร็จสิ้น</p>
              <p className="text-[10px] text-emerald-700 mt-0.5">
                อนุมัติแล้ว {stats.approved} จาก {stats.total} งาน
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-600">งานทั้งหมด</span>
            <CheckSquare className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          <p className="text-[10px] text-slate-400 mt-1">ภาระงานที่ได้รับมอบหมาย</p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">ตรวจรับแล้ว</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-900">{stats.approved}</p>
          <p className="text-[10px] text-emerald-700/80 mt-1">ผ่านการอนุมัติสมบูรณ์</p>
        </div>

        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-xs font-bold">ส่งแล้วรอตรวจ</span>
            <Send className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900">{stats.submitted}</p>
          <p className="text-[10px] text-purple-700/80 mt-1">รอผู้บริหารตรวจรับ</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 mb-2">
            <span className="text-xs font-bold">ยังไม่ส่ง / ขอให้ส่งใหม่</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-950">{stats.pending}</p>
          <p className="text-[10px] text-amber-800/80 mt-1">ต้องรีบดำเนินการ</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด ({stats.total})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            รอส่งงาน ({stats.pending})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ส่งแล้วรอตรวจ ({stats.submitted})
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ตรวจรับแล้ว ({stats.approved})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่องานหรือคำชี้แจง..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Task Cards List with Circular Progress and Hover Tooltip */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังประมวลผลความก้าวหน้าภาระงานของคุณ...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 text-xs">
          <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">ไม่พบภาระงานในสถานะนี้</p>
          <p className="text-[11px] text-slate-400 mt-1">คุณได้ส่งภาระงานครบถ้วนแล้วหรือยังไม่มีภาระงานใหม่</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((item) => {
            const task = item.tasks
            const progress = getTaskProgress(item)
            const isHovered = hoveredTaskId === item.id
            const subtasks = (task.subtasks as unknown as SubtaskItem[]) || []

            return (
              <div
                key={item.id}
                className="relative rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all shadow-xs"
              >
                <div>
                  {/* Top Badges */}
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

                  {/* Title and Description */}
                  <div className="flex items-start justify-between gap-4 mt-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="mt-1 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Circular Progress Ring with Hover Trigger (ข้อ 6: โดนเฉพาะวงกลมเท่านั้น) */}
                    <div
                      className="shrink-0 relative cursor-pointer"
                      title="ชี้เมาส์เพื่อดูรายละเอียดงานย่อยที่ขาดและส่งแล้ว"
                      onMouseEnter={() => setHoveredTaskId(item.id)}
                      onMouseLeave={() => setHoveredTaskId(null)}
                    >
                      {renderCircularProgress(progress.percent, 58, 6)}

                      {/* Tooltip Popover attached strictly to circular ring */}
                      {isHovered && (
                        <div className="absolute top-full right-0 mt-2 z-50 w-72 rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-xs pointer-events-none">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                              <PieChart className="h-3.5 w-3.5 text-emerald-600" />
                              <span>รายละเอียดความคืบหน้า</span>
                            </span>
                            <span className="font-bold text-emerald-700 text-xs">
                              {progress.percent}%
                            </span>
                          </div>

                          {/* Completed subtasks section */}
                          <div className="space-y-1.5 mb-3">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>งานย่อยที่ส่งแล้ว ({progress.completed.length})</span>
                            </div>
                            {progress.completed.length === 0 ? (
                              <p className="text-[10px] text-slate-400 pl-4">ยังไม่มีงานย่อยที่ส่ง</p>
                            ) : (
                              <ul className="space-y-1 pl-4 text-[11px] text-slate-700">
                                {progress.completed.map((st, i) => (
                                  <li key={st.id || i} className="flex items-center gap-1.5">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span className="line-clamp-1">{st.title}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Missing subtasks section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                              <AlertCircle className="h-3 w-3 text-amber-600" />
                              <span>งานย่อยที่ยังขาด ({progress.missing.length})</span>
                            </div>
                            {progress.missing.length === 0 ? (
                              <p className="text-[10px] text-emerald-600 font-medium pl-4">
                                🎉 ส่งครบถ้วนทุกรายการแล้ว!
                              </p>
                            ) : (
                              <ul className="space-y-1 pl-4 text-[11px] text-slate-600">
                                {progress.missing.map((st, i) => (
                                  <li key={st.id || i} className="flex items-center gap-1.5">
                                    <span className="text-amber-500 font-bold">•</span>
                                    <span className="line-clamp-1">{st.title}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subtask count banner */}
                  {subtasks.length > 0 && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <ListTodo className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="font-semibold text-[11px]">งานย่อย:</span>
                        <span className="text-[11px] text-slate-500">
                          ส่งแล้ว {progress.completed.length} / {subtasks.length} ข้อ
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {progress.percent}%
                      </span>
                    </div>
                  )}

                  {/* Due date and Drive Link */}
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    {task.due_date && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>กำหนดส่ง: {new Date(task.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                      </div>
                    )}
                    {task.drive_folder_url && (
                      <a
                        href={task.drive_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium text-[11px]"
                      >
                        <FolderOpen className="h-3 w-3" />
                        <span>เปิด Drive ประจำงาน</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Footer of Card with Link to Submit */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10">
                  <span className="text-[11px] text-slate-400">
                    {item.submitted_at
                      ? `ส่งเมื่อ ${new Date(item.submitted_at).toLocaleDateString('th-TH')}`
                      : 'ยังไม่ได้ส่งผลงาน'}
                  </span>
                  <Link
                    to="/tasks"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors border border-emerald-200 cursor-pointer"
                  >
                    <span>เปิดหน้าส่งงาน</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default DashboardPage
