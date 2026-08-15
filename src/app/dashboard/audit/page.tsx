"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Loader2, AlertCircle, Clock, Search, Filter } from "lucide-react";

type AuditLog = {
  id: number;
  username: string;
  action: string;
  action_type: string | null;
  table_name: string;
  record_id: number | null;
  patient_id: number | null;
  details: string | null;
  created_at: string;
};

const TABLE_COLORS: Record<string, string> = {
  patients: "bg-emerald-500/15 text-emerald-400",
  appointments: "bg-med-teal/15 text-med-teal",
  lab_orders: "bg-med-accent/15 text-med-accent",
  prescriptions: "bg-amber-500/15 text-amber-400",
  patient_vitals: "bg-rose-500/15 text-rose-400",
  medical_records: "bg-sky-500/15 text-sky-400",
  inventories: "bg-orange-500/15 text-orange-400",
  bills: "bg-purple-500/15 text-purple-400",
};

const ACTION_TYPES: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-400",
  UPDATE: "bg-amber-500/15 text-amber-400",
  DELETE: "bg-red-500/15 text-red-400",
  SELECT: "bg-slate-700 text-slate-300",
  LOGIN: "bg-med-teal/15 text-med-teal",
  LOGOUT: "bg-slate-700 text-slate-300",
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export default function AuditPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    const q = supabase
      .from("audit_logs")
      .select("id, username, action, action_type, table_name, record_id, patient_id, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const { data } = await q;
    setLogs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const tables = ["All", ...Array.from(new Set(logs.map((l) => l.table_name)))];

  const filtered = logs.filter((l) => {
    const matchTable = tableFilter === "All" || l.table_name === tableFilter;
    const matchSearch = !search.trim() ||
      l.username.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.table_name.toLowerCase().includes(search.toLowerCase());
    return matchTable && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ShieldCheck size={20} className="text-med-accent" /> Audit Logs
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">{logs.length} compliance records — immutable trail</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" placeholder="Search user, action, table…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 placeholder-slate-500 outline-none focus:border-med-teal transition-colors" />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 rounded-xl text-sm bg-slate-900 border border-white/8 text-slate-200 appearance-none outline-none focus:border-med-teal transition-colors">
            {tables.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No audit logs found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {["User", "Action", "Type", "Table", "Record ID", "Time"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-med-accent/20 flex items-center justify-center text-xs font-bold text-med-accent">{l.username[0]?.toUpperCase()}</div>
                        <span className="text-slate-200 font-medium text-xs">{l.username}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate text-xs">{l.action}</td>
                    <td className="px-5 py-3.5">
                      {l.action_type && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${ACTION_TYPES[l.action_type] ?? "bg-slate-700 text-slate-300"}`}>
                          {l.action_type}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TABLE_COLORS[l.table_name] ?? "bg-slate-700 text-slate-300"}`}>
                        {l.table_name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{l.record_id ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap">
                        <Clock size={11} /> {timeAgo(l.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
