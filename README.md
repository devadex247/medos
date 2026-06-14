# MedOS AI — Hospital Management System

> **Next-generation, serverless AI co-pilot for clinical workflows, triage prediction, and hospital operations.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_16-3ecf8e?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Featurnpes](#features)
4. [Tech Stack](#tech-stack)
5. [Getting Started](#getting-started)
6. [Environment Variables](#environment-variables)
7. [Database Setup (Supabase)](#database-setup-supabase)
8. [Authentication & Security](#authentication--security)
9. [Role Permissions](#role-permissions)
10. [Project Structure](#project-structure)
11. [Deployment](#deployment)

---

## Overview

MedOS AI is a **serverless-first, AI-augmented Hospital Management System** built on the modern web stack. It replaces the legacy Flask/SQLite backend with a fully scalable Next.js 15 + Supabase architecture that:

- Runs at **zero cost** at validation/prototype scale (Supabase free tier + Vercel hobby)
- Has a **clear upgrade path** to production (Supabase Pro + Vercel Pro)
- Enforces **RBAC** (Role-Based Access Control) at the middleware layer
- Includes an **AI Triage Engine** using the MEWS (Modified Early Warning Score) algorithm
- Automatically logs every write operation to an **immutable audit trail**

---

## Architecture

```
Browser (Next.js App Router)
   │
   ├── /  ─────────────── Landing Page (Static)
   ├── /login ──────────── Auth Page (Supabase Auth)
   ├── /signup/admin ────── Hospital Registration
   ├── /signup/join ─────── Staff/Doctor Onboarding (Token-gated)
   └── /dashboard/* ─────── Protected (RBAC via middleware)
         │
         └── Supabase (PostgreSQL 16 + Auth + RLS)
```

**Middleware (`src/proxy.ts`)** intercepts all `/dashboard/*` routes, validates the Supabase session, and redirects unauthorised requests to `/login`.

---

## Features

| Module | Description |
|--------|-------------|
| 🏠 **Overview** | Live KPI cards (patients, appointments, low-stock, pending labs) + quick actions |
| 🧠 **AI Triage** | MEWS-based risk stratification with colour-coded risk cards and save-to-record |
| 👥 **Patients** | Full CRUD, search, slide-in detail drawer |
| 📅 **Appointments** | Booking modal, status tracking (Scheduled / Completed / Cancelled / No-show) |
| 💊 **Pharmacy** | Inventory management, low-stock alerting, upsert restocking |
| 🧪 **Lab** | LOINC-coded lab orders, result tracking, status filter pills |
| 🖥️ **Radiology** | PACS image logging with AI prediction and doctor notes, card grid view |
| 💰 **Finance** | Revenue KPIs, collection rate, filterable bills table (NGN) |
| 👔 **Staff** | Shift scheduling, performance star-ratings, role badges |
| 🛡️ **Audit Logs** | Immutable compliance trail with full-text search and table/action-type filters |
| ⚙️ **Settings** | Profile editing, password change, auto-logout status |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 + custom dark theme |
| UI Icons | Lucide React |
| Backend | Next.js API Routes (Node.js serverless) |
| Database | Supabase (PostgreSQL 16) |
| Auth | Supabase Auth + JWT |
| Session | `@supabase/ssr` (cookie-based, 7-day refresh) |
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
git clone https://github.com/your-org/hospital-management-system.git
cd hospital-management-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

See [Environment Variables](#environment-variables) below.

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
# ── Supabase ───────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>  # Server-only, never expose to client

# ── App ────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── AI (optional) ──────────────────────────────────
OPENAI_API_KEY=<your-openai-api-key>
```

> **Never commit `.env.local` to version control.** It is already in `.gitignore`.

---

## Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Navigate to **SQL Editor** in your project dashboard
3. Paste the entire contents of [`supabase_schema.sql`](supabase_schema.sql) and run it
4. The schema creates:
   - 20 tables with Row Level Security (RLS) policies
   - Performance indexes on all foreign keys and common query patterns
   - An auto-profile trigger (`on_auth_user_created`) that creates a `public.users` row on signup
5. Configure Auth settings in your Supabase dashboard:
   - **JWT expiry**: 604800 seconds (7 days)
   - **Refresh token rotation**: Enabled
   - **Site URL**: Your production URL (or `http://localhost:3000` for local dev)

---

## Authentication & Security

| Feature | Implementation |
|---------|---------------|
| Session management | `@supabase/ssr` — cookie-based, works with Next.js SSR/RSC |
| 7-day sessions | Supabase refresh token rotation (configurable in dashboard) |
| Auto-logout | `AutoLogoutHandler` component — 15 min inactivity → sign out |
| RBAC middleware | `src/proxy.ts` — validates session on every `/dashboard/*` request |
| Password reset | Supabase built-in email recovery flow |
| RLS | Every table has row-level security policies scoped by role |

### Auto-Logout Behaviour

The `AutoLogoutHandler` component listens for `mousemove`, `keydown`, `click`, `scroll`, and `touchstart` events. If no activity is detected for **15 minutes**, it calls `supabase.auth.signOut()` and redirects to `/login`. A 60-second warning toast appears before sign-out.

---

## Role Permissions

| Role | Access |
|------|--------|
| `owner_admin` | Full access to all modules |
| `hospital_admin` | All modules except system-level owner settings |
| `doctor` | Patients, Appointments, AI Triage, Lab, Radiology, Settings |
| `staff` | Patients, Appointments, Pharmacy, Lab, Radiology, Settings |
| `patient` | Overview, Settings (own data only) |

Roles are enforced at two levels:
1. **Middleware** (`src/proxy.ts`) — redirects on unauthenticated access
2. **Supabase RLS** — prevents direct API calls from returning unauthorised data

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx               # Root layout (fonts, dark mode)
│   ├── globals.css              # Tailwind v4 clinical dark theme
│   ├── page.tsx                 # Landing page
│   ├── login/page.tsx           # Login page
│   ├── signup/
│   │   ├── admin/page.tsx       # Hospital admin registration
│   │   └── join/page.tsx        # Staff/doctor onboarding (token-gated)
│   └── dashboard/
│       ├── layout.tsx           # Sidebar + topbar shell
│       ├── page.tsx             # Overview / KPI dashboard
│       ├── triage/page.tsx      # AI Triage engine (MEWS)
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
│   └── ScrollToTop.tsx          # Floating scroll-up button
├── lib/
│   └── supabase/
│       ├── client.ts            # Browser-side Supabase client
│       ├── server.ts            # Server-side Supabase client (RSC/API)
│       └── middleware.ts        # Session refresh helper
└── proxy.ts                     # Next.js middleware — RBAC enforcement
```

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

MIT © 2025 MedOS AI Team
