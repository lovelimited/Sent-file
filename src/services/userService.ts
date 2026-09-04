import { supabase } from './supabase'
import type { ProfileWithGroup } from '@/types/auth.types'
import type { UserGroup, ActivityLog, UserRole, Database } from '@/types/index'

export interface CreateUserPayload {
  username: string
  name: string
  role: UserRole
  group_id?: string | null
  password: string
}

export interface ActivityLogWithProfile extends ActivityLog {
  profiles?: {
    username: string
    name: string
    role: UserRole
  } | null
}

/**
 * Fetch all user profiles (Admin sees all profiles through RLS)
 */
export async function fetchUsers(): Promise<{ data: ProfileWithGroup[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_groups(name)')
      .order('created_at', { ascending: false })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as ProfileWithGroup[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch users'
    return { data: null, error: message }
  }
}

/**
 * Fetch all school user groups (กลุ่มสาระการเรียนรู้)
 */
export async function fetchGroups(): Promise<{ data: UserGroup[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('user_groups')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch groups'
    return { data: null, error: message }
  }
}

/**
 * Create a new user group (Admin only)
 */
export async function createGroup(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = name.trim()
    if (!cleanName) {
      return { success: false, error: 'กรุณาระบุชื่อกลุ่มสาระการเรียนรู้' }
    }

    const { error } = await supabase
      .from('user_groups')
      .insert({ name: cleanName })

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'ชื่อกลุ่มสาระนี้มีอยู่ในระบบแล้ว' }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create group'
    return { success: false, error: message }
  }
}

/**
 * Update user group name (Admin only)
 */
export async function updateGroup(id: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = name.trim()
    if (!cleanName) {
      return { success: false, error: 'กรุณาระบุชื่อกลุ่มสาระการเรียนรู้' }
    }

    const { error } = await supabase
      .from('user_groups')
      .update({ name: cleanName })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update group'
    return { success: false, error: message }
  }
}

/**
 * Delete user group (Admin only - fails if teachers are assigned)
 */
export async function deleteGroup(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if any teachers are assigned
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', id)

    if (countError) {
      return { success: false, error: countError.message }
    }

    if (count && count > 0) {
      return {
        success: false,
        error: `ไม่สามารถลบกลุ่มนี้ได้ เนื่องจากมีครูสังกัดอยู่จำนวน ${count} ท่าน (กรุณาย้ายกลุ่มครูก่อน)`,
      }
    }

    const { error } = await supabase
      .from('user_groups')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete group'
    return { success: false, error: message }
  }
}

/**
 * Create user through privileged Edge Function (with RPC fallback)
 */
export async function createUser(payload: CreateUserPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try Edge Function
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'create_user',
        ...payload,
      },
    })

    if (!error && !data?.error) {
      return { success: true }
    }

    if (!error && data?.error) {
      return { success: false, error: data.error }
    }

    // 2. Database RPC Fallback (Security Definer with Admin check)
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_create_user', {
      p_username: payload.username,
      p_name: payload.name,
      p_role: payload.role,
      p_group_id: payload.group_id || null,
      p_password: payload.password,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
      return { success: false, error: (rpcData as { error: string }).error }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    return { success: false, error: message }
  }
}

/**
 * Reset user password through privileged Edge Function (with RPC fallback)
 */
export async function resetPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try Edge Function
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'reset_password',
        user_id: userId,
        new_password: newPassword,
      },
    })

    if (!error && !data?.error) {
      return { success: true }
    }

    if (!error && data?.error) {
      return { success: false, error: data.error }
    }

    // 2. Database RPC Fallback
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_reset_password', {
      p_user_id: userId,
      p_new_password: newPassword,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
      return { success: false, error: (rpcData as { error: string }).error }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    return { success: false, error: message }
  }
}

/**
 * Toggle user active/inactive status through privileged Edge Function (with RPC fallback)
 */
export async function toggleUserActive(userId: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try Edge Function
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'toggle_active',
        user_id: userId,
        active,
      },
    })

    if (!error && !data?.error) {
      return { success: true }
    }

    if (!error && data?.error) {
      return { success: false, error: data.error }
    }

    // 2. Database RPC Fallback
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_toggle_active', {
      p_user_id: userId,
      p_active: active,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
      return { success: false, error: (rpcData as { error: string }).error }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    return { success: false, error: message }
  }
}

/**
 * Delete user through privileged Edge Function (with RPC fallback)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Try Edge Function
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: {
        action: 'delete_user',
        user_id: userId,
      },
    })

    if (!error && !data?.error) {
      return { success: true }
    }

    if (!error && data?.error) {
      return { success: false, error: data.error }
    }

    // 2. Database RPC Fallback
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('admin_delete_user', {
      p_user_id: userId,
    })

    if (rpcError) {
      return { success: false, error: rpcError.message }
    }

    if (rpcData && typeof rpcData === 'object' && 'error' in rpcData) {
      return { success: false, error: (rpcData as { error: string }).error }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ'
    return { success: false, error: message }
  }
}

/**
 * Fetch activity logs for auditing (Admin only through RLS)
 */
export async function fetchActivityLogs(): Promise<{ data: ActivityLogWithProfile[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles(username, name, role)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as ActivityLogWithProfile[], error: null }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch activity logs'
    return { data: null, error: message }
  }
}

export interface UpdateProfilePayload {
  name?: string
  username?: string
  role?: UserRole
  group_id?: string | null
  avatar_url?: string | null
}

/**
 * Update a user profile (User updating own profile or Admin updating any profile)
 */
export async function updateUserProfile(
  userId: string,
  payload: UpdateProfilePayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Database['public']['Tables']['profiles']['Update'] = {
      updated_at: new Date().toISOString(),
    }
    if (payload.name !== undefined) updateData.name = payload.name.trim()
    if (payload.username !== undefined) updateData.username = payload.username.trim()
    if (payload.role !== undefined) updateData.role = payload.role
    if (payload.group_id !== undefined) updateData.group_id = payload.group_id || null
    if (payload.avatar_url !== undefined) updateData.avatar_url = payload.avatar_url

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้'
    return { success: false, error: message }
  }
}
