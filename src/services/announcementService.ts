import { supabase } from './supabase'

export interface Announcement {
  id: string
  author_id: string
  content: string
  image_url: string | null
  attachment_url?: string | null
  attachment_name?: string | null
  attachment_type?: string | null
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
  user_reaction?: string | null
  reaction_counts?: Record<string, number>
  latest_comment?: AnnouncementComment | null
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

export type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

export const REACTION_CONFIG: Record<
  ReactionType,
  { label: string; emoji: string; color: string }
> = {
  like: { label: 'ถูกใจ', emoji: '👍', color: 'text-emerald-600' },
  love: { label: 'รักเลย', emoji: '❤️', color: 'text-rose-600' },
  haha: { label: 'ฮาฮา', emoji: '😆', color: 'text-amber-500' },
  wow: { label: 'ว้าว', emoji: '😮', color: 'text-amber-500' },
  sad: { label: 'เศร้า', emoji: '😢', color: 'text-blue-500' },
  angry: { label: 'โกรธ', emoji: '😡', color: 'text-red-600' },
}

/**
 * Fetch all announcements with author info, likes count, comments count, latest comment preview
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

    // Enrich with likes, reactions, comments counts, and 1 preview comment
    const enriched = await Promise.all(
      ((data as unknown) as Announcement[]).map(async (ann) => {
        // Likes & Reactions
        const { data: likesData } = await supabase
          .from('announcement_likes')
          .select('id, user_id, reaction_type')
          .eq('announcement_id', ann.id)

        const likesCount = likesData?.length || 0
        const reactionCounts: Record<string, number> = {}
        let userReaction: string | null = null

        if (likesData) {
          for (const l of likesData) {
            const rType = l.reaction_type || 'like'
            reactionCounts[rType] = (reactionCounts[rType] || 0) + 1
            if (userId && l.user_id === userId) {
              userReaction = rType
            }
          }
        }

        // Comments Count
        const { count: commentsCount } = await supabase
          .from('announcement_comments')
          .select('id', { count: 'exact', head: true })
          .eq('announcement_id', ann.id)

        // 1 Latest Comment Preview
        const { data: latestComments } = await supabase
          .from('announcement_comments')
          .select('*, profiles:author_id(id, name, username, avatar_url, role)')
          .eq('announcement_id', ann.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const latestComment = latestComments && latestComments.length > 0 ? ((latestComments[0] as unknown) as AnnouncementComment) : null

        return {
          ...ann,
          likes_count: likesCount,
          reaction_counts: reactionCounts,
          comments_count: commentsCount || 0,
          user_has_liked: !!userReaction,
          user_reaction: userReaction,
          latest_comment: latestComment,
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
  imageUrl?: string | null,
  attachment?: {
    url: string
    name: string
    type?: string
  } | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanContent = content.trim()
    if (!cleanContent) {
      return { success: false, error: 'กรุณากรอกเนื้อหาประกาศ' }
    }

    const { error } = await supabase.from('announcements').insert({
      author_id: authorId,
      content: cleanContent,
      image_url: imageUrl || null,
      attachment_url: attachment?.url || null,
      attachment_name: attachment?.name || null,
      attachment_type: attachment?.type || null,
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
 * Toggle like / reaction on an announcement
 */
export async function toggleAnnouncementReaction(
  announcementId: string,
  userId: string,
  reactionType: ReactionType = 'like'
): Promise<{ success: boolean; liked: boolean; reaction: string | null; error?: string }> {
  try {
    const { data: existing } = await supabase
      .from('announcement_likes')
      .select('id, reaction_type')
      .eq('announcement_id', announcementId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      // If same reaction clicked: remove reaction (unlike)
      if (existing.reaction_type === reactionType) {
        const { error } = await supabase
          .from('announcement_likes')
          .delete()
          .eq('id', existing.id)

        if (error) return { success: false, liked: true, reaction: existing.reaction_type, error: error.message }
        return { success: true, liked: false, reaction: null }
      } else {
        // Different reaction clicked: change reaction
        const { error } = await supabase
          .from('announcement_likes')
          .update({ reaction_type: reactionType })
          .eq('id', existing.id)

        if (error) return { success: false, liked: true, reaction: existing.reaction_type, error: error.message }
        return { success: true, liked: true, reaction: reactionType }
      }
    } else {
      // New reaction
      const { error } = await supabase
        .from('announcement_likes')
        .insert({
          announcement_id: announcementId,
          user_id: userId,
          reaction_type: reactionType,
        })

      if (error) return { success: false, liked: false, reaction: null, error: error.message }
      return { success: true, liked: true, reaction: reactionType }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle reaction'
    return { success: false, liked: false, reaction: null, error: message }
  }
}

// Keep backward compatibility
export const toggleAnnouncementLike = (annId: string, uId: string) =>
  toggleAnnouncementReaction(annId, uId, 'like')

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
