import type { TaskSubmissionItem } from '@/services/taskService'
import type { ProfileWithGroup } from '@/types/auth.types'
import type { ActivityLogWithProfile } from '@/services/userService'

/**
 * Helper to escape and format a cell value for CSV (RFC 4180 compliant)
 */
function escapeCSVCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""'
  }
  const stringValue = String(value)
  // Escape double quotes by doubling them
  return `"${stringValue.replace(/"/g, '""')}"`
}

/**
 * Triggers a browser file download with UTF-8 BOM for Microsoft Excel compatibility
 */
function downloadCSV(csvContent: string, fileName: string) {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) needed by Excel to recognize Thai UTF-8 text
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Format status in Thai
 */
function formatSubmissionStatus(status: string): string {
  switch (status) {
    case 'approved':
      return 'อนุมัติแล้ว'
    case 'submitted':
      return 'ส่งแล้ว (รอตรวจ)'
    case 'rejected':
      return 'ให้ส่งใหม่ (ต้องแก้ไข)'
    case 'in_progress':
      return 'กำลังดำเนินการ'
    case 'pending':
    default:
      return 'ยังไม่ส่งงาน'
  }
}

/**
 * Export task submission progress to CSV
 */
export function exportTaskSubmissionsToCSV(taskTitle: string, submissions: TaskSubmissionItem[]) {
  const headers = [
    'ลำดับ',
    'ชื่อ-นามสกุล',
    'ชื่อผู้ใช้งาน',
    'กลุ่มสาระการเรียนรู้',
    'สถานะการส่งงาน',
    'วันที่ส่งงาน',
    'บันทึกสรุปผลงาน',
    'ลิงก์ผลงาน',
    'ข้อเสนอแนะจากผู้ตรวจ',
    'ผู้ตรวจงาน',
  ]

  const rows = submissions.map((sub, index) => {
    const teacher = sub.profiles
    return [
      escapeCSVCell(index + 1),
      escapeCSVCell(teacher?.name || '-'),
      escapeCSVCell(teacher?.username ? `@${teacher.username}` : '-'),
      escapeCSVCell(teacher?.user_groups?.name || 'ไม่ระบุกลุ่ม'),
      escapeCSVCell(formatSubmissionStatus(sub.status)),
      escapeCSVCell(sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('th-TH') : '-'),
      escapeCSVCell(sub.submission_note || '-'),
      escapeCSVCell(sub.submission_url || '-'),
      escapeCSVCell(sub.feedback || '-'),
      escapeCSVCell(sub.reviewer?.name || '-'),
    ].join(',')
  })

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().split('T')[0]
  const cleanTitle = taskTitle.replace(/[/\\?%*:|"<>]/g, '_')
  downloadCSV(csvContent, `รายงานการส่งงาน_${cleanTitle}_${dateStr}.csv`)
}

/**
 * Export teacher directory to CSV
 */
export function exportTeachersToCSV(teachers: ProfileWithGroup[]) {
  const headers = [
    'ลำดับ',
    'ชื่อ-นามสกุล',
    'ชื่อผู้ใช้งาน',
    'บทบาท',
    'กลุ่มสาระการเรียนรู้',
    'สถานะการใช้งาน',
    'เข้าสู่ระบบล่าสุด',
  ]

  const rows = teachers.map((teacher, index) => {
    return [
      escapeCSVCell(index + 1),
      escapeCSVCell(teacher.name),
      escapeCSVCell(`@${teacher.username}`),
      escapeCSVCell(teacher.role === 'admin' ? 'ผู้ดูแลระบบ' : 'คุณครู'),
      escapeCSVCell(teacher.user_groups?.name || 'ยังไม่ระบุกลุ่ม'),
      escapeCSVCell(teacher.active ? 'ใช้งานปกติ' : 'ระงับสิทธิ์ชั่วคราว'),
      escapeCSVCell(teacher.last_seen ? new Date(teacher.last_seen).toLocaleString('th-TH') : 'ไม่เคยเข้าใช้งาน'),
    ].join(',')
  })

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().split('T')[0]
  downloadCSV(csvContent, `รายชื่อครูและบุคลากร_${dateStr}.csv`)
}

/**
 * Export activity logs to CSV
 */
export function exportActivityLogsToCSV(logs: ActivityLogWithProfile[]) {
  const headers = [
    'ลำดับ',
    'วันที่-เวลา',
    'ผู้ดำเนินการ',
    'ชื่อผู้ใช้',
    'กิจกรรม',
    'ประเภทเป้าหมาย',
    'รหัสเป้าหมาย',
    'รายละเอียดเพิ่มเติม',
  ]

  const rows = logs.map((log, index) => {
    return [
      escapeCSVCell(index + 1),
      escapeCSVCell(new Date(log.created_at).toLocaleString('th-TH')),
      escapeCSVCell(log.profiles?.name || 'ระบบส่วนกลาง'),
      escapeCSVCell(log.profiles?.username ? `@${log.profiles.username}` : '-'),
      escapeCSVCell(log.action),
      escapeCSVCell(log.target_type || '-'),
      escapeCSVCell(log.target_id || '-'),
      escapeCSVCell(log.details ? JSON.stringify(log.details) : '-'),
    ].join(',')
  })

  const csvContent = [headers.map(escapeCSVCell).join(','), ...rows].join('\r\n')
  const dateStr = new Date().toISOString().split('T')[0]
  downloadCSV(csvContent, `บันทึกกิจกรรมระบบ_${dateStr}.csv`)
}
