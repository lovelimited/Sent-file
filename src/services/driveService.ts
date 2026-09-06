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

/**
 * Fetch Google Apps Script Web App URL from system settings
 */
export async function getGasWebAppUrl(): Promise<string> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'gas_web_app_url')
      .maybeSingle()
    if (data?.value) return data.value
  } catch {}
  return ''
}

/**
 * Update Google Apps Script Web App URL in system settings
 */
export async function updateGasWebAppUrl(
  url: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('system_settings').upsert({
      key: 'gas_web_app_url',
      value: url.trim(),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update GAS Web App url'
    return { success: false, error: message }
  }
}

export interface UploadProgressInfo {
  percent: number
  status: 'idle' | 'reading' | 'uploading' | 'processing' | 'completed' | 'error'
  message: string
}

export interface UploadSubmissionFileParams {
  file: File
  category?: string
  taskTitle?: string
  teacherName?: string
  subtaskTitle?: string
  onProgress?: (info: UploadProgressInfo) => void
}

export interface UploadSubmissionResult {
  success: boolean
  url?: string
  fileName?: string
  fileSize?: number
  fileType?: string
  driveFileId?: string
  folderUrl?: string
  error?: string
  isGoogleDrive?: boolean
}

/**
 * Convert a File object to Base64 string
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // remove data:*;base64, prefix
      const base64 = result.includes('base64,') ? result.split('base64,')[1] : result
      resolve(base64)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Upload submission file directly to Google Drive via Apps Script Web App
 * with dynamic progress tracking, falling back to Supabase Storage if unconfigured
 */
export async function uploadSubmissionFile(
  params: UploadSubmissionFileParams
): Promise<UploadSubmissionResult> {
  const { file, category, taskTitle, teacherName, subtaskTitle, onProgress } = params

  try {
    onProgress?.({
      percent: 15,
      status: 'reading',
      message: 'กำลังจัดเตรียมและอ่านไฟล์จากเครื่องคอมพิวเตอร์...',
    })

    const gasUrl = await getGasWebAppUrl()
    const masterDriveUrl = await getMasterDriveUrl()

    // Extract Master Folder ID from Master Drive URL if present
    let masterFolderId = '1cPV7A4j49UAtOSEZQMKOMAllsm6LDv5i'
    const folderMatch = masterDriveUrl.match(/folders\/([a-zA-Z0-9_-]+)/)
    if (folderMatch && folderMatch[1]) {
      masterFolderId = folderMatch[1]
    }

    // Attempt 1: Google Apps Script Web App Upload
    if (gasUrl && gasUrl.startsWith('http')) {
      try {
        onProgress?.({
          percent: 30,
          status: 'reading',
          message: 'กำลังเข้ารหัสไฟล์สำหรับส่งเข้า Google Drive...',
        })

        const base64Data = await fileToBase64(file)

        onProgress?.({
          percent: 55,
          status: 'uploading',
          message: 'กำลังส่งไฟล์เข้าสู่โฟลเดอร์ Google Drive...',
        })

        const payload = {
          action: 'uploadFile',
          fileData: base64Data,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          category: category || 'ทั่วไป',
          taskTitle: taskTitle || 'ภาระงาน',
          teacherName: teacherName || 'คุณครู',
          subtaskTitle: subtaskTitle || '',
          masterFolderId: masterFolderId,
        }

        onProgress?.({
          percent: 75,
          status: 'processing',
          message: 'Google Drive กำลังสร้างโฟลเดอร์และบันทึกไฟล์...',
        })

        const response = await fetch(gasUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        })

        if (response.ok) {
          const result = await response.json()
          if (result && result.success) {
            onProgress?.({
              percent: 100,
              status: 'completed',
              message: 'บันทึกไฟล์ลง Google Drive เรียบร้อยสมบูรณ์! 🎉',
            })

            return {
              success: true,
              url: result.fileUrl || result.downloadUrl,
              fileName: result.fileName || file.name,
              fileSize: file.size,
              fileType: file.type,
              driveFileId: result.fileId,
              folderUrl: result.folder?.url,
              isGoogleDrive: true,
            }
          }
        }
      } catch (gasErr) {
        console.warn('[driveService] Google Apps Script upload failed, falling back to Supabase:', gasErr)
      }
    }

    // Fallback: Supabase Storage (submissions bucket)
    onProgress?.({
      percent: 60,
      status: 'uploading',
      message: 'กำลังอัปโหลดไฟล์เข้าคลังระบบจัดเก็บสำรอง (Cloud Storage)...',
    })

    const fileExt = file.name.split('.').pop() || 'dat'
    const safeName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_\u0E00-\u0E7F-]/g, '_')
      .substring(0, 40)
    const filePath = `submissions/${Date.now()}_${safeName}.${fileExt}`

    onProgress?.({
      percent: 85,
      status: 'processing',
      message: 'กำลังตรวจสอบและจัดทำลิงก์ผลงาน...',
    })

    const { error: uploadErr } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, { upsert: true })

    if (uploadErr) {
      // If submissions bucket is not accessible, try resources bucket
      const { error: fallbackErr } = await supabase.storage
        .from('resources')
        .upload(filePath, file, { upsert: true })

      if (fallbackErr) {
        onProgress?.({
          percent: 100,
          status: 'error',
          message: `ไม่สามารถอัปโหลดไฟล์ได้: ${uploadErr.message}`,
        })
        return { success: false, error: uploadErr.message }
      }

      const { data: publicUrlData } = supabase.storage.from('resources').getPublicUrl(filePath)
      onProgress?.({
        percent: 100,
        status: 'completed',
        message: 'ส่งไฟล์เรียบร้อยสมบูรณ์! 🎉',
      })
      return {
        success: true,
        url: publicUrlData.publicUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isGoogleDrive: false,
      }
    }

    const { data: publicUrlData } = supabase.storage.from('submissions').getPublicUrl(filePath)

    onProgress?.({
      percent: 100,
      status: 'completed',
      message: 'ส่งไฟล์เรียบร้อยสมบูรณ์! 🎉',
    })

    return {
      success: true,
      url: publicUrlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      isGoogleDrive: false,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    onProgress?.({
      percent: 100,
      status: 'error',
      message: `เกิดข้อผิดพลาด: ${message}`,
    })
    return { success: false, error: message }
  }
}


