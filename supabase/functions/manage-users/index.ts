// Supabase Edge Function: manage-users
// Privileged administrative operations: create_user, reset_password, toggle_active, delete_user
// Requires caller to have role = 'admin' and active = true.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Privileged Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. Verify caller authentication & admin role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อมูลการยืนยันตัวตน (Unauthorized)' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user: callerUser }, error: tokenError } = await supabaseAdmin.auth.getUser(token)

    if (tokenError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Session ไม่ถูกต้องหรือหมดอายุ' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, active')
      .eq('id', callerUser.id)
      .single()

    if (profileError || !callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
      return new Response(
        JSON.stringify({ error: 'ไม่มีสิทธิ์ดำเนินการ: เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request payload
    const body = await req.json()
    const { action } = body

    // -------------------------------------------------------------------------
    // ACTION: create_user
    // -------------------------------------------------------------------------
    if (action === 'create_user') {
      const { username, name, role = 'teacher', group_id, password } = body

      if (!username || !name || !password) {
        return new Response(
          JSON.stringify({ error: 'กรุณาระบุชื่อผู้ใช้, ชื่อ-นามสกุล และรหัสผ่าน' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const normalizedUsername = String(username).trim().toLowerCase()

      // Check if username already exists in auth_identities
      const { data: existingIdentity } = await supabaseAdmin
        .from('auth_identities')
        .select('username')
        .eq('username', normalizedUsername)
        .maybeSingle()

      if (existingIdentity) {
        return new Response(
          JSON.stringify({ error: `ชื่อผู้ใช้งาน "${normalizedUsername}" มีอยู่ในระบบแล้ว` }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const internalEmail = `${normalizedUsername}@school.local`

      // Create Supabase Auth User with metadata (Triggers handle_new_user)
      const { data: newAuthData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: internalEmail,
        password: String(password),
        email_confirm: true,
        user_metadata: {
          username: normalizedUsername,
          name: String(name).trim(),
          role: role === 'admin' ? 'admin' : 'teacher',
        },
      })

      if (createAuthError || !newAuthData?.user) {
        return new Response(
          JSON.stringify({ error: createAuthError?.message || 'ไม่สามารถสร้างผู้ใช้งานในระบบ Auth ได้' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const newUserId = newAuthData.user.id

      // If group_id is provided, update profile
      if (group_id) {
        await supabaseAdmin
          .from('profiles')
          .update({ group_id })
          .eq('id', newUserId)
      }

      // Log in activity_logs
      await supabaseAdmin.from('activity_logs').insert({
        user_id: callerUser.id,
        action: 'create_user',
        target_type: 'profile',
        target_id: newUserId,
        details: {
          created_username: normalizedUsername,
          name: String(name).trim(),
          role: role === 'admin' ? 'admin' : 'teacher',
          group_id: group_id || null,
        },
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: `สร้างผู้ใช้งาน ${normalizedUsername} สำเร็จ`,
          user_id: newUserId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -------------------------------------------------------------------------
    // ACTION: reset_password
    // -------------------------------------------------------------------------
    if (action === 'reset_password') {
      const { user_id, new_password } = body

      if (!user_id || !new_password) {
        return new Response(
          JSON.stringify({ error: 'กรุณาระบุ user_id และรหัสผ่านใหม่' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: String(new_password),
      })

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update last_password_change in profiles
      await supabaseAdmin
        .from('profiles')
        .update({ last_password_change: new Date().toISOString() })
        .eq('id', user_id)

      // Log action
      await supabaseAdmin.from('activity_logs').insert({
        user_id: callerUser.id,
        action: 'reset_password',
        target_type: 'profile',
        target_id: user_id,
        details: { reset_by: callerUser.id },
      })

      return new Response(
        JSON.stringify({ success: true, message: 'รีเซ็ตรหัสผ่านสำเร็จ' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -------------------------------------------------------------------------
    // ACTION: toggle_active
    // -------------------------------------------------------------------------
    if (action === 'toggle_active') {
      const { user_id, active } = body

      if (!user_id || typeof active !== 'boolean') {
        return new Response(
          JSON.stringify({ error: 'ข้อมูลไม่ถูกต้อง' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (user_id === callerUser.id && !active) {
        return new Response(
          JSON.stringify({ error: 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({ active })
        .eq('id', user_id)

      if (updateProfileError) {
        return new Response(
          JSON.stringify({ error: updateProfileError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log action
      await supabaseAdmin.from('activity_logs').insert({
        user_id: callerUser.id,
        action: active ? 'activate_user' : 'deactivate_user',
        target_type: 'profile',
        target_id: user_id,
      })

      return new Response(
        JSON.stringify({
          success: true,
          message: active ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ระงับการใช้งานบัญชีสำเร็จ',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // -------------------------------------------------------------------------
    // ACTION: delete_user
    // -------------------------------------------------------------------------
    if (action === 'delete_user') {
      const { user_id } = body

      if (!user_id) {
        return new Response(
          JSON.stringify({ error: 'กรุณาระบุ user_id ที่ต้องการลบ' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ error: 'ไม่สามารถลบบัญชีผู้ดูแลระบบของตนเองได้' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete from auth.users (cascades to profiles and auth_identities)
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

      if (deleteAuthError) {
        return new Response(
          JSON.stringify({ error: deleteAuthError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log action
      await supabaseAdmin.from('activity_logs').insert({
        user_id: callerUser.id,
        action: 'delete_user',
        target_type: 'profile',
        target_id: user_id,
      })

      return new Response(
        JSON.stringify({ success: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: `ไม่รู้จัก Action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
