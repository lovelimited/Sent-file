export interface PresetAvatar {
  id: string
  name: string
  url: string
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 't1', name: 'คุณครูหญิง 1', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherFemale1' },
  { id: 't2', name: 'คุณครูชาย 1', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherMale1' },
  { id: 't3', name: 'คุณครูหญิง 2 (แว่นตา)', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherFemaleGlasses' },
  { id: 't4', name: 'คุณครูชาย 2 (เนกไท)', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherMaleTie' },
  { id: 't5', name: 'คุณครูหญิง 3', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherFemale3' },
  { id: 't6', name: 'คุณครูชาย 3', url: 'https://api.dicebear.com/7.x/personas/svg?seed=TeacherMale3' },
  { id: 'admin1', name: 'ผู้บริหาร / ผู้อำนวยการ', url: 'https://api.dicebear.com/7.x/personas/svg?seed=SchoolDirector' },
  { id: 'admin2', name: 'หัวหน้าฝ่ายวิชาการ / แอดมิน', url: 'https://api.dicebear.com/7.x/personas/svg?seed=AcademicAdmin' },
]

export function getAvatarUrl(url?: string | null, fallbackName?: string): string {
  if (url && url.trim()) return url.trim()
  const seed = fallbackName ? encodeURIComponent(fallbackName) : 'Teacher'
  return `https://api.dicebear.com/7.x/personas/svg?seed=${seed}`
}
