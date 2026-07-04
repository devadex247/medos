"use client";

import { useEffect, useState, useCallback } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { UserCog, Plus, X, Loader2, AlertCircle, ChevronDown, Star, Pencil } from "lucide-react";

type Schedule = {
  id: number;
  staff_name: string;
  role: string;
  shift_start: string;
  shift_end: string;
  performance_rating: number;
  departments: { name: string } | null;
  department_id?: number;
};

type Department = { id: number; name: string };

const ROLES = ["Nurse", "Pharmacist", "Lab Technician", "Radiographer", "Receptionist", "Security", "Cleaner", "Administrative Staff"];

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} size={12} className={star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-700"} />
      ))}
      <span className="ml-1 text-xs text-slate-400">{rating.toFixed(1)}</span>
    </div>
  );
}

function shiftDuration(start: string, end: string) {
  const h = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  return `${h.toFixed(1)}h`;
}

const EMPTY_FORM = { staff_name: "", role: "Nurse", department_id: "", shift_start: "", shift_end: "", performance_rating: "5" };

export default function StaffPage() {
  const supabase = createClient();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Schedule | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);

  // Only admins can manage staff schedules
  const EDIT_ROLES = ["owner_admin", "hospital_admin"];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("users").select("role").eq("id", user.id).single().then(({ data }) => setProfile(data));
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_schedules")
      .select("id, staff_name, role, shift_start, shift_end, performance_rating, department_id, departments(name)")
      .order("shift_start", { ascending: false }).limit(100);
    setSchedules((data ?? []) as unknown as Schedule[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from("departments").select("id, name").then(({ data }) => setDepartments(data ?? []));
  }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); };
  const openEdit = (s: Schedule) => {
    setEditTarget(s);
    setForm({
      staff_name: s.staff_name,
      role: s.role,
      department_id: String(s.department_id ?? ""),
      shift_start: s.shift_start ? new Date(s.shift_start).toISOString().slice(0, 16) : "",
      shift_end: s.shift_end ? new Date(s.shift_end).toISOString().slice(0, 16) : "",
      performance_rating: String(s.performance_rating),
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.staff_name || !form.shift_start || !form.shift_end) { setError("Name, shift start and end are required."); return; }
    if (new Date(form.shift_end) <= new Date(form.shift_start)) { setError("Shift end must be after shift start."); return; }
    setSaving(true); setError("");

    const payload = {
      staff_name: form.staff_name,
      role: form.role,
      department_id: form.department_id ? Number(form.department_id) : null,
      shift_start: form.shift_start,
      shift_end: form.shift_end,
      performance_rating: parseFloat(form.performance_rating),
    };

    if (editTarget) {
      const { error: err } = await supabase.from("staff_schedules").update(payload).eq("id", editTarget.id);
      if (err) { setError(err.message); setSaving(false); return; }

      await recordActivity({
        action: `Updated schedule for ${form.staff_name} (${form.role}).`,
        actionType: "update",
        tableName: "staff_schedules",
        details: `${form.shift_start} to ${form.shift_end}, rating: ${form.performance_rating}`,
      });
    } else {
      const { error: err } = await supabase.from("staff_schedules").insert([payload]);
      if (err) { setError(err.message); setSaving(false); return; }

      await recordActivity({
        action: `Scheduled ${form.staff_name} for a ${form.role} shift.`,
        actionType: "create",
        tableName: "staff_schedules",
        details: `${form.shift_start} to ${form.shift_end}`,
      });
    }

    setSaving(false); setShowModal(false);
    setForm(EMPTY_FORM);
    load();
  };

  const roleColor: Record<string, string> = {
    Nurse: "bg-emerald-500/15 text-emerald-400",
    Pharmacist: "bg-amber-500/15 text-amber-400",
    "Lab Technician": "bg-med-accent/15 text-med-accent",
    Radiographer: "bg-sky-500/15 text-sky-400",
    Receptionist: "bg-med-teal/15 text-med-teal",
  };

  const canEdit = profile && EDIT_ROLES.includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><UserCog size={20} className="text-amber-400" /> Staff Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">{schedules.length} shift records</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all">
            <Plus size={16} /> Add Schedule
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No staff schedules found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {["Staff Name", "Role", "Department", "Shift Start", "Duration", "Rating", ...(canEdit ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">{s.staff_name[0]?.toUpperCase()}</div>
                        <span className="text-slate-100 font-medium">{s.staff_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleColor[s.role] ?? "bg-slate-700 text-slate-300"}`}>{s.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{s.departments?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs whitespace-nowrap">{new Date(s.shift_start).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-slate-400">{shiftDuration(s.shift_start, s.shift_end)}</td>
                    <td className="px-5 py-3.5"><RatingStars rating={s.performance_rating} /></td>
                    {canEdit && (
                      <td className="px-5 py-3.5">
                        <button onClick={() => openEdit(s)} className="flex items-center gap-1 text-xs text-med-teal hover:underline">
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
              <h2 className="text-base font-semibold text-white">{editTarget ? `Edit — ${editTarget.staff_name}` : "Add Shift Schedule"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Staff Name *</label>
                <input type="text" value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Role</label>
                <div className="relative">
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Department</label>
                <div className="relative">
                  <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    <option value="">None</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Shift Start *</label>
                  <input type="datetime-local" value={form.shift_start} onChange={(e) => setForm({ ...form, shift_start: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Shift End *</label>
                  <input type="datetime-local" value={form.shift_end} onChange={(e) => setForm({ ...form, shift_end: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Performance Rating (1–5): <span className="text-white font-semibold">{form.performance_rating}</span></label>
                <input type="range" min="1" max="5" step="0.5" value={form.performance_rating}
                  onChange={(e) => setForm({ ...form, performance_rating: e.target.value })}
                  className="w-full accent-amber-400" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Save Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
