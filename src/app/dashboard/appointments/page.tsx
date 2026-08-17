"use client";

import { useEffect, useState, useCallback } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays, Search, Plus, X, Loader2, AlertCircle,
  ChevronDown, CheckCircle2, Clock, XCircle, Pencil,
} from "lucide-react";

type Appointment = {
  id: number;
  date: string;
  status: string;
  notes: string | null;
  doctor_id?: number;
  patient_id?: number;
  doctors: { name: string; specialization: string } | null;
  patients: { name: string; personal_id: string } | null;
};

type Doctor = { id: number; name: string; specialization: string };
type Patient = { id: number; name: string; personal_id: string };

const STATUS_STYLES: Record<string, string> = {
  Scheduled: "bg-med-teal/15 text-med-teal",
  Completed: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-red-500/15 text-red-400",
  "No-show": "bg-amber-500/15 text-amber-400",
};

const STATUS_ICONS: Record<string, React.ReactElement> = {
  Scheduled: <Clock size={12} />,
  Completed: <CheckCircle2 size={12} />,
  Cancelled: <XCircle size={12} />,
  "No-show": <AlertCircle size={12} />,
};

const EMPTY_FORM = { doctor_id: "", patient_id: "", date: "", status: "Scheduled", notes: "" };

export default function AppointmentsPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);

  const EDIT_ROLES = ["owner_admin", "hospital_admin", "doctor", "staff"];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => setProfile(data));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, date, status, notes, doctor_id, patient_id, doctors(name, specialization), patients(name, personal_id)")
      .order("date", { ascending: false })
      .limit(100);
    setAppointments((data ?? []) as unknown as Appointment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from("doctors").select("id, name, specialization").then(({ data }) => setDoctors(data ?? []));
    supabase.from("patients").select("id, name, personal_id").then(({ data }) => setPatients(data ?? []));
  }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); };
  const openEdit = (a: Appointment) => {
    setEditTarget(a);
    setForm({
      doctor_id: String(a.doctor_id ?? ""),
      patient_id: String(a.patient_id ?? ""),
      date: a.date ? new Date(a.date).toISOString().slice(0, 16) : "",
      status: a.status,
      notes: a.notes ?? "",
    });
    setError("");
    setShowModal(true);
  };

  const filtered = appointments.filter((a) =>
    !search.trim() ||
    a.patients?.name.toLowerCase().includes(search.toLowerCase()) ||
    a.doctors?.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.doctor_id || !form.patient_id || !form.date) {
      setError("Doctor, patient, and date are required.");
      return;
    }
    setSaving(true); setError("");

    if (editTarget) {
      // UPDATE
      const { error: err } = await supabase.from("appointments").update({
        doctor_id: Number(form.doctor_id),
        patient_id: Number(form.patient_id),
        date: form.date,
        status: form.status,
        notes: form.notes || null,
      }).eq("id", editTarget.id);

      if (err) { setError(err.message); setSaving(false); return; }

      const patient = patients.find((p) => String(p.id) === form.patient_id);
      await recordActivity({
        action: `Updated appointment for ${patient?.name ?? "patient"} — status: ${form.status}.`,
        actionType: "update",
        tableName: "appointments",
        patientId: Number(form.patient_id),
        details: form.notes || form.status,
      });
    } else {
      // CREATE
      const { error: err } = await supabase.from("appointments").insert([{
        doctor_id: Number(form.doctor_id),
        patient_id: Number(form.patient_id),
        date: form.date,
        status: form.status,
        notes: form.notes || null,
      }]);
      if (err) { setError(err.message); setSaving(false); return; }

      const patient = patients.find((p) => String(p.id) === form.patient_id);
      const doctor = doctors.find((d) => String(d.id) === form.doctor_id);
      await recordActivity({
        action: `Booked appointment for ${patient?.name ?? "patient"} with ${doctor?.name ?? "doctor"}.`,
        actionType: "create",
        tableName: "appointments",
        patientId: Number(form.patient_id),
        details: `${form.status}${form.notes ? ` - ${form.notes}` : ""}`,
      });
    }

    setSaving(false); setShowModal(false); load();
  };

  const canEdit = profile && EDIT_ROLES.includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays size={20} className="text-med-teal" /> Appointments
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{appointments.length} total records</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all">
          <Plus size={16} /> New Appointment
        </button>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search patient or doctor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-500 outline-none focus:border-med-teal transition-colors"
        />
      </div>

      {/* table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No appointments found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Patient", "Doctor", "Date & Time", "Status", "Notes", ...(canEdit ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-slate-100 font-medium">{a.patients?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{a.patients?.personal_id}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-200">{a.doctors?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500">{a.doctors?.specialization}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">{new Date(a.date).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[a.status] ?? "bg-slate-700 text-slate-300"}`}>
                        {STATUS_ICONS[a.status]}
                        {a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate">{a.notes ?? "—"}</td>
                    {canEdit && (
                      <td className="px-5 py-3.5">
                        <button onClick={() => openEdit(a)} className="flex items-center gap-1 text-xs text-med-teal hover:underline">
                          <Pencil size={12} /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="glass-panel rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">{editTarget ? "Edit Appointment" : "New Appointment"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

              {/* patient select */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Patient *</label>
                <div className="relative">
                  <select value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    <option value="">Select patient…</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.personal_id}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* doctor select */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Doctor *</label>
                <div className="relative">
                  <select value={form.doctor_id} onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    <option value="">Select doctor…</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Date & Time *</label>
                <input type="datetime-local" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    {["Scheduled", "Completed", "Cancelled", "No-show"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
                  placeholder="Optional…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-teal hover:bg-sky-400 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Book Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
