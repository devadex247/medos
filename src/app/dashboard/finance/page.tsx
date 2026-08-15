"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

type Bill = {
  id: number;
  amount: number;
  status: string;
  billing_date: string;
  patients: { name: string; personal_id: string } | null;
  appointments: { date: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  Paid: "bg-emerald-500/15 text-emerald-400",
  Unpaid: "bg-amber-500/15 text-amber-400",
  Overdue: "bg-red-500/15 text-red-400",
  Waived: "bg-slate-700 text-slate-300",
};

function KPICard({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: React.ElementType; color: string; sub: string }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color.replace("text-", "bg-").replace("-400", "-400/10").replace("-500", "-500/10")}`}>
          <Icon size={18} className={color} />
        </div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

export default function FinancePage() {
  const supabase = createClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bills")
      .select("id, amount, status, billing_date, patients(name, personal_id), appointments(date)")
      .order("billing_date", { ascending: false })
      .limit(200);
    setBills((data ?? []) as unknown as Bill[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = bills.filter((b) => b.status === "Paid").reduce((s, b) => s + b.amount, 0);
  const outstanding = bills.filter((b) => b.status === "Unpaid" || b.status === "Overdue").reduce((s, b) => s + b.amount, 0);
  const totalBills = bills.length;
  const paidCount = bills.filter((b) => b.status === "Paid").length;

  const filtered = filter === "All" ? bills : bills.filter((b) => b.status === filter);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-400" /> Finance & Billing
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">Revenue tracking and bill management</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Total Revenue" value={fmt(totalRevenue)} icon={TrendingUp} color="text-emerald-400" sub="From paid bills" />
        <KPICard label="Outstanding" value={fmt(outstanding)} icon={TrendingDown} color="text-amber-400" sub="Unpaid + overdue" />
        <KPICard label="Total Bills" value={String(totalBills)} icon={DollarSign} color="text-med-teal" sub="All time" />
        <KPICard label="Collection Rate" value={`${totalBills ? Math.round((paidCount / totalBills) * 100) : 0}%`} icon={CheckCircle2} color="text-med-accent" sub={`${paidCount} of ${totalBills} paid`} />
      </div>

      {/* filters */}
      <div className="flex flex-wrap gap-2">
        {["All", "Paid", "Unpaid", "Overdue", "Waived"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${filter === s ? "bg-med-teal text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 gap-2 text-slate-500"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500"><AlertCircle size={28} /><p className="text-sm">No bills found.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5">
                {["Patient", "Amount", "Status", "Appointment Date", "Billed On"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.025] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-slate-100 font-medium">{b.patients?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500 font-mono">{b.patients?.personal_id}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-100 font-semibold tabular-nums">{fmt(b.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[b.status] ?? "bg-slate-700 text-slate-300"}`}>
                        {b.status === "Paid" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {b.appointments?.date ? new Date(b.appointments.date).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{new Date(b.billing_date).toLocaleDateString()}</td>
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
