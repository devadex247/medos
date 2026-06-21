import { randomInt } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'

import { getEnvErrorPayload } from '@/lib/server-env'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const WORKSPACE_ROLES = ['doctor', 'staff', 'patient'] as const

type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

type JoinHospitalBody = {
  fullName?: string
  email?: string
  password?: string
  role?: WorkspaceRole
  accessToken?: string
  phoneNumber?: string
  specialization?: string
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function cleanAccessToken(value: unknown) {
  return cleanString(value).toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function makeUsername(email: string) {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  return `${base || 'user'}_${randomInt(100000, 999999)}`
}

function makePersonalId() {
  return `PAT-${randomInt(100000, 999999)}`
}

function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === 'string' && WORKSPACE_ROLES.includes(value as WorkspaceRole)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected database error occurred.'
}

export async function GET() {
  return NextResponse.json({ ok: true, route: 'join-hospital' })
}

export async function POST(request: NextRequest) {
  let body: JoinHospitalBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const fullName = cleanString(body.fullName)
  const email = cleanString(body.email).toLowerCase()
  const password = cleanString(body.password)
  const accessToken = cleanAccessToken(body.accessToken)
  const phoneNumber = cleanString(body.phoneNumber)
  const specialization = cleanString(body.specialization)

  if (!fullName || !email || !password || !accessToken) {
    return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 })
  }

  if (!isWorkspaceRole(body.role)) {
    return NextResponse.json({ error: 'Please choose a valid workspace role.' }, { status: 400 })
  }

  if (body.role === 'doctor' && !specialization) {
    return NextResponse.json({ error: 'Doctor specialization is required.' }, { status: 400 })
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
      { error: 'Hospital signup is not configured on the server. Add the Supabase service role key to the deployment environment.' },
      { status: 500 }
    )
  }

  const username = makeUsername(email)
  let userId: string | null = null

  try {
    const { data: tokenData, error: tokenError } = await supabase
      .from('hospital_access_tokens')
      .select('hospital_id, hospitals(name)')
      .eq('access_token', accessToken)
      .eq('is_active', true)
      .single()

    if (tokenError || !tokenData) {
      throw new Error('Hospital access token is invalid, rotated, or inactive.')
    }

    const hospitalId = tokenData.hospital_id
    const hospitalRecord = Array.isArray(tokenData.hospitals)
      ? tokenData.hospitals[0]
      : tokenData.hospitals
    const hospitalName = hospitalRecord?.name || 'Hospital Workspace'

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: body.role,
        username,
        full_name: fullName,
        hospital_id: hospitalId,
      },
    })

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to register account credentials.')
    }

    userId = authData.user.id

    const { error: profileError } = await supabase.from('users').upsert({
      id: userId,
      username,
      email,
      full_name: fullName,
      phone_number: phoneNumber || null,
      role: body.role,
      account_status: 'active',
      hospital_id: hospitalId,
    })

    if (profileError) {
      throw new Error(profileError.message || 'Failed to create user profile.')
    }

    const { error: membershipError } = await supabase.from('hospital_memberships').insert({
      hospital_id: hospitalId,
      user_id: userId,
      role: body.role,
      status: 'active',
    })

    if (membershipError) {
      throw new Error('Failed to attach your account to the hospital database.')
    }

    if (body.role === 'doctor') {
      const { error: doctorError } = await supabase.from('doctors').insert({
        hospital_id: hospitalId,
        user_id: userId,
        name: fullName,
        specialization,
        email,
        phone: phoneNumber || null,
      })

      if (doctorError) {
        throw new Error('Auth completed but Doctor profile setup failed.')
      }
    }

    if (body.role === 'patient') {
      let patientErrorMessage = ''

      for (let attempt = 0; attempt < 5; attempt++) {
        const { error: patientError } = await supabase.from('patients').insert({
          hospital_id: hospitalId,
          user_id: userId,
          name: fullName,
          personal_id: makePersonalId(),
          email,
          phone: phoneNumber || null,
        })

        if (!patientError) {
          patientErrorMessage = ''
          break
        }

        patientErrorMessage = patientError.message

        if (patientError.code !== '23505') {
          break
        }
      }

      if (patientErrorMessage) {
        throw new Error(`Auth completed but Patient profile setup failed: ${patientErrorMessage}`)
      }
    }

    await supabase.from('audit_logs').insert({
      hospital_id: hospitalId,
      username,
      action: `${fullName} joined ${hospitalName} as ${body.role}.`,
      action_type: 'signup',
      table_name: 'hospital_memberships',
      record_id: hospitalId,
      details: `Invite token accepted for ${email}.`,
    })

    return NextResponse.json({ hospital: hospitalName })
  } catch (error) {
    if (userId) {
      await supabase.auth.admin.deleteUser(userId)
    }

    return NextResponse.json({ error: errorMessage(error) }, { status: 400 })
  }
}
