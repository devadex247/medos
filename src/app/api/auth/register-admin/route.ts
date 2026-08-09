import { NextResponse, type NextRequest } from 'next/server'

import { getEnvErrorPayload } from '@/lib/server-env'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanString, makeUsername, makeAccessToken, errorMessage } from '@/lib/api-utils'

export const runtime = 'nodejs'

type AdminSignupBody = {
  fullName?: string
  email?: string
  password?: string
  hospitalName?: string
  hospitalAddress?: string
  hospitalEmail?: string
  hospitalPhone?: string
}

export async function POST(request: NextRequest) {
  let body: AdminSignupBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const fullName = cleanString(body.fullName)
  const email = cleanString(body.email).toLowerCase()
  const password = cleanString(body.password)
  const hospitalName = cleanString(body.hospitalName)
  const hospitalAddress = cleanString(body.hospitalAddress)
  const hospitalEmail = cleanString(body.hospitalEmail).toLowerCase()
  const hospitalPhone = cleanString(body.hospitalPhone)

  if (!fullName || !email || !password || !hospitalName || !hospitalEmail || !hospitalPhone) {
    return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Use a password with at least 8 characters.' },
      { status: 400 }
    )
  }

  let supabase: ReturnType<typeof createAdminClient>

  try {
    supabase = createAdminClient()
  } catch (error) {
    const envError = getEnvErrorPayload(error)

    if (envError) {
      return NextResponse.json(envError, { status: 500 })
    }

    return NextResponse.json(
      { error: 'Hospital registration is not configured on the server. Add the Supabase service role key to the deployment environment.' },
      { status: 500 }
    )
  }

  const username = makeUsername(email)
  let userId: string | null = null
  let hospitalId: number | null = null

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: 'owner_admin',
        username,
        full_name: fullName,
      },
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create user credentials.')
    }

    userId = authData.user.id

    const { error: profileError } = await supabase.from('users').upsert({
      id: userId,
      username,
      email,
      full_name: fullName,
      role: 'owner_admin',
      account_status: 'active',
    })

    if (profileError) {
      throw new Error(profileError.message || 'Failed to create user profile.')
    }

    const { data: hospitalData, error: hospitalError } = await supabase
      .from('hospitals')
      .insert({
        name: hospitalName,
        address: hospitalAddress || null,
        contact_email: hospitalEmail,
        contact_phone: hospitalPhone,
        owner_user_id: userId,
        is_active: true,
      })
      .select('id, name')
      .single()

    if (hospitalError || !hospitalData) {
      throw new Error(hospitalError?.message || 'Failed to initialize hospital workspace.')
    }

    hospitalId = hospitalData.id

    // Update user profile and auth user metadata to embed the hospital context
    const { error: updateProfileError } = await supabase
      .from('users')
      .update({ hospital_id: hospitalId })
      .eq('id', userId)

    if (updateProfileError) {
      throw new Error(updateProfileError.message || 'Failed to bind user profile to hospital workspace.')
    }

    const { error: updateAuthError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role: 'owner_admin',
        username,
        full_name: fullName,
        hospital_id: hospitalId,
      }
    })

    if (updateAuthError) {
      throw new Error(updateAuthError.message || 'Failed to bind user credentials to hospital workspace.')
    }

    const { error: membershipError } = await supabase.from('hospital_memberships').insert({
      hospital_id: hospitalId,
      user_id: userId,
      role: 'owner_admin',
      status: 'active',
    })

    if (membershipError) {
      throw new Error(membershipError.message || 'Failed to create membership connection.')
    }

    let inviteToken = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      inviteToken = makeAccessToken()

      const { error: tokenError } = await supabase.from('hospital_access_tokens').insert({
        hospital_id: hospitalId,
        access_token: inviteToken,
        created_by_user_id: userId,
        is_active: true,
      })

      if (!tokenError) {
        break
      }

      if (tokenError.code !== '23505' || attempt === 4) {
        throw new Error(tokenError.message || 'Failed to register invite access token.')
      }
    }

    const { error: doctorError } = await supabase.from('doctors').insert({
      hospital_id: hospitalId,
      user_id: userId,
      name: fullName,
      specialization: 'General Practice',
      email,
      phone: hospitalPhone,
    })

    if (doctorError) {
      throw new Error(doctorError.message || 'Failed to create administrator profile.')
    }

    await supabase.from('audit_logs').insert({
      hospital_id: hospitalId,
      username,
      action: `${hospitalData.name} workspace was created by ${fullName}.`,
      action_type: 'signup',
      table_name: 'hospitals',
      record_id: hospitalId,
      details: `Owner admin ${email} created the initial invite token.`,
    })

    return NextResponse.json({ token: inviteToken, hospital: hospitalData.name })
  } catch (error) {
    if (hospitalId) {
      await supabase.from('hospitals').delete().eq('id', hospitalId)
    }

    if (userId) {
      await supabase.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ error: errorMessage(error) }, { status: 400 })
  }
}
