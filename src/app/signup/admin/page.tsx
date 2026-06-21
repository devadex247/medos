'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ScrollToTop from '@/components/ScrollToTop'
import { Activity, ShieldCheck, User, Building2, MapPin, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

type RegisterAdminResponse = {
  error?: string
  code?: string
  missing?: string[]
  token?: string
  hospital?: string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected database error occurred.'
}

async function readRegisterResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await response.json()) as RegisterAdminResponse

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
      error: 'The deployment is protected by Vercel Authentication. Disable production protection or expose this endpoint before admins can register.',
    }
  }

  if (response.status === 404 || isHtml) {
    return {
      error: 'Admin signup endpoint was not found in the running app. Check /api/health and confirm the public domain is attached to the deployment that includes API routes.',
    }
  }

  return { error: 'Admin signup endpoint did not return a readable JSON response.' }
}

export default function AdminSignup() {
  const router = useRouter()

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hospitalName, setHospitalName] = useState('')
  const [hospitalAddress, setHospitalAddress] = useState('')
  const [hospitalEmail, setHospitalEmail] = useState('')
  const [hospitalPhone, setHospitalPhone] = useState('')

  // State controls
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successData, setSuccessData] = useState<{ token: string; hospital: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (!fullName || !email || !password || !hospitalName || !hospitalEmail || !hospitalPhone) {
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
      const response = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          hospitalName,
          hospitalAddress,
          hospitalEmail,
          hospitalPhone,
        }),
      })

      const result = await readRegisterResponse(response)

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register hospital workspace.')
      }

      if (!result.token || !result.hospital) {
        throw new Error('Hospital workspace was created, but the server response was incomplete.')
      }

      setSuccessData({ token: result.token, hospital: result.hospital })
    } catch (err: unknown) {
      setErrorMsg(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-med-bg relative flex items-center justify-center p-6 overflow-hidden">
        <div className="glass-panel max-w-lg w-full p-8 rounded-2xl border border-med-green/20 relative shadow-2xl flex flex-col gap-6 text-center">
          <div className="p-3.5 rounded-full bg-med-green/10 text-med-green w-fit mx-auto border border-med-green/20">
            <ShieldCheck className="w-12 h-12" />
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">Hospital Workspace Created!</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Your new clinical database for <strong className="text-slate-200">{successData.hospital}</strong> has been registered successfully.
          </p>

          <div className="p-5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col gap-2">
            <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">Hospital Invite / Login Token</span>
            <span className="text-3xl font-mono font-black text-med-teal tracking-widest">{successData.token}</span>
            <p className="text-xxs text-slate-400 mt-2">
              Share this token with doctors, staff, and patients so they can join this hospital workspace.
            </p>
          </div>

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
          <h2 className="text-3xl font-black text-white tracking-tight leading-none">Register Hospital</h2>
          <p className="text-slate-400 text-xs mt-1">Setup your hospital workspace database and owner admin account.</p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Section 1: Administrator Credentials */}
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase text-med-teal font-extrabold tracking-wider border-b border-white/5 pb-2">
              1. Owner Administrator Account
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
                    placeholder="e.g. Dr. Chinonso Okoro"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Owner Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. chinonso@hospital.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold">Admin Password *</label>
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
            </div>
          </div>

          {/* Section 2: Hospital Info */}
          <div className="flex flex-col gap-4">
            <span className="text-xs uppercase text-med-teal font-extrabold tracking-wider border-b border-white/5 pb-2">
              2. Hospital Workspace Info
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold">Hospital / Clinic Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. Lagos City Medical Center"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Hospital Contact Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={hospitalEmail}
                    onChange={(e) => setHospitalEmail(e.target.value)}
                    placeholder="e.g. contact@lagoscitymed.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-semibold">Hospital Contact Phone *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    required
                    value={hospitalPhone}
                    onChange={(e) => setHospitalPhone(e.target.value)}
                    placeholder="e.g. +234 80 1234 5678"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-xs text-slate-400 font-semibold">Hospital Address (Optional)</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    placeholder="e.g. 12 Herbert Macaulay Way, Yaba, Lagos"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  />
                </div>
              </div>
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
                Registering Workspace...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Create Hospital Database
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
            Or want to join an existing hospital?{' '}
            <Link href="/signup/join" className="text-med-teal hover:underline font-semibold transition-colors">
              Join Hospital Workspace
            </Link>
          </span>
        </div>
      </div>

      <ScrollToTop />
    </div>
  )
}
