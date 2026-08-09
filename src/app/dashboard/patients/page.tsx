"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  Plus,
  X,
  Loader2,
  ChevronDown,
  AlertCircle,
  UserCircle2,
  Phone,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";

// New imports for editing
import PatientEditForm from "@/components/PatientEditForm";

// Role-based edit visibility
const EDIT_ROLES = ["owner_admin", "hospital_admin", "doctor", "staff"];

type Patient = {
  id: number;
  name: string;
  personal_id: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  created_at: string;
};

const EMPTY_FORM: Omit<Patient, "id" | "created_at"> = {
  name: "",
  personal_id: "",
  gender: "",
  date_of_birth: "",
  phone: "",
  email: "",
  address: "",
  allergies: "",
};

function age(dob: string | null): string {
  if (!dob) return "—";
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)) + " yrs";
}

async function readPatientCreateResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as { patient?: Patient; error?: string };
  }

  const text = await response.text();
  const message = response.status === 404 || text.trim().startsWith("<!DOCTYPE html>")
    ? "Patient creation endpoint was not found in the running app. The deployed build may still be updating."
    : "Patient creation endpoint did not return a readable response.";

  return { error: message };
}

export default function PatientsPage() {
  const supabase = createClient();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Load profile for role checks
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("users").select("username, role, full_name").eq("id", user.id).single();
      setProfile(data);
    };
    loadProfile();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (search.trim()) {
      q.ilike("name", `%${search}%`);
    }
    const { data } = await q.limit(100);
    setPatients(data ?? []);
    setLoading(false);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.name || !form.personal_id) {
      setError("Name and Patient ID are required.");
      return;
    }
    setSaving(true);
    setError("");
    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await readPatientCreateResponse(response);

    if (!response.ok || !result.patient) {
      setError(result.error || "Patient record could not be created.");
      setSaving(false);
      return;
    }

    window.dispatchEvent(new CustomEvent("medos:activity-created"));
    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    load();
  };

  const openEdit = (patient: Patient) => {
    setEditPatient(patient);
    setEditOpen(true);
  };

  const refreshAfterEdit = () => {
    load();
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users size={20} className="text-emerald-400" /> Patients
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">{patients.length} total registered</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setError(""); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white transition-all duration-200"
        >
          <Plus size={16} /> Add Patient
        </button>
      </div>

      {/* search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-500 focus:border-med-teal focus:ring-0 outline-none transition-colors"
        />
      </div>

      {/* table */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500">
            <Loader2 size={18} className="animate-spin" /> Loading…
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <AlertCircle size={28} />
            <p className="text-sm">No patients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Name", "Patient ID", "Gender", "Age", "Phone", "Added", "Actions"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-slate-100 font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{p.personal_id}</td>
                    <td className="px-5 py-3.5 text-slate-400">{p.gender ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400">{age(p.date_of_birth)}</td>
                    <td className="px-5 py-3.5 text-slate-400">{p.phone ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      {profile && EDIT_ROLES.includes(profile.role) && (
                        <button
                          onClick={() => openEdit(p)}
                          className="text-med-teal hover:underline text-sm"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">Add New Patient</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
              {[{ label: "Full Name *", key: "name", type: "text" },
                { label: "Patient ID *", key: "personal_id", type: "text" },
                { label: "Date of Birth", key: "date_of_birth", type: "date" },
                { label: "Phone", key: "phone", type: "tel" },
                { label: "Email", key: "email", type: "email" },
                { label: "Address", key: "address", type: "text" },
                { label: "Known Allergies", key: "allergies", type: "text" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input
                    type={f.type as any}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 focus:border-med-teal outline-none transition-colors"
                  />
                </div>
              ))}
              {/* gender select */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Gender</label>
                <div className="relative">
                  <select
                    value={form.gender ?? ""}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none appearance-none focus:border-med-teal transition-colors"
                  >
                    <option value="">Select…</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : "Add Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {editPatient && (
        <PatientEditForm patient={editPatient} isOpen={editOpen} onClose={() => setEditOpen(false)} onUpdated={refreshAfterEdit} />
      )}
    </div>
  );
}
