'use client'

import Link from 'next/link'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Activity,
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Scan,
  DollarSign,
  ShieldCheck,
  Heart,
  ArrowRight,
  LogIn,
  UserPlus,
  Sparkles,
  Award,
  Building2,
  Stethoscope,
  ClipboardList,
  UserRound,
  BrainCircuit,
  MessageSquare,
  Send,
} from 'lucide-react'

const ROLE_PREVIEW = [
  {
    icon: Building2,
    label: 'Admin',
    copy: 'Hospital setup, staff invites, finance, audit, and full operations visibility.',
  },
  {
    icon: Stethoscope,
    label: 'Doctor',
    copy: 'Patients, appointments, lab, radiology, and AI chat support in one workspace.',
  },
  {
    icon: ClipboardList,
    label: 'Staff',
    copy: 'Front-desk scheduling, patient intake, pharmacy stock, lab, and imaging workflows.',
  },
  {
    icon: UserRound,
    label: 'Patient',
    copy: 'A focused portal for profile status and care-summary visibility.',
  },
]

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-med-bg text-med-primary overflow-hidden flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 border-b border-med-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-med-teal to-med-accent text-white shadow-lg shadow-med-teal/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-med-primary leading-none">
              MedOS <span className="text-medosBlue font-extrabold">AI</span>
            </span>
            <span className="block text-[10px] text-med-muted font-semibold tracking-wider uppercase">Nigerian Clinical OS</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-med-border bg-med-card hover:bg-slate-100 dark:hover:bg-slate-800 text-med-primary text-sm font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </Link>
          <Link
            href="/signup/admin"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-medosBlue hover:bg-opacity-95 text-white text-sm font-extrabold tracking-wide transition-all shadow-lg shadow-medosBlue/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Register Hospital
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 flex-grow">
        {/* Hero Copy */}
        <div className="lg:col-span-6 flex flex-col gap-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-medosBlue/10 border border-medosBlue/20 text-medosBlue text-xs font-semibold uppercase tracking-wider w-fit">
            <Award className="w-3.5 h-3.5" /> RBAC, audit trails, and AI chat for hospital teams
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-med-primary leading-[1.1]">
            MedOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-medosBlue to-med-accent">AI</span>
          </h1>

          <p className="text-base md:text-lg text-med-muted leading-relaxed max-w-xl">
            A role-aware hospital workspace for patient intake, appointments, pharmacy stock, lab orders, radiology records, Naira billing, audit logs, and conversational AI support.
          </p>

          <div className="flex flex-wrap items-center gap-4 mt-2">
            <Link
              href="/signup/admin"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-medosBlue hover:bg-opacity-90 text-white font-extrabold tracking-wide transition-all shadow-xl shadow-medosBlue/20 cursor-pointer"
            >
              Setup Admin Workspace
              <ArrowRight className="w-4 h-4 text-white" />
            </Link>
            <Link
              href="/signup/join"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-med-border bg-med-card hover:bg-slate-100 dark:hover:bg-slate-800 text-med-primary font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
            >
              Join with Token
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xl">
            {ROLE_PREVIEW.map((role) => (
              <div key={role.label} className="border border-med-border bg-med-card rounded-lg p-3 flex gap-3 shadow-sm">
                <role.icon className="w-4 h-4 text-medosBlue flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-med-primary">{role.label}</p>
                  <p className="text-xs text-med-muted leading-relaxed">{role.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Chat Preview */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-8 rounded-2xl relative shadow-2xl overflow-hidden border border-med-border flex flex-col gap-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-medosBlue/5 rounded-full blur-2xl" />
          
          <div className="flex items-center justify-between border-b border-med-border pb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-medosBlue/80 animate-pulse" />
              <span className="text-xs font-bold text-med-primary uppercase tracking-widest">AI Chat Workspace</span>
            </div>
            <span className="text-xs font-mono text-med-muted">medos_chat.sys</span>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-med-primary font-bold">
              <Sparkles className="w-4 h-4 text-medosBlue" /> Conversational support for daily hospital work
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-medosBlue/10 text-medosBlue flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-med-card border border-med-border px-4 py-3 text-sm text-med-primary shadow-sm">
                Draft a concise update for a patient whose lab result is still pending.
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <div className="rounded-2xl rounded-tr-sm bg-medosBlue text-white px-4 py-3 text-sm shadow-sm max-w-[85%]">
                Tell the patient the care team is waiting for the final lab review, avoid clinical interpretation, and share when they should call back.
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-med-teal/10 text-med-teal flex items-center justify-center flex-shrink-0">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-med-card border border-med-border px-4 py-3 text-sm text-med-primary shadow-sm">
                Your lab sample is still being reviewed by the clinical team. We will notify you once the result has been checked and released. If your symptoms worsen or you need urgent help, contact the hospital immediately.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-med-border bg-med-card px-4 py-3">
            <div className="flex-1 text-sm text-med-muted">Ask MedOS AI...</div>
            <div className="w-9 h-9 rounded-lg bg-medosBlue text-white flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </div>
        </div>
      </main>

      {/* Modules Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 border-t border-med-border">
        <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col gap-3">
          <span className="text-xs uppercase text-medosBlue font-extrabold tracking-widest">
            Core Modules
          </span>
          <h3 className="text-3xl md:text-4xl font-black text-med-primary tracking-tight">
            Integrated Workspace for Clinical Excellence
          </h3>
          <p className="text-sm md:text-base text-med-muted">
            A comprehensive operational dashboard connecting clinicians, laboratory experts, radiologists, and administrative staff under one portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: LayoutDashboard,
              title: 'Overview & Operational KPIs',
              desc: 'Real-time monitoring of active patients, consult schedules, low stock notifications, and pending laboratory orders.'
            },
            {
              icon: Activity,
              title: 'AI Chat Workspace',
              desc: 'Ask operational, documentation, patient communication, and care-support questions from a protected dashboard section.'
            },
            {
              icon: Users,
              title: 'Electronic Health Records',
              desc: 'Seamless, comprehensive patient charts, consult logs, prescription indexing, and diagnostic histories.'
            },
            {
              icon: CalendarDays,
              title: 'Appointment Calendars',
              desc: 'Intelligent booking scheduler for consultants and doctors, managing clinic session availability efficiently.'
            },
            {
              icon: Pill,
              title: 'Smart Pharmacy Inventory',
              desc: 'Log medicines, monitor batch expiries, manage restocking requests, and track real-time dispensing logs.'
            },
            {
              icon: FlaskConical,
              title: 'LOINC Lab Operations',
              desc: 'Order pathology/chemistry panels, upload diagnostic results, and track patient values against standards.'
            },
            {
              icon: Scan,
              title: 'Radiology (PACS) Archivist',
              desc: 'Archive scans, catalog body parts, save diagnostic predictions, and record physician review notes.'
            },
            {
              icon: DollarSign,
              title: 'Finance & Invoicing (₦)',
              desc: 'Generate medical bills in Nigerian Naira (₦), track collections, log waivers, and log NHIA HMO coverage details.'
            },
            {
              icon: ShieldCheck,
              title: 'Secure Audit trail',
              desc: 'Immutable, cryptographically validated activity records logs detailing all patient file read/write actions.'
            }
          ].map((m, idx) => (
            <div key={idx} className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-med-border hover:border-medosBlue/35 transition-all">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-med-border text-medosBlue w-fit shadow-sm">
                <m.icon className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-med-primary">{m.title}</h4>
              <p className="text-xs text-med-muted leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance Section */}
      <section className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 border-t border-med-border">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 flex flex-col gap-5">
            <span className="text-xs uppercase text-medosBlue font-extrabold tracking-widest">
              Regulatory Standards
            </span>
            <h3 className="text-3xl md:text-4xl font-black text-med-primary tracking-tight leading-tight">
              100% Compliant with Nigerian Health Guidelines
            </h3>
            <p className="text-sm text-med-muted leading-relaxed">
              Designed from the ground up to respect local administrative frameworks, data sovereignty rules, and medical council guidelines.
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-6 rounded-2xl border border-med-border flex flex-col gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg w-fit border border-emerald-500/20 font-mono text-xs font-bold">
                NDPR
              </div>
              <h4 className="text-sm font-bold text-med-primary">Data Privacy</h4>
              <p className="text-[10px] text-med-muted leading-relaxed">
                Adheres strictly to the Nigeria Data Protection Regulation. All patient health records are encrypted at rest with local audit trail validations.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-med-border flex flex-col gap-3">
              <div className="p-2 bg-med-teal/10 text-med-teal rounded-lg w-fit border border-med-teal/20 font-mono text-xs font-bold">
                MDCN
              </div>
              <h4 className="text-sm font-bold text-med-primary">Practice Audits</h4>
              <p className="text-[10px] text-med-muted leading-relaxed">
                Follows the Medical and Dental Council of Nigeria clinical registers standards, requiring credentials-backed validation of all diagnostic logs.
              </p>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-med-border flex flex-col gap-3">
              <div className="p-2 bg-med-accent/10 text-med-accent rounded-lg w-fit border border-med-accent/20 font-mono text-xs font-bold">
                NHIA
              </div>
              <h4 className="text-sm font-bold text-med-primary">Insurance Tariff</h4>
              <p className="text-[10px] text-med-muted leading-relaxed">
                Tariffs aligned with the National Health Insurance Authority guidelines to ensure HMO coverage claims match standardized tables.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-med-border py-8 text-center text-xs text-med-muted z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="flex items-center gap-1.5">
            Made with <Heart className="w-3.5 h-3.5 text-medosBlue fill-medosBlue" /> for digital health operations in Nigeria.
          </p>
          <p>
            MedOS AI &copy; 2026. Custom-tailored workspace. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
