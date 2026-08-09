import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedTenantContext } from "@/lib/auth-context";
import { getEnvErrorPayload } from "@/lib/server-env";
import { normalizeRole } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { cleanString, nullableString } from "@/lib/api-utils";

export const runtime = "nodejs";

type CreatePatientBody = {
  name?: string;
  personal_id?: string;
  gender?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  allergies?: string | null;
};


export async function POST(request: NextRequest) {
  let body: CreatePatientBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = cleanString(body.name);
  const personalId = cleanString(body.personal_id, 80).toUpperCase();

  if (!name || !personalId) {
    return NextResponse.json({ error: "Name and Patient ID are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const context = await getAuthenticatedTenantContext(supabase, { requireHospital: true });

  if (context.error) {
    return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  }

  const role = context.role;

  if (!["owner_admin", "hospital_admin", "doctor", "staff"].includes(role)) {
    return NextResponse.json({ error: "Your role cannot create patient records." }, { status: 403 });
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    const envError = getEnvErrorPayload(error);

    if (envError) {
      return NextResponse.json(envError, { status: 500 });
    }

    return NextResponse.json(
      { error: "Patient creation is not configured on the server. Add the Supabase service role key to the deployment environment." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("patients")
    .insert({
      hospital_id: context.hospitalId,
      name,
      personal_id: personalId,
      gender: nullableString(body.gender, 80),
      date_of_birth: nullableString(body.date_of_birth, 40),
      phone: nullableString(body.phone, 80),
      email: nullableString(body.email, 160),
      address: nullableString(body.address, 300),
      allergies: nullableString(body.allergies, 300),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Patient record could not be created." },
      { status: 400 }
    );
  }

  await admin.from("audit_logs").insert({
    username: context.profile?.username,
    hospital_id: context.hospitalId,
    action: `Added patient ${name}.`,
    action_type: "create",
    table_name: "patients",
    record_id: data.id,
    patient_id: data.id,
    details: `Patient ID ${personalId}`,
  });

  return NextResponse.json({ patient: data });
}

export async function PATCH(request: NextRequest) {
  let body: {
    id?: number;
    name?: string;
    personal_id?: string;
    gender?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    allergies?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "Patient ID is required for update." }, { status: 400 });
  }

  const name = cleanString(body.name);
  const personalId = cleanString(body.personal_id, 80).toUpperCase();

  if (!name || !personalId) {
    return NextResponse.json({ error: "Name and Patient ID are required." }, { status: 400 });
  }

  const supabase = await createClient();
  const context = await getAuthenticatedTenantContext(supabase, { requireHospital: true });

  if (context.error) {
    return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  }

  const role = context.role;

  if (!["owner_admin", "hospital_admin", "doctor", "staff"].includes(role)) {
    return NextResponse.json({ error: "Your role cannot edit patient records." }, { status: 403 });
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (error) {
    const envError = getEnvErrorPayload(error);

    if (envError) {
      return NextResponse.json(envError, { status: 500 });
    }

    return NextResponse.json(
      { error: "Patient update is not configured on the server. Add the Supabase service role key to the deployment environment." },
      { status: 500 }
    );
  }

  const { data, error } = await admin
    .from("patients")
    .update({
      name,
      personal_id: personalId,
      gender: nullableString(body.gender, 80),
      date_of_birth: nullableString(body.date_of_birth, 40),
      phone: nullableString(body.phone, 80),
      email: nullableString(body.email, 160),
      address: nullableString(body.address, 300),
      allergies: nullableString(body.allergies, 300),
    })
    .eq("id", id)
    .eq("hospital_id", context.hospitalId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Patient record could not be updated." },
      { status: 400 }
    );
  }

  await admin.from("audit_logs").insert({
    username: context.profile?.username,
    hospital_id: context.hospitalId,
    action: `Updated patient ${name}.`,
    action_type: "update",
    table_name: "patients",
    record_id: data.id,
    patient_id: data.id,
    details: `Patient ID ${personalId}`,
  });

  return NextResponse.json({ patient: data });
}
