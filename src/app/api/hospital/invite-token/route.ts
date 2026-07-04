import { NextResponse } from "next/server";

import { getAuthenticatedTenantContext } from "@/lib/auth-context";
import { normalizeRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type HospitalRecord = {
  name?: string;
};

export async function GET() {
  const supabase = await createClient();
  const context = await getAuthenticatedTenantContext(supabase, { requireHospital: true });

  if (context.error) {
    return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  }

  const role = normalizeRole(context.profile?.role);

  if (role !== "owner_admin" && role !== "hospital_admin") {
    return NextResponse.json(
      { error: "Only hospital administrators can view invite tokens." },
      { status: 403 }
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("hospital_memberships")
    .select("hospital_id, hospitals(name)")
    .eq("user_id", context.user?.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { error: "No active hospital workspace membership was found." },
      { status: 404 }
    );
  }

  const { data: token, error: tokenError } = await supabase
    .from("hospital_access_tokens")
    .select("access_token, created_at")
    .eq("hospital_id", membership.hospital_id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (tokenError || !token) {
    return NextResponse.json(
      { error: "No active invite token was found for this hospital." },
      { status: 404 }
    );
  }

  const hospital = Array.isArray(membership.hospitals)
    ? membership.hospitals[0]
    : (membership.hospitals as HospitalRecord | null);

  return NextResponse.json({
    token: token.access_token,
    createdAt: token.created_at,
    hospitalId: membership.hospital_id,
    hospitalName: hospital?.name ?? "Hospital Workspace",
    signupUrl: "/signup/join",
  });
}
