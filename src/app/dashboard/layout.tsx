// src/app/dashboard/layout.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { fetchRecentActivity, formatActivityTime, type RecentActivity } from "@/lib/activity";
import { createClient } from "@/lib/supabase/client";
import AutoLogoutHandler from "@/components/AutoLogoutHandler";
import {
  DASHBOARD_ROUTES,
  ROLE_COLORS,
  getAllowedDashboardRoutes,
  getDashboardRouteForPath,
  getRoleLabel,
  normalizeRole,
  type DashboardRouteKey,
  type Role,
} from "@/lib/rbac";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Pill,
  FlaskConical,
  Scan,
  DollarSign,
  UserCog,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Bell,
  Settings,
  Clock,
  UserCircle,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";

const NAV_ICONS: Record<DashboardRouteKey, React.ElementType> = {
  overview: LayoutDashboard,
  triage: Scan,
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

const ACTIVITY_HREFS: Record<string, string> = {
  appointments: "/dashboard/appointments",
  patients: "/dashboard/patients",
  inventories: "/dashboard/pharmacy",
  lab_orders: "/dashboard/lab",
  radiology_images: "/dashboard/radiology",
  staff_schedules: "/dashboard/staff",
  patient_vitals: "/dashboard/triage",
  users: "/dashboard/settings",
  hospitals: "/dashboard/settings",
  hospital_memberships: "/dashboard/staff",
};

function getActivityHref(tableName: string) {
  return ACTIVITY_HREFS[tableName] ?? "/dashboard";
}

type Profile = {
  username: string;
  role: Role;
  full_name?: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const loadRecentActivity = useCallback(async () => {
    setActivityLoading(true);
    const items = await fetchRecentActivity(5);
    setActivity(items);
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("username, role, full_name")
        .eq("id", user.id)
        .single();
      if (!data) {
        await supabase.auth.signOut();
        router.push("/login?reason=profile");
        return;
      }
      setProfile({
        username: data.username,
        full_name: data.full_name ?? undefined,
        role: normalizeRole(data.role),
      });
      void loadRecentActivity();
      setLoading(false);
    };
    loadProfile();
  }, [loadRecentActivity, router, supabase]);

  useEffect(() => {
    const handleActivityCreated = () => {
      void loadRecentActivity();
    };
    window.addEventListener("medos:activity-created", handleActivityCreated);
    return () => window.removeEventListener("medos:activity-created", handleActivityCreated);
  }, [loadRecentActivity]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const role = profile?.role ?? "patient";
  const allowedNav = getAllowedDashboardRoutes(role);
  const activeRoute = getDashboardRouteForPath(pathname) ?? DASHBOARD_ROUTES[0];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-med-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-med-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading MedOS AI…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AutoLogoutHandler />
      <div className="flex h-screen overflow-hidden bg-med-bg">
        {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
        <aside
          className={`
            flex flex-col transition-width duration-300 ease-in-out overflow-hidden border-r border-med-border bg-med-header
            ${sidebarOpen ? "w-64" : "w-16"}
          `}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-4 border-b border-med-border flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-med-teal to-med-accent flex items-center justify-center flex-shrink-0">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-med-primary text-sm tracking-wide whitespace-nowrap">
                MedOS AI
              </span>
            )}
          </div>

          {/* Nav links – refined spacing and hover */}
          <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-1 px-2">
              {allowedNav.map((item) => {
                const Icon = NAV_ICONS[item.key];
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      title={item.label}
                      aria-current={isActive ? "page" : undefined}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 group
                        ${isActive
                          ? "bg-med-teal/10 text-med-teal shadow-sm"
                          : "text-med-muted hover:text-med-primary hover:bg-slate-100 dark:hover:bg-white/5"}
                      `}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-0 h-full w-1 bg-med-teal rounded-r-md" />
                      )}
                      <Icon
                        size={18}
                        className={`flex-shrink-0 transition-transform duration-200 ${isActive ? "text-med-teal" : "group-hover:scale-110"}`}
                      />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                      {isActive && sidebarOpen && <ChevronRight size={14} className="ml-auto text-med-teal/60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User block */}
          <div className="border-t border-med-border p-3 flex-shrink-0">
            {sidebarOpen ? (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-med-teal/30 to-med-accent/30 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {profile?.full_name?.[0]?.toUpperCase() ?? profile?.username?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-med-primary truncate">
                    {profile?.full_name ?? profile?.username}
                  </p>
                  <p className={`text-xs truncate ${ROLE_COLORS[role] ?? "text-med-muted"}`}>
                    {getRoleLabel(role)}
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="w-full flex justify-center p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-16 flex items-center gap-4 px-6 border-b border-med-border bg-med-header/80 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-med-muted hover:text-med-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {/* Breadcrumbs */}
            <Breadcrumbs />
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle />
              {/* Notification bell */}
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((open) => !open);
                    setUserMenuOpen(false);
                    void loadRecentActivity();
                  }}
                  aria-label="Open notifications"
                  aria-expanded={notificationsOpen}
                  className="relative p-2 rounded-lg text-med-muted hover:text-med-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200"
                >
                  <Bell size={18} />
                  {activity.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-medosBlue text-[10px] leading-4 text-white font-bold text-center">
                      {activity.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-med-border bg-med-card shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-med-border flex items-center justify-between">
                      <p className="text-sm font-semibold text-med-primary">Recent activity</p>
                      <button
                        type="button"
                        onClick={() => void loadRecentActivity()}
                        className="text-xs text-med-teal hover:text-sky-300 transition-colors"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {activityLoading ? (
                        <div className="px-4 py-6 text-sm text-med-muted">Loading activity...</div>
                      ) : activity.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-med-muted">No recent activity yet.</div>
                      ) : (
                        activity.map((item) => (
                          <Link
                            key={item.id}
                            href={getActivityHref(item.table_name)}
                            onClick={() => setNotificationsOpen(false)}
                            className="block px-4 py-3 border-b border-med-border hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors"
                          >
                            <p className="text-sm text-med-primary line-clamp-2">{item.action}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-med-muted">
                              <Clock size={12} />
                              {formatActivityTime(item.created_at)} · {item.table_name}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                    <Link
                      href={role === "owner_admin" || role === "hospital_admin" ? "/dashboard/audit" : "/dashboard"}
                      onClick={() => setNotificationsOpen(false)}
                      className="block px-4 py-3 text-xs font-semibold text-medosBlue hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      {role === "owner_admin" || role === "hospital_admin" ? "View audit log" : "View dashboard"}
                    </Link>
                  </div>
                )}
              </div>
              {/* Profile dropdown */}
              <div ref={userMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((open) => !open);
                    setNotificationsOpen(false);
                  }}
                  aria-label="Open user menu"
                  aria-expanded={userMenuOpen}
                  className="h-9 flex items-center gap-2 rounded-lg px-1.5 pr-2 text-med-muted hover:text-med-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                >
                  <span className="w-8 h-8 rounded-full bg-gradient-to-br from-med-teal/40 to-med-accent/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {profile?.full_name?.[0]?.toUpperCase() ?? profile?.username?.[0]?.toUpperCase() ?? "?"}
                  </span>
                  <span className="hidden sm:block max-w-32 truncate text-xs font-semibold">
                    {profile?.full_name ?? profile?.username}
                  </span>
                  <ChevronDown size={14} className="hidden sm:block text-med-muted/60" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-med-border bg-med-card shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-med-border flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-med-teal/40 to-med-accent/40 flex items-center justify-center text-xs font-bold text-white">
                        {profile?.full_name?.[0]?.toUpperCase() ?? profile?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-med-primary truncate">{profile?.full_name ?? profile?.username}</p>
                        <p className={`text-xs truncate ${ROLE_COLORS[role] ?? "text-med-muted"}`}> {getRoleLabel(role)} </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-med-primary hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <UserCircle size={16} /> Profile settings
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-med-primary hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <LayoutDashboard size={16} /> Dashboard overview
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
