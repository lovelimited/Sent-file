import { supabase } from './supabase'
import type { Task, TaskAssignment, TaskPriority, AssignmentStatus } from '@/types/index'
import { sendNotification, sendBatchNotifications } from './notificationService'

export interface TeacherTaskItem extends TaskAssignment {
  tasks: Task & {
    profiles?: { name: string; username: string } | null
    user_groups?: { name: string } | null
  }
}

export interface AdminTaskItem extends Task {
  profiles?: { name: string; username: string } | null
  user_groups?: { name: string } | null
  task_assignments?: {
    id: string
    teacher_id: string
    status: AssignmentStatus
  }[]
  stats?: {
    total: number
    submitted: number
    approved: number
    pending: number
    progressPercent: number
  }
}

export interface TaskSubmissionItem extends TaskAssignment {
  profiles?: {
    id: string
    name: string
    username: string
    avatar_url: string | null
    user_groups?: { name: string } | null
  } | null
  reviewer?: {
    name: string
  } | null
}

export interface CreateTaskPayload {
  title: string
  description?: string
  assigned_to_role: 'all' | 'teachers' | 'group' | 'specific'
  target_group_id?: string | null
  specific_teacher_ids?: string[]
  due_date?: string | null
  priority: TaskPriority
  created_by: string
  subtasks?: { id: string; title: string; completed?: boolean }[]
  drive_folder_url?: string | null
  category?: string | null
}

/**
 * Fetch tasks assigned to a specific teacher
 */
export async function fetchTeacherTasks(teacherId: string): Promise<{ data: TeacherTaskItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*, tasks(*, profiles:created_by(name, username), user_groups:target_group_id(name))')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data as unknown) as TeacherTaskItem[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch teacher tasks'
    return { data: null, error: message }
  }
}

/**
 * Fetch all tasks for administrator view with progress statistics
 */
export async function fetchAdminTasks(): Promise<{ data: AdminTaskItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles:created_by(name, username), user_groups:target_group_id(name), task_assignments(id, teacher_id, status)')
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    const tasksWithStats = ((data as unknown) as AdminTaskItem[]).map((task) => {
      const assignments = task.task_assignments || []
      const total = assignments.length
      const submitted = assignments.filter((a) => a.status === 'submitted').length
      const approved = assignments.filter((a) => a.status === 'approved').length
      const pending = assignments.filter((a) => a.status === 'pending' || a.status === 'in_progress').length
      const completedTotal = submitted + approved
      const progressPercent = total > 0 ? Math.round((completedTotal / total) * 100) : 0

      return {
        ...task,
        stats: {
          total,
          submitted,
          approved,
          pending,
          progressPercent,
        },
      }
    })

    return { data: tasksWithStats, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin tasks'
    return { data: null, error: message }
  }
}

/**
 * Fetch all submissions for a specific task
 */
export async function fetchTaskSubmissions(taskId: string): Promise<{ data: TaskSubmissionItem[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('*, profiles:teacher_id(id, name, username, avatar_url, user_groups:group_id(name)), reviewer:reviewed_by(name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: (data as unknown) as TaskSubmissionItem[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch submissions'
    return { data: null, error: message }
  }
}

/**
 * Create a new task and assign to targeted teachers
 */
export async function createTask(payload: CreateTaskPayload): Promise<{ success: boolean; error?: string; task_id?: string }> {
  try {
    const cleanTitle = payload.title.trim()
    if (!cleanTitle) {
      return { success: false, error: 'กรุณาระบุหัวข้อภาระงาน' }
    }

    // 1. Insert task
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        title: cleanTitle,
        description: payload.description?.trim() || null,
        created_by: payload.created_by,
        assigned_to_role: payload.assigned_to_role,
        target_group_id: payload.target_group_id || null,
        due_date: payload.due_date || null,
        priority: payload.priority,
        status: 'open',
        subtasks: payload.subtasks || [],
        drive_folder_url: payload.drive_folder_url?.trim() || null,
        category: payload.category?.trim() || null,
      })
      .select('id')
      .single()

    if (taskError || !newTask) {
      return { success: false, error: taskError?.message || 'ไม่สามารถสร้างภาระงานได้' }
    }

    // 2. Resolve targeted teacher IDs
    let teacherIds: string[] = []

    if (payload.assigned_to_role === 'specific' && payload.specific_teacher_ids?.length) {
      teacherIds = payload.specific_teacher_ids
    } else if (payload.assigned_to_role === 'group' && payload.target_group_id) {
      const { data: groupTeachers } = await supabase
        .from('profiles')
        .select('id')
        .eq('group_id', payload.target_group_id)
        .eq('active', true)

      if (groupTeachers) {
        teacherIds = groupTeachers.map((t) => t.id)
      }
    } else {
      // All active teachers and staff
      const { data: allTeachers } = await supabase
        .from('profiles')
        .select('id')
        .eq('active', true)

      if (allTeachers) {
        teacherIds = allTeachers.map((t) => t.id)
      }
    }

    // 3. Create assignments
    if (teacherIds.length > 0) {
      const assignments = teacherIds.map((teacherId) => ({
        task_id: newTask.id,
        teacher_id: teacherId,
        status: 'pending' as AssignmentStatus,
      }))

      const { error: assignError } = await supabase
        .from('task_assignments')
        .insert(assignments)

      if (assignError) {
        console.warn('[taskService] Partial assignment error:', assignError.message)
      }
      // 4. Send notifications to all assigned teachers
      sendBatchNotifications(
        teacherIds,
        'ภาระงานใหม่ที่ได้รับมอบหมาย',
        `คุณได้รับมอบหมายภาระงาน: "${cleanTitle}"`,
        'task_assigned',
        '/tasks'
      ).catch((err) => console.warn('[taskService] Notification error:', err))
    }

    // 5. Log in activity_logs
    await supabase.from('activity_logs').insert({
      user_id: payload.created_by,
      action: 'create_task',
      target_type: 'task',
      target_id: newTask.id,
      details: {
        title: cleanTitle,
        assigned_count: teacherIds.length,
        priority: payload.priority,
      },
    })

    return { success: true, task_id: newTask.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสร้างงาน'
    return { success: false, error: message }
  }
}

/**
 * Teacher submits work for a task
 */
export async function submitTask(
  assignmentId: string,
  submissionNote: string,
  submissionUrl?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanNote = submissionNote.trim()
    if (!cleanNote && !submissionUrl?.trim()) {
      return { success: false, error: 'กรุณากรอกบันทึกการส่งงานหรือแนบลิงก์ผลงาน' }
    }

    const { data, error } = await supabase
      .from('task_assignments')
      .update({
        status: 'submitted',
        submission_note: cleanNote || null,
        submission_url: submissionUrl?.trim() || null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select('id, task_id, teacher_id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity
    if (data) {
      await supabase.from('activity_logs').insert({
        user_id: data.teacher_id,
        action: 'submit_task',
        target_type: 'task_assignment',
        target_id: data.id,
        details: { task_id: data.task_id },
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit task'
    return { success: false, error: message }
  }
}

export interface SubmitSubtaskWorkPayload {
  assignmentId: string
  subtaskId?: string
  fileInfo: {
    url: string
    fileName: string
    fileSize?: number
    fileType?: string
    driveFileId?: string
    folderUrl?: string
  }
  note?: string
  teacherId: string
  allSubtaskCount?: number
}

/**
 * Submit file for a specific subtask or the main task
 */
export async function submitSubtaskWork(
  payload: SubmitSubtaskWorkPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { assignmentId, subtaskId, fileInfo, note, teacherId, allSubtaskCount } = payload

    // 1. Fetch current assignment data
    const { data: current, error: fetchErr } = await supabase
      .from('task_assignments')
      .select('id, task_id, teacher_id, completed_subtask_ids, subtask_files, tasks(subtasks)')
      .eq('id', assignmentId)
      .single()

    if (fetchErr || !current) {
      return { success: false, error: fetchErr?.message || 'ไม่พบภาระงานที่ระบุ' }
    }

    const currentFiles = (current.subtask_files as Record<string, any>) || {}
    let currentCompleted = Array.isArray(current.completed_subtask_ids)
      ? [...current.completed_subtask_ids]
      : []

    if (subtaskId) {
      currentFiles[subtaskId] = {
        url: fileInfo.url,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        fileType: fileInfo.fileType,
        driveFileId: fileInfo.driveFileId,
        folderUrl: fileInfo.folderUrl,
        submittedAt: new Date().toISOString(),
      }
      if (!currentCompleted.includes(subtaskId)) {
        currentCompleted.push(subtaskId)
      }
    }

    // Determine status: if total subtasks defined and all completed -> 'submitted', else 'in_progress'
    const totalSubtasks = allSubtaskCount ?? (Array.isArray(current.tasks?.subtasks) ? current.tasks.subtasks.length : 0)
    let newStatus: AssignmentStatus = 'submitted'
    if (totalSubtasks > 0 && currentCompleted.length < totalSubtasks) {
      newStatus = 'in_progress'
    }

    const updateData: any = {
      subtask_files: currentFiles,
      completed_subtask_ids: currentCompleted,
      status: newStatus,
      submission_url: fileInfo.url,
      submitted_at: new Date().toISOString(),
    }

    if (note && note.trim()) {
      updateData.submission_note = note.trim()
    }

    const { error: updateErr } = await supabase
      .from('task_assignments')
      .update(updateData)
      .eq('id', assignmentId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: teacherId,
      action: 'submit_subtask_work',
      target_type: 'task_assignment',
      target_id: assignmentId,
      details: {
        task_id: current.task_id,
        subtask_id: subtaskId || 'main',
        file_name: fileInfo.fileName,
        new_status: newStatus,
      },
    })

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit subtask file'
    return { success: false, error: message }
  }
}

/**
 * Admin reviews and approves or requests revision on a teacher submission
 */
export async function reviewSubmission(
  assignmentId: string,
  status: 'approved' | 'rejected',
  feedback?: string,
  reviewerId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .update({
        status,
        feedback: feedback?.trim() || null,
        reviewed_by: reviewerId || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId)
      .select('id, task_id, teacher_id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Log activity and notify teacher
    if (data && reviewerId) {
      const isApproved = status === 'approved'
      const reviewMsg = isApproved
        ? 'ผลงานของคุณผ่านการอนุมัติเรียบร้อยแล้ว'
        : `ผลงานของคุณต้องแก้ไขเพิ่มเติม: "${feedback?.trim() || 'กรุณาตรวจสอบรายละเอียด'}"`

      sendNotification({
        recipient_id: data.teacher_id,
        title: isApproved ? 'ภาระงานได้รับการอนุมัติ' : 'ภาระงานต้องส่งใหม่',
        message: reviewMsg,
        type: 'task_reviewed',
        link: '/tasks',
      }).catch((err) => console.warn('[taskService] Review notification error:', err))

      await supabase.from('activity_logs').insert({
        user_id: reviewerId,
        action: 'review_submission',
        target_type: 'task_assignment',
        target_id: data.id,
        details: {
          task_id: data.task_id,
          teacher_id: data.teacher_id,
          review_status: status,
        },
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to review submission'
    return { success: false, error: message }
  }
}

/**
 * Admin updates task details
 */
export async function updateTask(
  taskId: string,
  payload: Partial<Pick<Task, 'title' | 'description' | 'due_date' | 'priority' | 'status'>>,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)

    if (error) {
      return { success: false, error: error.message }
    }

    if (adminId) {
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        action: 'update_task',
        target_type: 'task',
        target_id: taskId,
        details: payload,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update task'
    return { success: false, error: message }
  }
}

/**
 * Admin deletes a task
 */
export async function deleteTask(taskId: string, adminId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete associated assignments first to prevent foreign key errors
    await supabase.from('task_assignments').delete().eq('task_id', taskId)

    // 2. Delete task
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)

    if (error) {
      return { success: false, error: error.message }
    }

    if (adminId) {
      await supabase.from('activity_logs').insert({
        user_id: adminId,
        action: 'delete_task',
        target_type: 'task',
        target_id: taskId,
      })
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete task'
    return { success: false, error: message }
  }
}
