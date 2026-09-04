export interface PresetAvatar {
  id: string
  name: string
  url: string
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 't1', name: 'คุณครู 1', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherA' },
  { id: 't2', name: 'คุณครู 2', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherB' },
  { id: 't3', name: 'คุณครู 3', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherC' },
  { id: 't4', name: 'คุณครู 4', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherD' },
  { id: 't5', name: 'คุณครู 5', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherE' },
  { id: 't6', name: 'คุณครู 6', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=TeacherF' },
  { id: 'admin1', name: 'ผูเดวละระบบ', url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SchoolAdmin' },
  { id: 'admin2', name: 'ผูบริุ�าร', url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Principal' },
]

export function getAvatarUrl(url?: string | null, fallbackName?: string): string {
  if (url && url.trim()) return url.trim()
  const seed = fallbackName ? encodeURIComponent(fallbackName) : 'Teacher'
  return `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}`
}
