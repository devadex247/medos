export const ROLES = [
  "owner_admin",
  "hospital_admin",
  "doctor",
  "staff",
  "patient",
] as const;

export type Role = (typeof ROLES)[number];

export type DashboardRouteKey =
  | "overview"
  | "aiChat"
  | "patients"
  | "appointments"
  | "pharmacy"
  | "lab"
  | "radiology"
  | "finance"
  | "staff"
  | "audit"
  | "settings";

export type DashboardRoute = {
  key: DashboardRouteKey;
  label: string;
  href: string;
  description: string;
  roles: readonly Role[];
};

export const ADMIN_ROLES = ["owner_admin", "hospital_admin"] as const;
export const CLINICAL_AI_ROLES = ["owner_admin", "hospital_admin", "doctor"] as const;
export const AI_CHAT_ROLES = ROLES;

export const ROLE_LABELS: Record<Role, string> = {
  owner_admin: "Owner Admin",
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  staff: "Staff",
  patient: "Patient",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  owner_admin: "Full hospital setup, users, audit, billing, and clinical oversight.",
  hospital_admin: "Operational administration across hospital modules and reporting.",
  doctor: "Clinical workspace for patients, diagnostics, appointments, and AI support.",
  staff: "Front-desk and operations workspace for scheduling, stock, lab, and imaging.",
  patient: "Personal care portal for profile, care status, and upcoming follow-up.",
};

export const ROLE_COLORS: Record<Role, string> = {
  owner_admin: "text-med-accent",
  hospital_admin: "text-med-teal",
  doctor: "text-emerald-400",
  staff: "text-amber-400",
  patient: "text-slate-300",
};

export const DASHBOARD_ROUTES: readonly DashboardRoute[] = [
  {
    key: "overview",
    label: "Overview",
    href: "/dashboard",
    description: "Role-aware KPIs, activity, and next actions.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff", "patient"],
  },
  {
    key: "aiChat",
    label: "AI Chat",
    href: "/dashboard/ai-chat",
    description: "Conversational assistant for hospital workflows, documentation, and care support.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff", "patient"],
  },
  {
    key: "patients",
    label: "Patients",
    href: "/dashboard/patients",
    description: "Patient registry, profile drawer, and intake records.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff"],
  },
  {
    key: "appointments",
    label: "Appointments",
    href: "/dashboard/appointments",
    description: "Booking, scheduling, and attendance tracking.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff"],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    href: "/dashboard/pharmacy",
    description: "Inventory, stock thresholds, and restock alerts.",
    roles: ["owner_admin", "hospital_admin", "staff"],
  },
  {
    key: "lab",
    label: "Lab",
    href: "/dashboard/lab",
    description: "LOINC-coded orders, status filters, and results.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff"],
  },
  {
    key: "radiology",
    label: "Radiology",
    href: "/dashboard/radiology",
    description: "Imaging records, PACS links, AI notes, and review comments.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff"],
  },
  {
    key: "finance",
    label: "Finance",
    href: "/dashboard/finance",
    description: "Bills, collection rate, revenue, and outstanding balances.",
    roles: ["owner_admin", "hospital_admin"],
  },
  {
    key: "staff",
    label: "Staff",
    href: "/dashboard/staff",
    description: "Shift scheduling, departments, and performance records.",
    roles: ["owner_admin", "hospital_admin"],
  },
  {
    key: "audit",
    label: "Audit Logs",
    href: "/dashboard/audit",
    description: "Immutable compliance records and write activity.",
    roles: ["owner_admin", "hospital_admin"],
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    description: "Profile, password, and session controls.",
    roles: ["owner_admin", "hospital_admin", "doctor", "staff", "patient"],
  },
];

export const DEFAULT_DASHBOARD_PATH: Record<Role, string> = {
  owner_admin: "/dashboard",
  hospital_admin: "/dashboard",
  doctor: "/dashboard",
  staff: "/dashboard",
  patient: "/dashboard",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}

export function normalizeRole(value: unknown, fallback: Role = "patient"): Role {
  return isRole(value) ? value : fallback;
}

export function getRoleLabel(value: unknown) {
  return ROLE_LABELS[normalizeRole(value)];
}

export function getAllowedDashboardRoutes(value: unknown) {
  const role = normalizeRole(value);
  return DASHBOARD_ROUTES.filter((route) => route.roles.includes(role));
}

export function getDashboardRouteForPath(pathname: string) {
  const normalizedPath = normalizePath(pathname);

  return DASHBOARD_ROUTES.find((route) => {
    const routePath = normalizePath(route.href);

    if (routePath === "/dashboard") {
      return normalizedPath === routePath;
    }

    return normalizedPath === routePath || normalizedPath.startsWith(`${routePath}/`);
  });
}

export function canAccessDashboardPath(value: unknown, pathname: string) {
  if (!pathname.startsWith("/dashboard")) {
    return true;
  }

  const role = normalizeRole(value);
  const route = getDashboardRouteForPath(pathname);

  if (!route) {
    return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
  }

  return route.roles.includes(role);
}

export function getDashboardRedirectPath(value: unknown, requestedPath?: string | null) {
  const role = normalizeRole(value);

  if (requestedPath?.startsWith("/dashboard") && canAccessDashboardPath(role, requestedPath)) {
    return requestedPath;
  }

  return DEFAULT_DASHBOARD_PATH[role];
}

export function canUseAITriage(value: unknown) {
  const role = normalizeRole(value);
  return CLINICAL_AI_ROLES.includes(role as (typeof CLINICAL_AI_ROLES)[number]);
}

export function canUseAIChat(value: unknown) {
  const role = normalizeRole(value);
  return AI_CHAT_ROLES.includes(role);
}

function normalizePath(pathname: string) {
  const [pathOnly] = pathname.split(/[?#]/);

  if (pathOnly === "/") {
    return pathOnly;
  }

  return pathOnly.replace(/\/+$/, "") || "/";
}
