"use client";

import { useEffect, useState, useCallback } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { Scan, Plus, X, Loader2, AlertCircle, ChevronDown } from "lucide-react";

type RadImage = {
  id: number;
  image_type: string;
  body_part: string;
  file_path: string;
  ai_prediction: string | null;
  doctor_notes: string | null;
  created_at: string;
  doctors: { name: string } | null;
  patients: { name: string; personal_id: string } | null;
};

type Doctor = { id: number; name: string };
type Patient = { id: number; name: string; personal_id: string };

const IMAGE_TYPES = ["X-Ray", "CT Scan", "MRI", "Ultrasound", "PET Scan", "Mammogram", "Fluoroscopy", "Echocardiogram"];
const BODY_PARTS = ["Chest", "Abdomen", "Head", "Brain", "Spine", "Pelvis", "Left Knee", "Right Knee", "Left Shoulder", "Right Shoulder", "Full Body"];

export default function RadiologyPage() {
  const supabase = createClient();
  const [images, setImages] = useState<RadImage[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patient_id: "", doctor_id: "", image_type: "X-Ray", body_part: "Chest", file_path: "", ai_prediction: "", doctor_notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("radiology_images")
      .select("id, image_type, body_part, file_path, ai_prediction, doctor_notes, created_at, doctors(name), patients(name, personal_id)")
      .order("created_at", { ascending: false }).limit(100);
    setImages((data ?? []) as unknown as RadImage[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    supabase.from("doctors").select("id, name").then(({ data }) => setDoctors(data ?? []));
    supabase.from("patients").select("id, name, personal_id").then(({ data }) => setPatients(data ?? []));
  }, [load]);

  const handleSave = async () => {
    if (!form.patient_id || !form.doctor_id || !form.file_path) { setError("Patient, doctor, and file reference are required."); return; }
    setSaving(true); setError("");
    const { error: err } = await supabase.from("radiology_images").insert([{
      patient_id: Number(form.patient_id),
      doctor_id: Number(form.doctor_id),
      image_type: form.image_type,
      body_part: form.body_part,
      file_path: form.file_path,
      ai_prediction: form.ai_prediction || null,
      doctor_notes: form.doctor_notes || null,
    }]);
    if (err) { setError(err.message); setSaving(false); return; }

    const patient = patients.find((item) => String(item.id) === form.patient_id);
    await recordActivity({
      action: `Logged ${form.image_type} imaging study for ${patient?.name ?? "patient"}.`,
      actionType: "create",
      tableName: "radiology_images",
      patientId: Number(form.patient_id),
      details: `${form.body_part} - ${form.file_path}`,
    });

    setSaving(false); setShowModal(false);
    setForm({ patient_id: "", doctor_id: "", image_type: "X-Ray", body_part: "Chest", file_path: "", ai_prediction: "", doctor_notes: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Scan size={20} className="text-sky-400" /> Radiology (PACS)</h1>
          <p className="text-sm text-slate-400 mt-0.5">{images.length} imaging records</p>
        </div>
        <button onClick={() => { setShowModal(true); setError(""); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white transition-all">
          <Plus size={16} /> Log Imaging Study
        </button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No imaging records found.</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
            {images.map((img) => (
              <div key={img.id} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400">{img.image_type}</span>
                  <span className="text-xs text-slate-500">{new Date(img.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{img.body_part}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{img.patients?.name} — {img.patients?.personal_id}</p>
                </div>
                {img.ai_prediction && (
                  <div className="bg-med-accent/10 rounded-lg px-3 py-2 border border-med-accent/20">
                    <p className="text-xs font-semibold text-med-accent mb-0.5">AI Prediction</p>
                    <p className="text-xs text-slate-300">{img.ai_prediction}</p>
                  </div>
                )}
                {img.doctor_notes && (
                  <p className="text-xs text-slate-400 border-t border-white/5 pt-2">{img.doctor_notes}</p>
                )}
                <p className="text-xs text-slate-600 font-mono truncate">{img.file_path}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="glass-panel rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">Log Imaging Study</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Image Type</label>
                  <div className="relative">
                    <select value={form.image_type} onChange={(e) => setForm({ ...form, image_type: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                      {IMAGE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Body Part</label>
                  <div className="relative">
                    <select value={form.body_part} onChange={(e) => setForm({ ...form, body_part: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                      {BODY_PARTS.map((b) => <option key={b}>{b}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">File Path / Reference *</label>
                <input type="text" value={form.file_path} onChange={(e) => setForm({ ...form, file_path: e.target.value })}
                  placeholder="e.g. /studies/CT-20250527-001.dcm"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 font-mono placeholder-slate-600 outline-none focus:border-med-teal transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">AI Prediction</label>
                <textarea value={form.ai_prediction} onChange={(e) => setForm({ ...form, ai_prediction: e.target.value })} rows={2}
                  placeholder="Optional — AI findings…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors resize-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Doctor Notes</label>
                <textarea value={form.doctor_notes} onChange={(e) => setForm({ ...form, doctor_notes: e.target.value })} rows={2}
                  placeholder="Optional — clinical observations…"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-600 outline-none focus:border-med-teal transition-colors resize-none" />
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-sky-500 hover:bg-sky-400 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : "Log Study"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
