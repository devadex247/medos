# MedOS AI — Hospital Management System

> **Next-generation, multi-tenant, serverless AI co-pilot for clinical workflows, triage prediction, and hospital operations.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_16-3ecf8e?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database Setup (Supabase)](#database-setup-supabase)
8. [Authentication & Security](#authentication--security)
9. [Role Permissions](#role-permissions)
10. [Project Structure](#project-structure)
11. [API Routes](#api-routes)
12. [Deployment](#deployment)

---

## Overview

MedOS AI is a **multi-tenant, serverless-first, AI-augmented Hospital Management System** built on the modern web stack. Each hospital operates as an isolated tenant with its own staff, patients, and data — all within a single deployment. The platform:

- Runs at **zero cost** at validation/prototype scale (Supabase free tier + Vercel hobby)
- Has a **clear upgrade path** to production (Supabase Pro + Vercel Pro)
- Supports **multi-tenancy** with hospital-scoped data isolation via RLS policies
- Enforces **RBAC** (Role-Based Access Control) at the middleware layer and database level
- Includes an **AI Chat co-pilot** powered by Hugging Face Inference for clinical support and triage
- Features a **MEWS-based AI Triage Engine** (Modified Early Warning Score) for risk stratification
- Automatically logs every write operation to an **immutable audit trail**
- Provides **dark/light theme** support with system preference detection

---

## Architecture

```
Browser (Next.js 16 App Router, React 19)
   │
   ├── /  ─────────────── Landing Page (Client-rendered)
   ├── /login ──────────── Auth Page (Supabase Auth)
   ├── /signup/admin ────── Hospital Registration (creates tenant)
   ├── /signup/join ─────── Staff/Doctor Onboarding (token-gated)
   └── /dashboard/* ─────── Protected (RBAC via middleware)
         ├── Overview ────── Role-aware KPI dashboard
         ├── AI Chat ─────── Conversational AI co-pilot
         ├── Patients ────── CRUD + detail drawer
         ├── Appointments ── Booking + status tracking
         ├── Pharmacy ────── Inventory + low-stock alerts
         ├── Lab ──────────── LOINC-coded orders + results
         ├── Radiology ───── PACS imaging + AI notes
         ├── Finance ─────── Revenue KPIs + billing
         ├── Staff ────────── Shifts + performance
         ├── Audit ────────── Immutable compliance logs
         ├── Settings ─────── Profile + password + session
         └── Triage ────────── (redirects → AI Chat)
               │
               └── Supabase (PostgreSQL 16 + Auth + RLS)
```

**Middleware (`src/proxy.ts`)** intercepts all routes (except API, static assets, and images), validates the Supabase session, enforces RBAC permissions, and redirects unauthorised or unauthenticated requests.

---

## Features

| Module | Description |
|--------|-------------|
| 🏠 **Overview** | Role-aware KPI cards (patients, appointments, low-stock, pending labs) + quick actions |
| 🤖 **AI Chat** | Conversational AI co-pilot for clinical workflows, documentation, and care support (all roles) |
| 🧠 **AI Triage** | MEWS-based risk stratification with colour-coded risk cards and save-to-record |
| 👥 **Patients** | Full CRUD, search, slide-in detail drawer with edit modal |
| 📅 **Appointments** | Booking modal, status tracking (Scheduled / Completed / Cancelled / No-show) |
| 💊 **Pharmacy** | Inventory management, low-stock alerting, upsert restocking |
| 🧪 **Lab** | LOINC-coded lab orders, result tracking, status filter pills |
| 🖥️ **Radiology** | PACS image logging with AI prediction and doctor notes, card grid view |
| 💰 **Finance** | Revenue KPIs, collection rate, filterable bills table (NGN) |
| 👔 **Staff** | Shift scheduling, performance star-ratings, role badges |
| 🛡️ **Audit Logs** | Immutable compliance trail with full-text search and table/action-type filters |
| ⚙️ **Settings** | Profile editing, password change, auto-logout status |
| 🌗 **Theme** | Dark/light mode with system preference detection and persistent toggle |
| 🔔 **Activity Feed** | Real-time notification bell with recent activity from all modules |
| 🧭 **Breadcrumbs** | Context-aware breadcrumb navigation across all dashboard pages |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 + custom clinical dark/light theme |
| UI Icons | Lucide React |
| Backend | Next.js API Routes (Node.js serverless) |
| Database | Supabase (PostgreSQL 16) |
| Auth | Supabase Auth + JWT |
| Session | `@supabase/ssr` (cookie-based, 7-day refresh) |
| AI Chat | Hugging Face Inference Router (via `openai` SDK) |
| Email | Resend (appointment email alerts) |
| Deployment | Vercel (Edge Network) |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)

### 1. Clone the repository

```bash
git clone https://github.com/devadex247/medos.git
cd medos
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root. See [Environment Variables](#environment-variables) below.

### 4. Set up the database

Follow the [Database Setup](#database-setup-supabase) section.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

Create a `.env.local` file in the project root:

```env
# ── Supabase (Required) ───────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-only, never expose to client

# ── Resend (Required for appointment email alerts) ─
RESEND_API_KEY=<your-resend-api-key>

# ── Hugging Face (Required for AI Chat co-pilot) ──
HF_TOKEN=<your-hugging-face-token>

# ── OpenAI (Optional — overrides HF for AI chat) ──
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_CHAT_MODEL=<model-name>       # Optional, defaults to router default
OPENAI_TRIAGE_MODEL=<model-name>     # Optional, defaults to router default
```

> **Never commit `.env.local` to version control.** It is already in `.gitignore`.

---

## Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** in your project dashboard
3. Paste the entire contents of [`supabase_schema.sql`](supabase_schema.sql) and run it
4. The schema creates **19 tables** with Row Level Security (RLS) policies:

   | # | Table | Purpose |
   |---|-------|---------|
   | 1 | `users` | Public profiles (mirrors `auth.users`) |
   | 2 | `hospitals` | Tenant organisations |
   | 3 | `hospital_access_tokens` | Invite tokens for staff onboarding |
   | 4 | `hospital_memberships` | User ↔ Hospital associations |
   | 5 | `departments` | Hospital departments |
   | 6 | `doctors` | Doctor profiles |
   | 7 | `patients` | Patient records |
   | 8 | `appointments` | Booking & scheduling |
   | 9 | `medical_records` | Clinical notes |
   | 10 | `patient_vitals` | Vital signs history |
   | 11 | `ai_recommendation_feedback` | AI prediction feedback loop |
   | 12 | `admissions` | Inpatient admissions |
   | 13 | `inventories` | Pharmacy stock |
   | 14 | `prescriptions` | Medication prescriptions |
   | 15 | `staff_schedules` | Shift scheduling |
   | 16 | `bills` | Financial billing |
   | 17 | `insurance_claims` | Insurance claim tracking |
   | 18 | `lab_orders` | LOINC-coded laboratory orders |
   | 19 | `radiology_images` | PACS imaging records |
   | 20 | `audit_logs` | Immutable compliance trail |

5. The schema also includes:
   - Performance indexes on all foreign keys and common query patterns
   - An auto-profile trigger (`on_auth_user_created`) that creates a `public.users` row on signup
   - Multi-tenant RLS policies scoped by `hospital_id`

6. Configure Auth settings in your Supabase dashboard:
   - **JWT expiry**: 604800 seconds (7 days)
   - **Refresh token rotation**: Enabled
   - **Site URL**: Your production URL (or `http://localhost:3000` for local dev)

> If you need to fix existing `hospital_id` relationships, see [`supabase_fix_users_hospital_id.sql`](supabase_fix_users_hospital_id.sql).

---

## Authentication & Security

| Feature | Implementation |
|---------|---------------|
| Session management | `@supabase/ssr` — cookie-based, works with Next.js SSR/RSC |
| 7-day sessions | Supabase refresh token rotation (configurable in dashboard) |
| Auto-logout | `AutoLogoutHandler` component — 15 min inactivity → sign out |
| RBAC middleware | `src/proxy.ts` — validates session + role on every request |
| Multi-tenant isolation | Hospital-scoped RLS policies on all data tables |
| Password reset | Supabase built-in email recovery flow |
| Token-gated signup | Staff/doctors join via hospital invite tokens |
| Server env validation | `server-env.ts` — startup checks for required environment variables |

### Auto-Logout Behaviour

The `AutoLogoutHandler` component listens for `mousemove`, `keydown`, `click`, `scroll`, and `touchstart` events. If no activity is detected for **15 minutes**, it calls `supabase.auth.signOut()` and redirects to `/login`. A 60-second warning toast appears before sign-out.

---

## Role Permissions

| Role | Access |
|------|--------|
| `owner_admin` | Full access to all modules including Finance, Staff, and Audit |
| `hospital_admin` | All modules including Finance, Staff, and Audit |
| `doctor` | Overview, AI Chat, Patients, Appointments, Lab, Radiology, Settings |
| `staff` | Overview, AI Chat, Patients, Appointments, Pharmacy, Lab, Radiology, Settings |
| `patient` | Overview, AI Chat, Settings (own data only) |

Roles are enforced at three levels:
1. **Middleware** (`src/proxy.ts`) — redirects on unauthenticated access or insufficient role
2. **RBAC module** (`src/lib/rbac.ts`) — defines route-level permissions with typed route keys
3. **Supabase RLS** — prevents direct API calls from returning unauthorised data

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout (theme provider, fonts, dark mode script)
│   ├── globals.css              # Tailwind v4 clinical dark/light theme
│   ├── page.tsx                 # Landing page (role previews, feature grid, CTA)
│   ├── login/page.tsx           # Login page
│   ├── signup/
│   │   ├── admin/page.tsx       # Hospital admin registration (creates tenant)
│   │   └── join/page.tsx        # Staff/doctor onboarding (token-gated)
│   ├── api/
│   │   ├── activity/
│   │   │   ├── log/route.ts     # POST — record audit activity
│   │   │   └── recent/route.ts  # GET — fetch recent activity feed
│   │   ├── ai/
│   │   │   ├── chat/route.ts    # POST — AI chat completion
│   │   │   └── triage/route.ts  # POST — AI triage assessment
│   │   ├── auth/
│   │   │   ├── register-admin/route.ts  # POST — hospital + admin registration
│   │   │   └── join-hospital/route.ts   # POST — token-gated staff join
│   │   ├── health/route.ts      # GET — health check + env status
│   │   ├── hospital/
│   │   │   └── invite-token/route.ts  # POST/GET — generate/validate invite tokens
│   │   └── patients/route.ts    # GET/POST/PUT/DELETE — patient CRUD
│   └── dashboard/
│       ├── layout.tsx           # Sidebar + topbar shell (RBAC-filtered nav)
│       ├── page.tsx             # Overview / KPI dashboard
│       ├── ai-chat/page.tsx     # AI Chat co-pilot
│       ├── triage/page.tsx      # Redirects → /dashboard/ai-chat
│       ├── patients/page.tsx    # Patient management
│       ├── appointments/page.tsx
│       ├── pharmacy/page.tsx
│       ├── lab/page.tsx
│       ├── radiology/page.tsx
│       ├── finance/page.tsx
│       ├── staff/page.tsx
│       ├── audit/page.tsx       # Immutable compliance logs
│       └── settings/page.tsx
├── components/
│   ├── AutoLogoutHandler.tsx    # 15-min inactivity sign-out
│   ├── Breadcrumbs.tsx          # Context-aware breadcrumb navigation
│   ├── EditModal.tsx            # Generic slide-in modal for editing
│   ├── PatientEditForm.tsx      # Patient-specific edit form
│   ├── ScrollToTop.tsx          # Floating scroll-up button
│   ├── ThemeProvider.tsx        # Dark/light theme context provider
│   └── ThemeToggle.tsx          # Theme toggle button
├── lib/
│   ├── activity.ts              # Activity logging + recent activity fetcher
│   ├── api-utils.ts             # Shared API response helpers
│   ├── auth-context.ts          # Auth context utilities
│   ├── rbac.ts                  # Role definitions, route permissions, access checks
│   ├── server-env.ts            # Server-side env validation (required + optional)
│   ├── triage.ts                # MEWS score calculator + risk stratification
│   └── supabase/
│       ├── admin.ts             # Admin-level Supabase client (service role)
│       ├── client.ts            # Browser-side Supabase client
│       ├── server.ts            # Server-side Supabase client (RSC/API)
│       └── middleware.ts        # Session refresh helper for middleware
└── proxy.ts                     # Next.js middleware — RBAC + auth enforcement
```

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/health` | GET | Health check + environment configuration status |
| `/api/auth/register-admin` | POST | Register a new hospital + owner admin account |
| `/api/auth/join-hospital` | POST | Token-gated staff/doctor registration |
| `/api/hospital/invite-token` | POST/GET | Generate or validate hospital invite tokens |
| `/api/patients` | GET/POST/PUT/DELETE | Full patient CRUD (hospital-scoped) |
| `/api/ai/chat` | POST | AI chat completion via Hugging Face / OpenAI |
| `/api/ai/triage` | POST | AI-powered triage assessment |
| `/api/activity/log` | POST | Record an audit activity entry |
| `/api/activity/recent` | GET | Fetch recent activity for the notification feed |

---

## Deployment

### Vercel (Recommended)

1. Push your code to a GitHub repository
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables from `.env.local` in the Vercel project settings
4. Vercel auto-detects Next.js and deploys to the Edge Network

```bash
# Or deploy from CLI
npx vercel --prod
```

### Supabase (Production)

For production workloads, upgrade your Supabase project to **Pro** to get:
- Dedicated Postgres with no pausing
- Point-in-time recovery (PITR)
- Higher connection limits
- Custom domains for Auth emails

---

## License

MIT © 2026 MedOS Team
