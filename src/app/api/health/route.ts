import { NextResponse } from "next/server";

import { getEnvStatus } from "@/lib/server-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnvStatus();

  return NextResponse.json(
    {
      ok: env.ok,
      service: "medos",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      deployment: {
        vercel: Boolean(process.env.VERCEL),
        region: process.env.VERCEL_REGION ?? null,
        url: process.env.VERCEL_URL ?? null,
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      },
      env,
      checkedAt: new Date().toISOString(),
    },
    {
      status: env.ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
