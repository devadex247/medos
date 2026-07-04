import { normalizeRole, type Role } from "@/lib/rbac";

type SupabaseClientLike = {
  auth: {
    getUser: () => Promise<{ data: { user: any | null } }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        maybeSingle: () => Promise<{ data: any; error: any }>;
      };
    };
  };
};

type AuthContext = {
  user: any | null;
  profile: {
    id: string;
    username: string;
    role: string | null;
    account_status: string | null;
    hospital_id: number | null;
  } | null;
  role: Role;
  hospitalId: number | null;
  membership: {
    hospital_id: number;
    role: string | null;
    status: string | null;
  } | null;
  error: { status: number; message: string } | null;
};

export async function getAuthenticatedTenantContext(
  supabase: SupabaseClientLike,
  options: { requireHospital?: boolean } = {}
): Promise<AuthContext> {
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return {
      user: null,
      profile: null,
      role: "patient",
      hospitalId: null,
      membership: null,
      error: { status: 401, message: "Authentication is required." },
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, username, role, account_status, hospital_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      user,
      profile: null,
      role: "patient",
      hospitalId: null,
      membership: null,
      error: { status: 404, message: "User profile could not be found." },
    };
  }

  if (profile.account_status !== "active") {
    return {
      user,
      profile,
      role: normalizeRole(profile.role),
      hospitalId: profile.hospital_id,
      membership: null,
      error: { status: 403, message: "This account is inactive." },
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("hospital_memberships")
    .select("hospital_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const resolvedHospitalId = profile.hospital_id ?? membership?.hospital_id ?? null;

  if (options.requireHospital && !resolvedHospitalId) {
    return {
      user,
      profile,
      role: normalizeRole(profile.role),
      hospitalId: null,
      membership: membership ?? null,
      error: { status: 400, message: "Tenant context could not be resolved." },
    };
  }

  if (membershipError && resolvedHospitalId) {
    // Membership lookup failed, but a hospital context already exists from the profile.
    // Continue with the profile-scoped context to preserve functionality while still enforcing tenant isolation.
  }

  return {
    user,
    profile,
    role: normalizeRole(profile.role),
    hospitalId: resolvedHospitalId,
    membership: membership ?? null,
    error: null,
  };
}
