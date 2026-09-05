import { supabase } from './supabase'

export interface TeacherRating {
  id: string
  teacher_id: string
  admin_id: string
  stars: number
  comment?: string | null
  category?: string | null
  created_at: string
  admin?: {
    id: string
    name: string
    username: string
  } | null
}

export interface TeacherRatingStats {
  average: number
  count: number
}

/**
 * Submit or update rating for a teacher by an admin
 */
export async function rateTeacher(
  teacherId: string,
  adminId: string,
  stars: number,
  comment?: string,
  category = 'general'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('teacher_ratings').insert({
      teacher_id: teacherId,
      admin_id: adminId,
      stars,
      comment: comment?.trim() || null,
      category,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to rate teacher'
    return { success: false, error: message }
  }
}

/**
 * Fetch all ratings for a specific teacher
 */
export async function fetchTeacherRatings(
  teacherId: string
): Promise<{ data: TeacherRating[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('teacher_ratings')
      .select('*, admin:admin_id(id, name, username)')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data as unknown) as TeacherRating[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch teacher ratings'
    return { data: null, error: message }
  }
}

/**
 * Fetch rating stats (average, count) for a list of teacher IDs
 */
export async function fetchTeachersRatingMap(
  teacherIds: string[]
): Promise<Record<string, TeacherRatingStats>> {
  if (!teacherIds || teacherIds.length === 0) return {}

  try {
    const { data, error } = await supabase
      .from('teacher_ratings')
      .select('teacher_id, stars')
      .in('teacher_id', teacherIds)

    if (error || !data) return {}

    const result: Record<string, { totalStars: number; count: number }> = {}

    for (const item of data) {
      if (!result[item.teacher_id]) {
        result[item.teacher_id] = { totalStars: 0, count: 0 }
      }
      result[item.teacher_id].totalStars += item.stars
      result[item.teacher_id].count += 1
    }

    const finalMap: Record<string, TeacherRatingStats> = {}
    for (const id in result) {
      finalMap[id] = {
        average: Number((result[id].totalStars / result[id].count).toFixed(1)),
        count: result[id].count,
      }
    }

    return finalMap
  } catch {
    return {}
  }
}
