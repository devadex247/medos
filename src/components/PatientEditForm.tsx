// src/components/PatientEditForm.tsx
"use client";

import { useState, useEffect } from "react";
import EditModal from "@/components/EditModal";
interface Patient {
  id: number;
  name: string;
  personal_id: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  allergies: string | null;
  created_at?: string;
}

interface Props {
  patient: Patient;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void; // callback to refresh list
}

export default function PatientEditForm({ patient, isOpen, onClose, onUpdated }: Props) {
  const [form, setForm] = useState<Omit<Patient, 'id'>>({
    name: "",
    personal_id: "",
    gender: "",
    date_of_birth: "",
    phone: "",
    email: "",
    address: "",
    allergies: "",
  });
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patient) {
      const { id, ...rest } = patient;
      setForm({ ...rest } as any);
    }
  }, [patient]);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name || !form.personal_id) {
      setError("Name and Patient ID are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/patients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: patient.id, ...form }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update patient.");
      }
      onUpdated();
      onClose();
    } catch (e: any) {
      setError(e.message ?? "Failed to update patient.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditModal isOpen={isOpen} title="Edit Patient" onClose={onClose} isSaving={saving}>
      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-2">{error}</p>}
      <div className="grid grid-cols-1 gap-4">
        {/* Reuse same fields as add modal */}
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
              value={(form as any)[f.key] ?? ""}
              onChange={(e) => handleChange(f.key as any, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 focus:border-med-teal outline-none transition-colors"
            />
          </div>
        ))}
        {/* Gender select */}
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Gender</label>
          <div className="relative">
            <select
              value={form.gender ?? ""}
              onChange={(e) => handleChange("gender", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none appearance-none focus:border-med-teal transition-colors"
            >
              <option value="">Select…</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-5">
        <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white transition-all disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </EditModal>
  );
}
