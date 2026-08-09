"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchRecentActivity, formatActivityTime, recordActivity, type RecentActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import {
  getAllowedDashboardRoutes,
  getRoleLabel,
  normalizeRole,
  type DashboardRouteKey,
  type Role,
} from "@/lib/rbac";
import {
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  BrainCircuit,
  Activity,
  Clock,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Settings,
  Scan,
  DollarSign,
  UserCog,
  ShieldCheck,
  Clipboard,
  CreditCard,
  HeartPulse,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────
type KPI = {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  href: string;
  trend?: string;
};

type Profile = {
  role: Role;
  full_name?: string;
  username: string;
};

type PatientRecord = {
  id: number;
  name: string;
  personal_id: string;
};

type PatientAppointment = {
  id: number;
  date: string;
  status: string;
  notes: string | null;
  doctors: { name: string; specialization: string } | null;
};

type PatientPrescription = {
  id: number;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  status: string;
  doctors: { name: string } | null;
  created_at: string;
};

type PatientBill = {
  id: number;
  amount: number;
  status: string;
  billing_date: string;
};

type PatientVital = {
  id: number;
  heart_rate: number;
  spo2: number;
  temperature: number;
  mews_score: number;
  risk_level: string;
  recommendation: string;
  created_at: string;
};

type PatientLabOrder = {
  id: number;
  test_name: string;
  status: string;
  result: string | null;
  created_at: string;
};

type PatientPortalData = {
  appointments: PatientAppointment[];
  prescriptions: PatientPrescription[];
  bills: PatientBill[];
  vitals: PatientVital[];
  labs: PatientLabOrder[];
};

const EMPTY_PATIENT_PORTAL_DATA: PatientPortalData = {
  appointments: [],
  prescriptions: [],
  bills: [],
  vitals: [],
  labs: [],
};

const ACTION_ICONS: Record<DashboardRouteKey, React.ElementType> = {
  overview: Activity,
  aiChat: BrainCircuit,
  patients: Users,
  appointments: CalendarDays,
  pharmacy: Pill,
  lab: FlaskConical,
  radiology: Scan,
  finance: DollarSign,
  staff: UserCog,
  audit: ShieldCheck,
  settings: Settings,
};

const ACTION_COLORS: Record<DashboardRouteKey, string> = {
  overview: "from-slate-600 to-slate-800",
  aiChat: "from-med-teal to-indigo-600",
  patients: "from-emerald-500 to-teal-600",
  appointments: "from-cyan-500 to-blue-600",
  pharmacy: "from-amber-500 to-orange-600",
  lab: "from-med-accent to-violet-600",
  radiology: "from-fuchsia-500 to-indigo-600",
  finance: "from-green-500 to-emerald-700",
  staff: "from-slate-500 to-slate-700",
  audit: "from-rose-500 to-red-700",
  settings: "from-slate-600 to-slate-800",
};

// ── Stat card component ────────────────────────────────────────────────────
function StatCard({ kpi, delay }: { kpi: KPI; delay: number }) {
  const Icon = kpi.icon;
  return (
    <Link
      href={kpi.href}
      className="glass-card rounded-3xl p-6 flex flex-col gap-4 group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-3xl flex items-center justify-center border border-blue-100 shadow-[0_18px_40px_-30px_rgba(56,189,248,0.35)] bg-gradient-to-br from-sky-500 to-blue-600 ${kpi.color}`}
        >
          <Icon size={20} className="text-white" />
        </div>
        <ArrowUpRight
          size={16}
          className="text-slate-500 group-hover:text-blue-700 transition-colors duration-200"
        />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900 tabular-nums">{kpi.value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{kpi.label}</p>
      </div>
      <p className="text-xs text-slate-400">{kpi.sub}</p>
    </Link>
  );
}

// ── Activity icon helper ───────────────────────────────────────────────────
function activityIcon(table: string) {
  const map: Record<string, React.ReactElement> = {
    appointments: <CalendarDays size={14} className="text-med-teal" />,
    patients: <Users size={14} className="text-emerald-400" />,
    lab_orders: <FlaskConical size={14} className="text-amber-400" />,
    prescriptions: <Pill size={14} className="text-med-accent" />,
    patient_vitals: <Activity size={14} className="text-rose-400" />,
  };
  return map[table] ?? <CheckCircle2 size={14} className="text-slate-400" />;
}

function buildRoleKpis(
  role: Role,
  counts: {
    patients: number;
    appointments: number;
    lowStock: number;
    pendingLabs: number;
    highRiskVitals: number;
  }
): KPI[] {
  const clinicalRisk: KPI = {
    label: "High-risk Vitals",
    value: counts.highRiskVitals,
    sub: "High or critical MEWS records",
    icon: HeartPulse,
    color: "text-rose-400",
    href: "/dashboard/patients",
  };

  const patients: KPI = {
    label: "Total Patients",
    value: counts.patients,
    sub: "Registered in MedOS",
    icon: Users,
    color: "text-emerald-400",
    href: "/dashboard/patients",
  };

  const appointments: KPI = {
    label: "Scheduled Appointments",
    value: counts.appointments,
    sub: "Active bookings today",
    icon: CalendarDays,
    color: "text-med-teal",
    href: "/dashboard/appointments",
  };

  const lowStock: KPI = {
    label: "Low Stock Drugs",
    value: counts.lowStock,
    sub: "Items below threshold",
    icon: Pill,
    color: "text-amber-400",
    href: "/dashboard/pharmacy",
  };

  const pendingLabs: KPI = {
    label: "Pending Lab Tests",
    value: counts.pendingLabs,
    sub: "Awaiting results",
    icon: FlaskConical,
    color: "text-med-accent",
    href: "/dashboard/lab",
  };

  if (role === "doctor") {
    return [patients, appointments, clinicalRisk, pendingLabs];
  }

  if (role === "staff") {
    return [patients, appointments, lowStock, pendingLabs];
  }

  return [patients, appointments, lowStock, pendingLabs];
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DashboardOverview() {
  const supabase = useMemo(() => createClient(), []);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientRecord, setPatientRecord] = useState<PatientRecord | null>(null);
  const [patientPortalData, setPatientPortalData] = useState<PatientPortalData>(EMPTY_PATIENT_PORTAL_DATA);
  const [patientActionLoading, setPatientActionLoading] = useState("");
  const [patientActionMessage, setPatientActionMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [profileRes, patientsRes, appointmentsRes, inventoryRes, labRes, vitalsRes, recentActivity] =
        await Promise.all([
          supabase.from("users").select("role, full_name, username").eq("id", user.id).single(),
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Scheduled"),
          supabase.from("inventories").select("id", { count: "exact", head: true }).lt("quantity", 10),
          supabase.from("lab_orders").select("id", { count: "exact", head: true }).eq("status", "Pending"),
          supabase.from("patient_vitals").select("id", { count: "exact", head: true }).in("risk_level", ["High Risk", "Critical"]),
          fetchRecentActivity(8),
        ]);

      const role = normalizeRole(profileRes.data?.role);
      const loadedProfile = profileRes.data
        ? {
            role,
            full_name: profileRes.data.full_name ?? undefined,
            username: profileRes.data.username,
          }
        : null;

      setProfile(loadedProfile);
      setActivity(recentActivity);

      if (role === "patient") {
        const { data: patient } = await supabase
          .from("patients")
          .select("id, name, personal_id")
          .eq("user_id", user.id)
          .maybeSingle();

        setPatientRecord(patient ?? null);

        if (!patient) {
          setPatientPortalData(EMPTY_PATIENT_PORTAL_DATA);
          setKpis([
            {
              label: "Care Profile",
              value: "Pending",
              sub: "Your patient file is not linked yet",
              icon: AlertCircle,
              color: "text-amber-400",
              href: "/dashboard/settings",
            },
            {
              label: "Portal Role",
              value: getRoleLabel(role),
              sub: "Profile-only access is active",
              icon: CheckCircle2,
              color: "text-emerald-400",
              href: "/dashboard/settings",
            },
          ]);
        } else {
          const [patientAppointments, patientPrescriptions, patientBills, latestVitals, patientLabs] =
            await Promise.all([
              supabase
                .from("appointments")
                .select("id, date, status, notes, doctors(name, specialization)")
                .eq("patient_id", patient.id)
                .order("date", { ascending: true })
                .limit(5),
              supabase
                .from("prescriptions")
                .select("id, medicine_name, dosage, frequency, duration, status, created_at, doctors(name)")
                .eq("patient_id", patient.id)
                .order("created_at", { ascending: false })
                .limit(5),
              supabase
                .from("bills")
                .select("id, amount, status, billing_date")
                .eq("patient_id", patient.id)
                .order("billing_date", { ascending: false })
                .limit(5),
              supabase
                .from("patient_vitals")
                .select("id, heart_rate, spo2, temperature, mews_score, risk_level, recommendation, created_at")
                .eq("patient_id", patient.id)
                .order("created_at", { ascending: false })
                .limit(5),
              supabase
                .from("lab_orders")
                .select("id, test_name, status, result, created_at")
                .eq("patient_id", patient.id)
                .order("created_at", { ascending: false })
                .limit(5),
            ]);

          const appointments = (patientAppointments.data ?? []) as unknown as PatientAppointment[];
          const prescriptions = (patientPrescriptions.data ?? []) as unknown as PatientPrescription[];
          const bills = (patientBills.data ?? []) as PatientBill[];
          const vitals = (latestVitals.data ?? []) as PatientVital[];
          const labs = (patientLabs.data ?? []) as PatientLabOrder[];
          const openBills = bills.filter((bill) => bill.status !== "Paid");
          const latestVital = vitals[0];

          setPatientPortalData({
            appointments,
            prescriptions,
            bills,
            vitals,
            labs,
          });

          setKpis([
            {
              label: "Patient ID",
              value: patient.personal_id,
              sub: patient.name,
              icon: Users,
              color: "text-emerald-400",
              href: "/dashboard/settings",
            },
            {
              label: "Scheduled Visits",
              value: appointments.filter((appointment) => appointment.status === "Scheduled").length,
              sub: "Upcoming appointments",
              icon: CalendarDays,
              color: "text-med-teal",
              href: "/dashboard",
            },
            {
              label: "Active Prescriptions",
              value: prescriptions.filter((prescription) => prescription.status === "Active").length,
              sub: "Current medication records",
              icon: Pill,
              color: "text-amber-400",
              href: "/dashboard",
            },
            {
              label: "Latest Risk",
              value: latestVital?.risk_level ?? "No vitals",
              sub: latestVital ? `MEWS ${latestVital.mews_score}` : `${openBills.length} open bill(s)`,
              icon: Activity,
              color: latestVital?.risk_level === "Critical" ? "text-red-400" : "text-med-accent",
              href: "/dashboard",
            },
          ]);
        }

        setLoading(false);
        return;
      }

      setPatientRecord(null);
      setPatientPortalData(EMPTY_PATIENT_PORTAL_DATA);
      setKpis(buildRoleKpis(role, {
        patients: patientsRes.count ?? 0,
        appointments: appointmentsRes.count ?? 0,
        lowStock: inventoryRes.count ?? 0,
        pendingLabs: labRes.count ?? 0,
        highRiskVitals: vitalsRes.count ?? 0,
      }));
      setLoading(false);
    };
    load();
  }, [reloadKey, supabase]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const role = profile?.role ?? "patient";
  const refreshDashboard = async () => {
    setPatientActionMessage("");
    setReloadKey((key) => key + 1);
  };

  const copyPatientId = async () => {
    if (!patientRecord) return;

    await navigator.clipboard.writeText(patientRecord.personal_id);
    setPatientActionMessage("Patient ID copied.");
  };

  const requestPatientFollowUp = async () => {
    if (patientActionLoading) return;

    setPatientActionLoading("follow-up");
    setPatientActionMessage("");

    const ok = await recordActivity({
      action: patientRecord
        ? `${patientRecord.name} requested a follow-up appointment.`
        : "Patient requested hospital team support to link their care file.",
      actionType: "request",
      tableName: patientRecord ? "appointments" : "patients",
      patientId: patientRecord?.id ?? null,
      details: patientRecord ? `Patient ID ${patientRecord.personal_id}` : "Patient account has no linked patient record.",
    });

    setActivity(await fetchRecentActivity(8));
    setPatientActionMessage(ok ? "Request sent to the hospital activity queue." : "Request could not be sent. Try again.");
    setPatientActionLoading("");
  };

  const quickActions = getAllowedDashboardRoutes(role)
    .filter((route) => route.key !== "overview")
    .slice(0, 4)
    .map((route) => ({
      label: route.key === "settings" && role === "patient" ? "Update Profile" : route.label,
      href: route.href,
      icon: ACTION_ICONS[route.key],
      color: ACTION_COLORS[route.key],
    }));

  return (
    <div className="space-y-8">
      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white">
          {greeting()},{" "}
          <span className="text-med-teal">
            {profile?.full_name?.split(" ")[0] ?? profile?.username ?? "User"}
          </span>{" "}
          👋
        </h1>
        <p className="text-slate-400 text-sm">
          {role === "patient"
            ? patientRecord
              ? `Your care profile is linked to ${patientRecord.personal_id}.`
              : "Your patient file is waiting to be linked by the hospital team."
            : `${getRoleLabel(role)} workspace summary for today's hospital operations.`}
        </p>
      </div>

      {/* ── KPI Grid ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 h-36 animate-pulse bg-white/90 dark:bg-slate-800/30" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <StatCard key={k.label} kpi={k} delay={i * 60} />
          ))}
        </div>
      )}

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="relative overflow-hidden rounded-3xl p-5 flex flex-col gap-3 group transition-all duration-300 border border-blue-100 bg-white/95 hover:shadow-[0_16px_40px_-24px_rgba(56,102,255,0.18)] shadow-[0_16px_40px_-24px_rgba(56,102,255,0.12)] dark:border-white/10 dark:bg-med-card dark:hover:shadow-[0_16px_40px_-24px_rgba(15,23,42,0.85)]"
              >
                <div className={`w-11 h-11 rounded-3xl bg-gradient-to-br ${a.color} flex items-center justify-center shadow-sm shadow-slate-900/30`}>
                  <Icon size={18} className="text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {a.label}
                </span>
                <span
                  className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br ${a.color} opacity-10 group-hover:opacity-20 transition-opacity`}
                />
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Patient Portal ─────────────────────────────────────────── */}
      {role === "patient" && !loading && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Patient Portal
            </h2>
            <div className="flex flex-wrap gap-2">
              {patientRecord && (
                <button
                  type="button"
                  onClick={copyPatientId}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-sky-50 hover:bg-sky-100 text-slate-900 transition-all"
                >
                  <Clipboard size={14} /> Copy ID
                </button>
              )}
              <button
                type="button"
                onClick={requestPatientFollowUp}
                disabled={patientActionLoading === "follow-up"}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-med-teal hover:bg-sky-400 text-white transition-all disabled:opacity-50"
              >
                {patientActionLoading === "follow-up" ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
                Request Follow-up
              </button>
              <button
                type="button"
                onClick={refreshDashboard}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:bg-white/5 transition-all"
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
          </div>

          {patientActionMessage && (
            <p className="text-sm text-med-teal bg-med-teal/10 border border-med-teal/20 rounded-xl px-4 py-3">
              {patientActionMessage}
            </p>
          )}

          {!patientRecord ? (
            <div className="glass-panel rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">Care file not linked yet</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Your account is active, but the hospital has not connected it to a patient record. Send a follow-up request or update your profile details.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={requestPatientFollowUp}
                  disabled={patientActionLoading === "follow-up"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all disabled:opacity-50"
                >
                  {patientActionLoading === "follow-up" ? <Loader2 size={14} className="animate-spin" /> : <CalendarDays size={14} />}
                  Ask Hospital To Link File
                </button>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-sky-50 hover:bg-sky-100 text-slate-900 transition-all"
                >
                  <Settings size={14} /> Update Profile
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <CalendarDays size={16} className="text-med-teal" />
                  <h3 className="text-sm font-semibold text-slate-100">Upcoming Visits</h3>
                </div>
                {patientPortalData.appointments.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No appointments are currently scheduled.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {patientPortalData.appointments.map((appointment) => (
                      <li key={appointment.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{new Date(appointment.date).toLocaleString()}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {appointment.doctors?.name ?? "Doctor pending"} · {appointment.doctors?.specialization ?? "Care team"}
                          </p>
                          {appointment.notes && <p className="text-xs text-slate-400 mt-1">{appointment.notes}</p>}
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-med-teal/15 text-med-teal">
                          {appointment.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <Pill size={16} className="text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Prescriptions</h3>
                </div>
                {patientPortalData.prescriptions.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No active prescriptions are on file.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {patientPortalData.prescriptions.map((prescription) => (
                      <li key={prescription.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{prescription.medicine_name}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {prescription.dosage} · {prescription.frequency} · {prescription.duration}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Doctor: {prescription.doctors?.name ?? "Care team"}</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400">
                            {prescription.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <HeartPulse size={16} className="text-rose-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Latest Vitals</h3>
                </div>
                {patientPortalData.vitals.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No vitals have been recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {patientPortalData.vitals.map((vital) => (
                      <li key={vital.id} className="px-5 py-3.5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-slate-100">{vital.risk_level} · MEWS {vital.mews_score}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              HR {vital.heart_rate} · SpO2 {vital.spo2}% · Temp {vital.temperature}C
                            </p>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{vital.recommendation}</p>
                          </div>
                          <span className="text-xs text-slate-500 whitespace-nowrap">{formatActivityTime(vital.created_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <FlaskConical size={16} className="text-med-accent" />
                  <h3 className="text-sm font-semibold text-slate-100">Lab Results</h3>
                </div>
                {patientPortalData.labs.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No lab orders are available.</p>
                ) : (
                  <ul className="divide-y divide-white/5">
                    {patientPortalData.labs.map((lab) => (
                      <li key={lab.id} className="px-5 py-3.5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{lab.test_name}</p>
                          <p className="text-xs text-slate-500 mt-1">{lab.result || "Result pending"}</p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-med-accent/15 text-med-accent">
                          {lab.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="glass-panel rounded-2xl overflow-hidden xl:col-span-2">
                <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                  <CreditCard size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Billing</h3>
                </div>
                {patientPortalData.bills.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500">No billing records are available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {["Date", "Amount", "Status"].map((heading) => (
                            <th key={heading} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {patientPortalData.bills.map((bill) => (
                          <tr key={bill.id}>
                            <td className="px-5 py-3.5 text-slate-400">{new Date(bill.billing_date).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5 text-slate-100 font-semibold tabular-nums">
                              ${bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400">
                                {bill.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Recent Activity
        </h2>
        <div className="glass-panel rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading activity…</span>
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-500">
              <AlertCircle size={24} />
              <p className="text-sm">No recent activity found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-med-teal flex items-center justify-center flex-shrink-0">
                    {activityIcon(a.table_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{a.action}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {a.username} · {a.table_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                    <Clock size={12} />
                    {formatActivityTime(a.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
