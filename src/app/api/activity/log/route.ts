import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedTenantContext } from "@/lib/auth-context";
import { normalizeRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ActivityLogBody = {
  action?: string;
  actionType?: string;
  tableName?: string;
  recordId?: number | string | null;
  patientId?: number | string | null;
  details?: string | null;
};

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function isTableName(value: string) {
  return /^[a-z0-9_]+$/i.test(value);
}

export async function POST(request: NextRequest) {
  let body: ActivityLogBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const action = cleanString(body.action, 180);
  const actionType = cleanString(body.actionType, 40) || "activity";
  const tableName = cleanString(body.tableName, 80);
  const details = cleanString(body.details, 500) || null;
  const recordId = cleanOptionalNumber(body.recordId);
  const patientId = cleanOptionalNumber(body.patientId);

  if (!action || !tableName || !isTableName(tableName)) {
    return NextResponse.json(
      { error: "Activity action and table name are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const context = await getAuthenticatedTenantContext(supabase, { requireHospital: true });

  if (context.error) {
    return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  }

  const role = normalizeRole(context.profile?.role);
  const { error } = await supabase
    .from("audit_logs")
    .insert({
      username: context.profile?.username,
      hospital_id: context.hospitalId,
      action,
      action_type: actionType || role,
      table_name: tableName,
      record_id: recordId,
      patient_id: patientId,
      details,
    });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Activity could not be recorded." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
