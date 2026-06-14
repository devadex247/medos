'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ScrollToTop from '@/components/ScrollToTop'
import { Activity, Key, User, Mail, Phone, Lock, Eye, EyeOff, ClipboardList, Stethoscope, Loader2, CheckCircle2 } from 'lucide-react'

type JoinRole = 'doctor' | 'staff' | 'patient'

type JoinHospitalResponse = {
  error?: string
  code?: string
  missing?: string[]
  hospital?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected database error occurred.'
}

function cleanAccessToken(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

async function readJoinResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as JoinHospitalResponse

    if (payload.code === 'SERVER_ENV_MISSING') {
      return {
        ...payload,
        error: `Server configuration is incomplete. Missing: ${payload.missing?.join(', ') || 'required environment variables'}.`,
      }
    }

    return payload
  }

  const text = await response.text()
  const isHtml = text.trim().startsWith('<!DOCTYPE html') || text.includes('<html')

  if (response.status === 401 && isHtml) {
    return {
      error: 'The deployment is protected by Vercel Authentication. Disable production protection or expose this endpoint before users can join.',
    }
  }

  if (response.status === 404 || isHtml) {
    return {
      error: 'Join signup endpoint was not found in the running app. Check /api/health and confirm the public domain is attached to the deployment that includes API routes.',
    }
  }

  return { error: 'Join signup endpoint did not return a readable JSON response.' }
}

export default function JoinHospital() {
  const router = useRouter()

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<JoinRole>('patient')
  const [accessToken, setAccessToken] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [specialization, setSpecialization] = useState('')

  // State controls
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')

    if (token) {
      setAccessToken(cleanAccessToken(token))
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!fullName || !email || !password || !accessToken) {
      setErrorMsg('Please complete all required fields.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setErrorMsg('Use a password with at least 8 characters.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/join-hospital', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role,
          accessToken,
          phoneNumber,
          specialization,
        }),
      })

      const result = await readJoinResponse(response)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join hospital workspace.')
      }

      setSuccess(true)
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-med-bg relative flex items-center justify-center p-6 overflow-hidden">
        <div className="glass-panel max-w-lg w-full p-8 rounded-2xl border border-med-green/20 relative shadow-2xl flex flex-col gap-6 text-center">
          <div className="p-3.5 rounded-full bg-med-green/10 text-med-green w-fit mx-auto border border-med-green/20">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">Onboarding Successful!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your credentials have been successfully authorized. You are now a registered member of this hospital workspace database.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="w-full py-3.5 rounded-xl bg-med-teal hover:bg-med-teal/85 text-slate-950 font-bold text-sm tracking-wide transition-all cursor-pointer shadow-lg shadow-med-teal/15"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-med-bg relative py-12 px-6 flex items-center justify-center overflow-hidden">
      <div className="glass-panel max-w-2xl w-full p-8 md:p-10 rounded-2xl relative shadow-2xl border border-white/5 flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3 text-center items-center">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-med-teal/10 text-med-teal">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-300">MedOS AI</span>
          </Link>
          <h2 className="text-3xl font-black text-white tracking-tight leading-none">Join Hospital</h2>
          <p className="text-slate-400 text-xs mt-1">Connect your user profile to an active clinic database.</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Invite / Workspace Token */}
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase text-med-teal font-extrabold tracking-wider border-b border-white/5 pb-2">
              1. Hospital Workspace invite
            </span>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-semibold">Hospital Access Token *</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={accessToken}
                  onChange={(e) => setAccessToken(cleanAccessToken(e.target.value))}
                  placeholder="8-character code (e.g. ABCD1234)"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono tracking-widest text-med-teal font-bold placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Account Details */}
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase text-med-teal font-extrabold tracking-wider border-b border-white/5 pb-2">
              2. User Account Details
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Chinonso Okoro"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Personal Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@domain.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-10 py-3 rounded-xl text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Role *</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as JoinRole)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm appearance-none bg-slate-900/80 cursor-pointer"
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor / Physician</option>
                    <option value="staff">Staff / Operations</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +234 80 1234 5678"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              {role === 'doctor' && (
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-xs text-slate-400 font-semibold">Doctor Specialization *</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      placeholder="e.g. Cardiology, Pediatrics, General Medicine"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-xl bg-med-teal hover:bg-med-teal/85 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-med-teal/15 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Validating Token & Registering...
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                Join Workspace
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 flex flex-col gap-2">
          <span>
            Already have a workspace account?{' '}
            <Link href="/login" className="text-med-teal hover:underline font-semibold transition-colors">
              Sign In Here
            </Link>
          </span>
          <span>
            Or need to register a brand new hospital?{' '}
            <Link href="/signup/admin" className="text-med-teal hover:underline font-semibold transition-colors">
              Register Hospital Workspace
            </Link>
          </span>
        </div>
      </div>

      <ScrollToTop />
    </div>
  )
}
