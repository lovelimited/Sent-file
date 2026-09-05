/**
 * Utility functions for user formatting
 */

/**
 * Formats a chat display name to show only the first name (no surname),
 * both for teachers and admins.
 * 
 * Examples:
 * - "ครูสมศรี มีสุข" -> "ครูสมศรี"
 * - "นายสมชาย ใจดี" -> "นายสมชาย"
 * - "ครู สมพร จิตงาม" -> "ครู สมพร"
 * - "สมหวัง ชัยเจริญ" -> "สมหวัง"
 * - Role 'admin' or "ผู้ดูแลระบบ สารสาสน์" -> "ผู้ดูแลระบบ"
 */
export function formatChatDisplayName(fullName?: string | null, role?: string | null): string {
  if (role === 'admin') {
    return 'ผู้ดูแลระบบ'
  }

  if (!fullName || !fullName.trim()) {
    return 'คุณครู'
  }

  const trimmed = fullName.trim()
  if (trimmed.toLowerCase().includes('admin') || trimmed.includes('ผู้ดูแลระบบ')) {
    return 'ผู้ดูแลระบบ'
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length <= 1) {
    return parts[0]
  }

  // Titles that might be spaced before first name
  const separateTitles = ['นาย', 'นาง', 'นางสาว', 'ครู', 'ดร.', 'ศ.', 'รศ.', 'ผศ.', 'อาจารย์', 'ว่าที่', 'ร.ต.']
  if (separateTitles.includes(parts[0]) && parts.length >= 2) {
    return `${parts[0]} ${parts[1]}`
  }

  return parts[0]
}
