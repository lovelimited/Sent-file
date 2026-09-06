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

export interface SubmittedTaskFileItem {
  id: string
  assignment_id: string
  task_id: string
  task_title: string
  task_category: string
  teacher_id: string
  teacher_name: string
  teacher_username: string
  teacher_avatar?: string | null
  teacher_group_name?: string | null
  status: string
  submitted_at: string | null
  subtask_id?: string
  subtask_title?: string
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  drive_folder_url?: string
}

/**
 * Fetch drive resources:
 * Non-admins see school-wide public resources, their group's resources, and their own resources.
 * Admins see all resources.
 */
export async function fetchDriveResources(
  userId?: string,
  isAdmin?: boolean,
  groupId?: string | null
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

    if (!isAdmin) {
      // Allow teachers to access school resources
      if (userId && groupId) {
        query = query.or(`group_id.is.null,group_id.eq.${groupId},created_by.eq.${userId}`)
      } else if (userId) {
        query = query.or(`group_id.is.null,created_by.eq.${userId}`)
      } else {
        query = query.is('group_id', null)
      }
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
 * Fetch submitted task files that are stored in Google Drive
 */
export async function fetchTaskSubmittedDriveFiles(
  userId?: string,
  isAdmin?: boolean
): Promise<{
  data: SubmittedTaskFileItem[] | null
  error: string | null
}> {
  try {
    let query = supabase
      .from('task_assignments')
      .select(`
        id,
        task_id,
        teacher_id,
        status,
        submitted_at,
        submission_url,
        subtask_files,
        tasks:task_id(id, title, category, subtasks, drive_folder_url),
        profiles:teacher_id(id, name, username, avatar_url, group_id, user_groups:group_id(name))
      `)
      .or('status.eq.submitted,status.eq.approved,status.eq.in_progress')
      .order('submitted_at', { ascending: false })

    if (!isAdmin && userId) {
      query = query.eq('teacher_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return { data: null, error: error.message }
    }

    const items: SubmittedTaskFileItem[] = []

    if (data) {
      data.forEach((row: any) => {
        const task = row.tasks
        const profile = row.profiles
        const taskTitle = task?.title || 'ภาระงานโรงเรียน'
        const taskCategory = task?.category || 'งานทั่วไป'
        const teacherName = profile?.name || profile?.username || 'คุณครู'
        const teacherUsername = profile?.username || ''
        const teacherAvatar = profile?.avatar_url || null
        const teacherGroupName = profile?.user_groups?.name || null

        // Parse subtasks map if any to get friendly subtask titles
        const subtaskTitleMap = new Map<string, string>()
        if (Array.isArray(task?.subtasks)) {
          task.subtasks.forEach((st: any) => {
            if (st && st.id) subtaskTitleMap.set(st.id, st.title)
          })
        }

        // 1. Check subtask_files JSON
        const subtaskFiles = row.subtask_files as Record<string, any> | null
        let hasSubtaskFiles = false

        if (subtaskFiles && typeof subtaskFiles === 'object') {
          Object.entries(subtaskFiles).forEach(([stId, fInfo]) => {
            if (fInfo && fInfo.url) {
              hasSubtaskFiles = true
              items.push({
                id: `${row.id}_${stId}`,
                assignment_id: row.id,
                task_id: row.task_id,
                task_title: taskTitle,
                task_category: taskCategory,
                teacher_id: row.teacher_id,
                teacher_name: teacherName,
                teacher_username: teacherUsername,
                teacher_avatar: teacherAvatar,
                teacher_group_name: teacherGroupName,
                status: row.status,
                submitted_at: fInfo.submittedAt || row.submitted_at,
                subtask_id: stId,
                subtask_title: subtaskTitleMap.get(stId) || `งานย่อย`,
                file_name: fInfo.fileName || 'ไฟล์ผลงาน',
                file_url: fInfo.url,
                file_size: fInfo.fileSize,
                file_type: fInfo.fileType || 'file',
                drive_folder_url: fInfo.folderUrl || task?.drive_folder_url || undefined,
              })
            }
          })
        }

        // 2. Fallback to main submission_url if no subtask files
        if (!hasSubtaskFiles && row.submission_url) {
          items.push({
            id: `${row.id}_main`,
            assignment_id: row.id,
            task_id: row.task_id,
            task_title: taskTitle,
            task_category: taskCategory,
            teacher_id: row.teacher_id,
            teacher_name: teacherName,
            teacher_username: teacherUsername,
            teacher_avatar: teacherAvatar,
            teacher_group_name: teacherGroupName,
            status: row.status,
            submitted_at: row.submitted_at,
            file_name: `เอกสารส่งงาน - ${teacherName}`,
            file_url: row.submission_url,
            file_type: row.submission_url.includes('drive.google.com') ? 'drive' : 'link',
            drive_folder_url: task?.drive_folder_url || undefined,
          })
        }
      })
    }

    return { data: items, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch task submitted drive files'
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


