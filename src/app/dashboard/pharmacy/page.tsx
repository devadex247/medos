"use client";

import { useEffect, useState, useCallback } from "react";
import { recordActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import { Pill, Plus, X, Loader2, AlertCircle, AlertTriangle, ChevronDown, Pencil } from "lucide-react";

type Item = {
  id: number;
  item_name: string;
  quantity: number;
  unit: string;
  min_threshold: number;
  last_restocked: string;
};

const UNITS = ["tablets", "capsules", "vials", "bottles", "boxes", "units", "litres", "ml"];
const EMPTY_FORM = { item_name: "", quantity: "", unit: "tablets", min_threshold: "10" };

export default function PharmacyPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
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
    const { data } = await supabase.from("inventories").select("*").order("item_name");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(EMPTY_FORM); setError(""); setShowModal(true); };
  const openEdit = (item: Item) => {
    setEditTarget(item);
    setForm({
      item_name: item.item_name,
      quantity: String(item.quantity),
      unit: item.unit,
      min_threshold: String(item.min_threshold),
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.item_name || !form.quantity) {
      setError("Name and quantity are required.");
      return;
    }
    if (saving) return;
    setSaving(true);
    setError("");

    if (editTarget) {
      // DIRECT UPDATE (edit existing item)
      const { error: err } = await supabase.from("inventories").update({
        quantity: Number(form.quantity),
        unit: form.unit,
        min_threshold: Number(form.min_threshold),
        last_restocked: new Date().toISOString(),
      }).eq("id", editTarget.id);

      if (err) { setError(err.message); setSaving(false); return; }

      await recordActivity({
        action: `Updated inventory for ${editTarget.item_name}.`,
        actionType: "update",
        tableName: "inventories",
        details: `Set quantity to ${form.quantity} ${form.unit}, min threshold ${form.min_threshold}`,
      });
    } else {
      // Resolve tenant hospital context for new item
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("users").select("hospital_id").eq("id", user?.id ?? "").single();
      const activeHospitalId = profile?.hospital_id;

      if (!activeHospitalId) { setError("Unable to resolve hospital tenant context."); setSaving(false); return; }

      const { error: err } = await supabase.rpc("restock_inventory_item", {
        p_item_name: form.item_name,
        p_quantity: Number(form.quantity),
        p_unit: form.unit,
        p_min_threshold: Number(form.min_threshold),
        p_hospital_id: activeHospitalId,
      });

      if (err) { setError(err.message); setSaving(false); return; }

      await recordActivity({
        action: `Restocked inventory for ${form.item_name}.`,
        actionType: "upsert",
        tableName: "inventories",
        details: `Added ${form.quantity} ${form.unit}, min threshold set to ${form.min_threshold}`,
      });
    }

    setSaving(false);
    setShowModal(false);
    setForm(EMPTY_FORM);
    load();
  };

  const low = items.filter((i) => i.quantity < i.min_threshold);
  const canEdit = profile && EDIT_ROLES.includes(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2"><Pill size={20} className="text-amber-400" /> Pharmacy & Inventory</h1>
          <p className="text-sm text-slate-400 mt-0.5">{items.length} items · {low.length} low stock</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all">
          <Plus size={16} /> Add / Restock
        </button>
      </div>

      {low.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Low Stock Alert</p>
            <p className="text-xs mt-0.5">{low.map((i) => i.item_name).join(", ")} {low.length === 1 ? "is" : "are"} below threshold.</p>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No inventory items found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {["Item Name", "Quantity", "Unit", "Min Threshold", "Last Restocked", "Status", ...(canEdit ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => {
                  const isLow = item.quantity < item.min_threshold;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.025] transition-colors">
                      <td className="px-5 py-3.5 text-slate-100 font-medium">{item.item_name}</td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span className={`text-lg font-bold ${isLow ? "text-amber-400" : "text-emerald-400"}`}>{item.quantity}</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{item.unit}</td>
                      <td className="px-5 py-3.5 text-slate-400">{item.min_threshold}</td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(item.last_restocked).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isLow ? "bg-amber-500/15 text-amber-400" : "bg-emerald-500/15 text-emerald-400"}`}>
                          {isLow ? <AlertTriangle size={11} /> : <Pill size={11} />}
                          {isLow ? "Low Stock" : "In Stock"}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3.5">
                          <button onClick={() => openEdit(item)} className="flex items-center gap-1 text-xs text-med-teal hover:underline">
                            <Pencil size={12} /> Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
          <div className="glass-panel rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="text-base font-semibold text-white">{editTarget ? `Edit — ${editTarget.item_name}` : "Add / Restock Item"}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}

              {!editTarget && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Item Name *</label>
                  <input type="text" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
                </div>
              )}

              {[
                { label: "Quantity *", key: "quantity", type: "number" },
                { label: "Min Threshold", key: "min_threshold", type: "number" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs text-slate-400 mb-1.5">{f.label}</label>
                  <input type={f.type} value={(form as Record<string, string>)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 outline-none focus:border-med-teal transition-colors" />
                </div>
              ))}

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Unit</label>
                <div className="relative">
                  <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-amber-500 hover:bg-amber-400 text-white transition-all disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? "Saving…" : editTarget ? "Save Changes" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
