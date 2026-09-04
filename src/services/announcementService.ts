import { supabase } from './supabase'

export interface Announcement {
  id: string
  author_id: string
  content: string
  image_url: string | null
  created_at: string
  profiles?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
    role: string
  } | null
  likes_count?: number
  comments_count?: number
  user_has_liked?: boolean
}

export interface AnnouncementComment {
  id: string
  announcement_id: string
  author_id: string
  content: string
  created_at: string
  profiles?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
    role: string
  } | null
}

/**
 * Fetch all announcements with author info, likes count, comments count
 */
export async function fetchAnnouncements(
  userId?: string,
  limit = 20
): Promise<{ data: Announcement[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*, profiles:author_id(id, name, username, avatar_url, role)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: null, error: error.message }
    }

    // Enrich with likes and comments counts
    const enriched = await Promise.all(
      ((data as unknown) as Announcement[]).map(async (ann) => {
        const { count: likesCount } = await supabase
          .from('announcement_likes')
          .select('id', { count: 'exact', head: true })
          .eq('announcement_id', ann.id)

        const { count: commentsCount } = await supabase
          .from('announcement_comments')
          .select('id', { count: 'exact', head: true })
          .eq('announcement_id', ann.id)

        let userHasLiked = false
        if (userId) {
          const { data: likeData } = await supabase
            .from('announcement_likes')
            .select('id')
            .eq('announcement_id', ann.id)
            .eq('user_id', userId)
            .maybeSingle()
          userHasLiked = !!likeData
        }

        return {
          ...ann,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          user_has_liked: userHasLiked,
        }
      })
    )

    return { data: enriched, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch announcements'
    return { data: null, error: message }
  }
}

/**
 * Create a new announcement (Admin only)
 */
export async function createAnnouncement(
  authorId: string,
  content: string,
  imageUrl?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return { success: false, error: 'กรุณากรอกเนื้อหาประกาศ' }
    }

    const { error } = await supabase
      .from('announcements')
      .insert({
        author_id: authorId,
        content: cleanContent,
        image_url: imageUrl?.trim() || null,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create announcement'
    return { success: false, error: message }
  }
}

/**
 * Delete an announcement (Admin only)
 */
export async function deleteAnnouncement(
  announcementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete announcement'
    return { success: false, error: message }
  }
}

/**
 * Toggle like on an announcement
 */
export async function toggleAnnouncementLike(
  announcementId: string,
  userId: string
): Promise<{ success: boolean; liked: boolean; error?: string }> {
  try {
    // Check if already liked
    const { data: existing } = await supabase
      .from('announcement_likes')
      .select('id')
      .eq('announcement_id', announcementId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // Unlike
      const { error } = await supabase
        .from('announcement_likes')
        .delete()
        .eq('id', existing.id)

      if (error) return { success: false, liked: true, error: error.message }
      return { success: true, liked: false }
    } else {
      // Like
      const { error } = await supabase
        .from('announcement_likes')
        .insert({
          announcement_id: announcementId,
          user_id: userId,
        })

      if (error) return { success: false, liked: false, error: error.message }
      return { success: true, liked: true }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle like'
    return { success: false, liked: false, error: message }
  }
}

/**
 * Fetch comments for an announcement
 */
export async function fetchAnnouncementComments(
  announcementId: string
): Promise<{ data: AnnouncementComment[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('announcement_comments')
      .select('*, profiles:author_id(id, name, username, avatar_url, role)')
      .eq('announcement_id', announcementId)
      .order('created_at', { ascending: true })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data as unknown) as AnnouncementComment[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch comments'
    return { data: null, error: message }
  }
}

/**
 * Add a comment to an announcement
 */
export async function addAnnouncementComment(
  announcementId: string,
  authorId: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return { success: false, error: 'กรุณากรอกข้อความ' }
    }

    const { error } = await supabase
      .from('announcement_comments')
      .insert({
        announcement_id: announcementId,
        author_id: authorId,
        content: cleanContent,
      })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add comment'
    return { success: false, error: message }
  }
}
