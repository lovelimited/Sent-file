// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This is a Supabase Edge Function for School Work Hub Username-based Login.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedUsername = String(username).trim().toLowerCase()

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

    // 1. Resolve internal user_id from auth_identities bridge
    const { data: identity, error: identityError } = await supabaseAdmin
      .from('auth_identities')
      .select('user_id')
      .eq('username', normalizedUsername)
      .maybeSingle()

    if (identityError || !identity) {
      return new Response(
        JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch auth user to get internal auth email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      identity.user_id
    )

    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Authenticate with Supabase Auth using internal email + password
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email: userData.user.email,
      password,
    })

    if (authError || !authData.session) {
      return new Response(
        JSON.stringify({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Fetch profile to check if active
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*, user_groups(name)')
      .eq('id', identity.user_id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'ไม่พบข้อมูลโปรไฟล์ผู้ใช้งาน' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!profile.active) {
      return new Response(
        JSON.stringify({ error: 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Update last_seen timestamp and record login activity log
    await Promise.allSettled([
      supabaseAdmin
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', identity.user_id),
      supabaseAdmin.from('activity_logs').insert({
        user_id: identity.user_id,
        action: 'login',
        target_type: 'auth',
        details: {
          username: normalizedUsername,
          role: profile.role,
        },
      }),
    ])

    // Mask internal email from returned user object
    const sanitizedUser = {
      ...authData.user,
      email: undefined,
    }

    return new Response(
      JSON.stringify({
        session: authData.session,
        user: sanitizedUser,
        profile,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
