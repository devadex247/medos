"use client";

import { useEffect, useState, useCallback } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { FlaskConical, Plus, X, Loader2, AlertCircle, ChevronDown, Pencil } from "lucide-react";

type LabOrder = {
  id: number;
  test_name: string;
  loinc_code: string;
  status: string;
  result: string | null;
  created_at: string;
  doctor_id?: number;
  patient_id?: number;
  doctors: { name: string } | null;
  patients: { name: string; personal_id: string } | null;
};

type Doctor = { id: number; name: string };
type Patient = { id: number; name: string; personal_id: string };

const STATUS_STYLES: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-400",
  Processing: "bg-med-teal/15 text-med-teal",
  Completed: "bg-emerald-500/15 text-emerald-400",
  Cancelled: "bg-red-500/15 text-red-400",
};

const COMMON_TESTS = [
  { name: "Full Blood Count", loinc: "58410-2" },
  { name: "Comprehensive Metabolic Panel", loinc: "24323-8" },
  { name: "Lipid Panel", loinc: "57698-3" },
  { name: "Thyroid Stimulating Hormone", loinc: "11580-8" },
  { name: "HbA1c", loinc: "41995-2" },
  { name: "Urinalysis", loinc: "24357-6" },
  { name: "Blood Culture", loinc: "17928-3" },
  { name: "COVID-19 PCR", loinc: "94500-6" },
  { name: "Prothrombin Time", loinc: "5902-2" },
  { name: "C-Reactive Protein", loinc: "1988-5" },
];

const EMPTY_FORM = { patient_id: "", doctor_id: "", test_name: "", loinc_code: "", status: "Pending", result: "" };

export default function LabPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<LabOrder | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
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
      .from("lab_orders")
      .select("id, test_name, loinc_code, status, result, created_at, doctor_id, patient_id, doctors(name), patients(name, personal_id)")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data ?? []) as unknown as LabOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from("doctors").select("id, name").then(({ data }) => setDoctors(data ?? []));
    supabase.from("patients").select("id, name, personal_id").then(({ data }) => setPatients(data ?? []));
  }, [load]);

  const handleTestSelect = (name: string) => {
    const t = COMMON_TESTS.find((t) => t.name === name);
    setForm({ ...form, test_name: name, loinc_code: t?.loinc ?? "" });
  };

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); };
  const openEdit = (o: LabOrder) => {
    setEditTarget(o);
    setForm({
      patient_id: String(o.patient_id ?? ""),
      doctor_id: String(o.doctor_id ?? ""),
      test_name: o.test_name,
      loinc_code: o.loinc_code,
      status: o.status,
      result: o.result ?? "",
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.patient_id || !form.doctor_id || !form.test_name) { setError("Patient, doctor, and test are required."); return; }
    setSaving(true); setError("");

    if (editTarget) {
      const { error: err } = await supabase.from("lab_orders").update({
        status: form.status,
        result: form.result || null,
        loinc_code: form.loinc_code,
      }).eq("id", editTarget.id);

      if (err) { setError(err.message); setSaving(false); return; }

      await recordActivity({
        action: `Updated lab order for ${editTarget.patients?.name ?? "patient"}: ${editTarget.test_name} → ${form.status}.`,
        actionType: "update",
        tableName: "lab_orders",
        patientId: Number(form.patient_id),
        details: form.result || form.status,
      });
    } else {
      const { error: err } = await supabase.from("lab_orders").insert([{
        patient_id: Number(form.patient_id),
        doctor_id: Number(form.doctor_id),
        test_name: form.test_name,
        loinc_code: form.loinc_code,
        status: form.status,
        result: form.result || null,
      }]);
      if (err) { setError(err.message); setSaving(false); return; }

      const patient = patients.find((p) => String(p.id) === form.patient_id);
      await recordActivity({
        action: `Created lab order for ${patient?.name ?? "patient"}: ${form.test_name}.`,
        actionType: "create",
        tableName: "lab_orders",
        patientId: Number(form.patient_id),
        details: form.result || form.status,
      });
    }

    setSaving(false); setShowModal(false);
    setForm(EMPTY_FORM);
    load();
  };

  const filtered = statusFilter === "All" ? orders : orders.filter((o) => o.status === statusFilter);
  const canEdit = profile && EDIT_ROLES.includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><FlaskConical size={20} className="text-med-accent" /> Laboratory</h1>
          <p className="text-sm text-slate-400 mt-0.5">{orders.length} total orders</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-accent hover:opacity-90 text-white transition-all">
          <Plus size={16} /> New Lab Order
        </button>
      </div>

      {/* filter pills */}
      <div className="flex flex-wrap gap-2">
        {["All", "Pending", "Processing", "Completed", "Cancelled"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === s ? "bg-med-accent text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No lab orders found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {["Test", "LOINC", "Patient", "Doctor", "Status", "Result", "Date", ...(canEdit ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5 text-slate-100 font-medium">{o.test_name}</td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{o.loinc_code}</td>
                    <td className="px-5 py-3.5">
                      <p className="text-slate-200">{o.patients?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{o.patients?.personal_id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{o.doctors?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] ?? "bg-slate-700 text-slate-300"}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate">{o.result ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleDateString()}</td>
                    {canEdit && (
                      <td className="px-5 py-3.5">
                        <button onClick={() => openEdit(o)} className="flex items-center gap-1 text-xs text-med-teal hover:underline">
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
              <h2 className="text-base font-semibold text-white">{editTarget ? `Edit Order — ${editTarget.test_name}` : "New Lab Order"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

              {!editTarget && (
                <>
                  {[
                    { label: "Patient *", key: "patient_id", options: patients.map((p) => ({ value: p.id, label: `${p.name} — ${p.personal_id}` })) },
                    { label: "Doctor *", key: "doctor_id", options: doctors.map((d) => ({ value: d.id, label: d.name })) },
                  ].map((f) => (
                    <div key={f.key}>
                      <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                      <div className="relative">
                        <select value={(form as Record<string, string>)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                          <option value="">Select…</option>
                          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                      </div>
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Test Name *</label>
                    <div className="relative">
                      <select value={form.test_name} onChange={(e) => handleTestSelect(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                        <option value="">Select or type…</option>
                        {COMMON_TESTS.map((t) => <option key={t.loinc} value={t.name}>{t.name}</option>)}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">LOINC Code</label>
                <input type="text" value={form.loinc_code} onChange={(e) => setForm({ ...form, loinc_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 font-mono outline-none focus:border-med-teal transition-colors" />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Status</label>
                <div className="relative">
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    {["Pending", "Processing", "Completed", "Cancelled"].map((s) => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Result {editTarget ? "" : "(if available)"}</label>
                <textarea value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} rows={3}
                  placeholder="Leave blank if pending…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-med-accent hover:opacity-90 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Submitting…" : editTarget ? "Save Changes" : "Submit Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
