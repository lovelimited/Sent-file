import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Printer,
  Download,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Loader2,
  Users,
  ClipboardList,
  PieChart,
} from 'lucide-react'
import { supabase } from '@/services/supabase'
import { fetchAdminTasks, type AdminTaskItem } from '@/services/taskService'
import { fetchUsers, fetchGroups } from '@/services/userService'
import type { ProfileWithGroup } from '@/types/auth.types'
import type { UserGroup, AssignmentStatus } from '@/types/index'

interface AssignmentRecord {
  id: string
  task_id: string
  teacher_id: string
  status: AssignmentStatus
  submitted_at: string | null
  feedback?: string | null
}

export const TaskOverviewPage: React.FC = () => {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([])
  const [teachers, setTeachers] = useState<ProfileWithGroup[]>([])
  const [groups, setGroups] = useState<UserGroup[]>([])
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
  const [searchTeacher, setSearchTeacher] = useState<string>('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [tasksRes, usersRes, groupsRes, assignRes] = await Promise.all([
        fetchAdminTasks(),
        fetchUsers(),
        fetchGroups(),
        supabase
          .from('task_assignments')
          .select('id, task_id, teacher_id, status, submitted_at, feedback'),
      ])

      if (tasksRes.data) setTasks(tasksRes.data)
      if (usersRes.data) {
        // Filter out admin users from matrix, show teachers & staff
        setTeachers(usersRes.data.filter((u) => u.role !== 'admin'))
      }
      if (groupsRes.data) setGroups(groupsRes.data)
      if (assignRes.data) setAssignments(assignRes.data as AssignmentRecord[])
    } catch (err) {
      console.error('Error loading task overview data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Lookup map: `${teacherId}_${taskId}` -> AssignmentRecord
  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignmentRecord>()
    assignments.forEach((a) => {
      map.set(`${a.teacher_id}_${a.task_id}`, a)
    })
    return map
  }, [assignments])

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      if (selectedGroupId !== 'all' && t.group_id !== selectedGroupId) return false
      if (searchTeacher.trim()) {
        const q = searchTeacher.toLowerCase()
        const nameMatch = t.name?.toLowerCase().includes(q)
        const usernameMatch = t.username?.toLowerCase().includes(q)
        if (!nameMatch && !usernameMatch) return false
      }
      return true
    })
  }, [teachers, selectedGroupId, searchTeacher])

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Export CSV function
  const handleExportCSV = () => {
    if (tasks.length === 0 || filteredTeachers.length === 0) return

    const headers = ['ลำดับ', 'ชื่อ-นามสกุล', 'กลุ่มสาระการเรียนรู้', ...tasks.map((t) => `"${t.title.replace(/"/g, '""')}"`)]
    const rows = filteredTeachers.map((teacher, idx) => {
      const groupName = teacher.user_groups?.name || 'ไม่ระบุกลุ่ม'
      const statusCols = tasks.map((t) => {
        const a = assignmentMap.get(`${teacher.id}_${t.id}`)
        if (!a) return '"ไม่ได้มอบหมาย"'
        switch (a.status) {
          case 'approved':
            return '"อนุมัติแล้ว"'
          case 'submitted':
            return '"ส่งแล้วรอตรวจ"'
          case 'rejected':
            return '"ให้ส่งใหม่"'
          case 'in_progress':
            return '"กำลังทำ"'
          default:
            return '"ยังไม่ส่ง"'
        }
      })
      return [idx + 1, `"${teacher.name}"`, `"${groupName}"`, ...statusCols].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `ภาพรวมการส่งภาระงาน_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate stats
  let approvedCount = 0
  let submittedCount = 0
  let pendingCount = 0

  filteredTeachers.forEach((t) => {
    tasks.forEach((tsk) => {
      const a = assignmentMap.get(`${t.id}_${tsk.id}`)
      if (a) {
        if (a.status === 'approved') approvedCount++
        else if (a.status === 'submitted') submittedCount++
        else pendingCount++
      }
    })
  })

  // Calculate total assignments & proportions (Item 3)
  const totalAssignments = approvedCount + submittedCount + pendingCount
  const approvedPercent = totalAssignments > 0 ? Math.round((approvedCount / totalAssignments) * 100) : 0
  const submittedPercent = totalAssignments > 0 ? Math.round((submittedCount / totalAssignments) * 100) : 0
  const pendingPercent = totalAssignments > 0 ? Math.max(0, 100 - approvedPercent - submittedPercent) : 0

  // Donut geometry (R = 58, C ~ 364.425)
  const donutR = 58
  const donutC = 2 * Math.PI * donutR
  const approvedStroke = (approvedPercent / 100) * donutC
  const submittedStroke = (submittedPercent / 100) * donutC
  const pendingStroke = (pendingPercent / 100) * donutC

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <PieChart className="h-6 w-6 text-emerald-600" />
            <span>แดชบอร์ดภาพรวมการส่งงานของครู</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            วิเคราะห์สัดส่วนความก้าวหน้าทั้งโรงเรียน และตารางติดตามสถานะการส่งภาระงานของครูทุกคน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-600" />
            <span>ส่งออก CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>พิมพ์ / ส่งออก PDF</span>
          </button>
        </div>
      </div>

      {/* Circular Proportion Chart Card (ข้อ 3) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs print:hidden">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
              <PieChart className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">กราฟวงกลมแสดงสัดส่วนการส่งภาระงานทั้งโรงเรียน</h2>
              <p className="text-[11px] text-slate-500">สัดส่วนตามสถานะการส่งและการอนุมัติงานของครูทุกคน</p>
            </div>
          </div>
          <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
            มอบหมายรวม {totalAssignments} รายการ
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Donut Chart Display */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                {/* Background Ring */}
                <circle
                  cx="70"
                  cy="70"
                  r={donutR}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="16"
                />

                {/* Approved Segment (Green) */}
                {approvedPercent > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutR}
                    fill="transparent"
                    stroke="#10b981"
                    strokeWidth="16"
                    strokeDasharray={`${approvedStroke} ${donutC}`}
                    strokeDashoffset={0}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Submitted Segment (Amber) */}
                {submittedPercent > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutR}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth="16"
                    strokeDasharray={`${submittedStroke} ${donutC}`}
                    strokeDashoffset={-approvedStroke}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}

                {/* Pending Segment (Rose/Red) */}
                {pendingPercent > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r={donutR}
                    fill="transparent"
                    stroke="#fb7185"
                    strokeWidth="16"
                    strokeDasharray={`${pendingStroke} ${donutC}`}
                    strokeDashoffset={-(approvedStroke + submittedStroke)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                )}
              </svg>

              {/* Center Metrics */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                  {approvedPercent}%
                </span>
                <span className="text-[10px] font-bold text-emerald-700 mt-1 uppercase tracking-wider">
                  อนุมัติแล้ว
                </span>
                <span className="text-[9px] text-slate-400">
                  {approvedCount}/{totalAssignments}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-medium">สัดส่วนความสำเร็จภาพรวม</p>
          </div>

          {/* Proportions Breakdown Bars */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Approved Bar */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>ผ่านการอนุมัติแล้ว (Approved)</span>
                </span>
                <span className="font-bold text-emerald-800">
                  {approvedCount} รายการ ({approvedPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-emerald-200/60 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${approvedPercent}%` }}
                />
              </div>
            </div>

            {/* Submitted Bar */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>ส่งแล้วรอตรวจสอบ (Submitted)</span>
                </span>
                <span className="font-bold text-amber-800">
                  {submittedCount} รายการ ({submittedPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-amber-200/60 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-700"
                  style={{ width: `${submittedPercent}%` }}
                />
              </div>
            </div>

            {/* Pending Bar */}
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-rose-900 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shrink-0" />
                  <span>ยังไม่ส่ง / รอส่งงาน (Pending)</span>
                </span>
                <span className="font-bold text-rose-800">
                  {pendingCount} รายการ ({pendingPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-rose-200/60 overflow-hidden">
                <div
                  className="h-full bg-rose-400 rounded-full transition-all duration-700"
                  style={{ width: `${pendingPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 font-bold">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-emerald-700 font-medium">ครูที่แสดง</p>
            <p className="text-lg font-bold text-emerald-950">{filteredTeachers.length} ท่าน</p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3.5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 font-bold">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-amber-700 font-medium">ภาระงานทั้งหมด</p>
            <p className="text-lg font-bold text-amber-950">{tasks.length} ภาระงาน</p>
          </div>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0 font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-teal-700 font-medium">อนุมัติแล้ว</p>
            <p className="text-lg font-bold text-teal-950">{approvedCount} รายการ</p>
          </div>
        </div>

        <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3.5 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 shrink-0 font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] text-orange-700 font-medium">รอส่ง / รอตรวจ</p>
            <p className="text-lg font-bold text-orange-950">{submittedCount + pendingCount} รายการ</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {/* Group Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-600"
            >
              <option value="all">-- ทุกกลุ่มสาระการเรียนรู้ ({teachers.length} คน) --</option>
              {groups.map((g) => {
                const count = teachers.filter((t) => t.group_id === g.id).length
                return (
                  <option key={g.id} value={g.id}>
                    {g.name} ({count} คน)
                  </option>
                )
              })}
            </select>
          </div>

          {/* Search Teacher */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTeacher}
              onChange={(e) => setSearchTeacher(e.target.value)}
              placeholder="ค้นหาชื่อคุณครู..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-600 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>อนุมัติแล้ว</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            <span>ส่งแล้วรอตรวจ</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            <span>ให้ส่งใหม่</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span>ยังไม่ส่ง</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span>ไม่ได้มอบหมาย</span>
          </span>
        </div>
      </div>

      {/* Printable School Header (Only shown during window.print) */}
      <div className="hidden print:block mb-4 text-center border-b pb-3">
        <div className="flex items-center justify-center gap-3 mb-1">
          <img src="/school-logo.png" alt="School Logo" className="h-12 w-12 object-contain" />
          <div>
            <h2 className="text-base font-bold text-slate-900">โรงเรียนสารสาสน์วิเทศราชพฤกษ์</h2>
            <p className="text-xs text-slate-600">ตารางสรุปภาพรวมการส่งภาระงานและเอกสารราชการครู</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-500">
          พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • ระบบ School Work Club
        </p>
      </div>

      {/* Overview Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs text-slate-500">กำลังประมวลผลตารางภาพรวม...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 text-xs">
          ไม่พบข้อมูลคุณครูตามเงื่อนไขที่เลือก
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 text-xs">
          ยังไม่มีภาระงานในระบบ
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden print:border-none print:shadow-none">
          <div className="overflow-x-auto max-h-[70vh] print:max-h-none print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 text-slate-700 shadow-2xs print:static print:bg-slate-100">
                <tr>
                  <th className="sticky left-0 z-30 bg-slate-50 p-3 font-semibold text-center w-12 border-r border-slate-200 print:static print:bg-slate-100">
                    #
                  </th>
                  <th className="sticky left-12 z-30 bg-slate-50 p-3 font-semibold min-w-[180px] border-r border-slate-200 print:static print:bg-slate-100">
                    ชื่อ-นามสกุล / กลุ่มสาระฯ
                  </th>
                  {tasks.map((task) => (
                    <th
                      key={task.id}
                      className="p-3 font-semibold min-w-[140px] max-w-[200px] border-r border-slate-200 text-center"
                      title={task.title}
                    >
                      <div className="line-clamp-2 leading-tight font-medium text-slate-900">
                        {task.title}
                      </div>
                      {task.due_date && (
                        <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                          ส่ง: {new Date(task.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.map((teacher, index) => {
                  const groupName = teacher.user_groups?.name || 'ไม่ระบุกลุ่ม'
                  return (
                    <tr key={teacher.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Row Index */}
                      <td className="sticky left-0 z-10 bg-white p-3 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200 print:static">
                        {index + 1}
                      </td>

                      {/* Teacher Name & Group */}
                      <td className="sticky left-12 z-10 bg-white p-3 font-medium text-slate-900 border-r border-slate-200 print:static">
                        <div className="font-semibold text-slate-900 leading-tight">{teacher.name}</div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {groupName} (@{teacher.username})
                        </div>
                      </td>

                      {/* Task Cells */}
                      {tasks.map((task) => {
                        const assign = assignmentMap.get(`${teacher.id}_${task.id}`)

                        if (!assign) {
                          return (
                            <td
                              key={task.id}
                              className="p-2 text-center border-r border-slate-100 bg-slate-50/30 text-slate-300 text-[11px]"
                            >
                              -
                            </td>
                          )
                        }

                        let badge = null
                        if (assign.status === 'approved') {
                          badge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>อนุมัติแล้ว</span>
                            </span>
                          )
                        } else if (assign.status === 'submitted') {
                          badge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[10px] font-semibold">
                              <Send className="h-3 w-3 text-blue-600" />
                              <span>ส่งแล้ว</span>
                            </span>
                          )
                        } else if (assign.status === 'rejected') {
                          badge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-[10px] font-semibold">
                              <AlertCircle className="h-3 w-3 text-red-600" />
                              <span>ส่งใหม่</span>
                            </span>
                          )
                        } else {
                          badge = (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-medium">
                              <Clock className="h-3 w-3 text-amber-500" />
                              <span>ยังไม่ส่ง</span>
                            </span>
                          )
                        }

                        return (
                          <td key={task.id} className="p-2 text-center border-r border-slate-100">
                            {badge}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Signature Footer (Only in print view) */}
      <div className="hidden print:grid grid-cols-2 gap-12 mt-12 pt-8 text-center text-xs">
        <div>
          <p className="mb-12">ลงชื่อ.............................................................. ผู้สรุปรายงาน</p>
          <p className="font-semibold">(..............................................................)</p>
          <p className="text-slate-500 mt-1">ตำแหน่ง เจ้าหน้าที่ประสานงานภาระงาน</p>
        </div>
        <div>
          <p className="mb-12">ลงชื่อ.............................................................. ผู้บริหารรับรอง</p>
          <p className="font-semibold">(..............................................................)</p>
          <p className="text-slate-500 mt-1">ผู้อำนวยการ / รองผู้อำนวยการฝ่ายวิชาการ</p>
        </div>
      </div>
    </div>
  )
}
