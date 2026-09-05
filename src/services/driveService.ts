import { supabase } from './supabase'
import type { DriveResource } from '@/types/index'

export interface DriveResourceWithGroup extends DriveResource {
  user_groups?: { name: string } | null
}

export interface CreateDriveResourcePayload {
  title: string
  description?: string
  category: string
  url: string
  group_id?: string | null
  created_by?: string | null
  file_size?: number | null
  file_type?: string | null
}

/**
 * Fetch drive resources:
 * Non-admins see only their own resources (created_by === userId).
 * Admins see all resources.
 */
export async function fetchDriveResources(
  userId?: string,
  isAdmin?: boolean
): Promise<{
  data: DriveResourceWithGroup[] | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('drive_resources')
      .select('*, user_groups(name)')
      .order('category', { ascending: true })
      .order('created_at', { ascending: false })

    if (!isAdmin && userId) {
      query = query.eq('created_by', userId)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as DriveResourceWithGroup[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch drive resources'
    return { data: null, error: message }
  }
}

/**
 * Create a new drive resource or uploaded file
 */
export async function createDriveResource(
  payload: CreateDriveResourcePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanTitle = payload.title.trim()
    const cleanUrl = payload.url.trim()

    if (!cleanTitle) {
      return { success: false, error: 'กรุณาระบุชื่อทรัพยากร' }
    }
    if (!cleanUrl) {
      return { success: false, error: 'กรุณาระบุลิงก์หรืออัปโหลดไฟล์' }
    }

    const { data, error } = await supabase
      .from('drive_resources')
      .insert({
        title: cleanTitle,
        description: payload.description?.trim() || null,
        category: payload.category.trim(),
        url: cleanUrl,
        group_id: payload.group_id || null,
        created_by: payload.created_by || null,
        file_size: payload.file_size || null,
        file_type: payload.file_type || null,
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    if (payload.created_by && data) {
      await supabase.from('activity_logs').insert({
        user_id: payload.created_by,
        action: 'create_drive_resource',
        target_type: 'drive_resource',
        target_id: data.id,
        details: { title: cleanTitle, category: payload.category },
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create drive resource'
    return { success: false, error: message }
  }
}

/**
 * Update an existing drive resource
 */
export async function updateDriveResource(
  id: string,
  payload: Partial<Pick<DriveResource, 'title' | 'description' | 'url' | 'group_id'>> & {
    category?: string
    file_size?: number | null
    file_type?: string | null
  },
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('drive_resources')
      .update(payload)
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    if (adminId) {
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        action: 'update_drive_resource',
        target_type: 'drive_resource',
        target_id: id,
        details: payload,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update drive resource'
    return { success: false, error: message }
  }
}

/**
 * Delete a drive resource
 */
export async function deleteDriveResource(
  id: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('drive_resources').delete().eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    if (adminId) {
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        action: 'delete_drive_resource',
        target_type: 'drive_resource',
        target_id: id,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete drive resource'
    return { success: false, error: message }
  }
}

/**
 * Fetch master Google Drive folder URL from system settings
 */
export async function getMasterDriveUrl(): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'master_google_drive_url')
      .maybeSingle()
    if (data?.value) return data.value
  } catch {}
  return 'https://drive.google.com/drive/folders/1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'
}

/**
 * Update master Google Drive folder URL in system settings
 */
export async function updateMasterDriveUrl(
  url: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'master_google_drive_url',
      value: url.trim(),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update master drive url'
    return { success: false, error: message }
  }
}

