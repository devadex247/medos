import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";

import { canUseAITriage, normalizeRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { assessTriage, isValidTriageVitals, type TriageAssessment, type TriageVitals } from "@/lib/triage";

export const runtime = "nodejs";

type TriageBody = {
  patientId?: number | string;
  heartRate?: number | string;
  spo2?: number | string;
  temperature?: number | string;
};

type Patient = {
  id: number;
  name: string;
  personal_id: string;
};

const OPENAI_MODEL = process.env.OPENAI_TRIAGE_MODEL ?? "gpt-4o";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  // Extract tenant context (hospital_id) from the user metadata to ensure isolation
  const userHospitalId = user.user_metadata?.hospital_id;

  const { data: profile } = await supabase
    .from("users")
    .select("role, account_status, hospital_id")
    .eq("id", user.id)
    .single();

  const activeHospitalId = profile?.hospital_id ?? userHospitalId;

  if (!activeHospitalId) {
    return NextResponse.json({ error: "Tenant context could not be resolved." }, { status: 400 });
  }

  const role = normalizeRole(profile?.role ?? user.user_metadata?.role);

  if (profile?.account_status !== "active") {
    return NextResponse.json({ error: "This account is inactive." }, { status: 403 });
  }

  if (!canUseAITriage(role)) {
    return NextResponse.json({ error: "Your role cannot run AI triage." }, { status: 403 });
  }

  let body: TriageBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patientId = Number(body.patientId);
  const vitals: Partial<TriageVitals> = {
    heartRate: Number(body.heartRate),
    spo2: Number(body.spo2),
    temperature: Number(body.temperature),
  };

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return NextResponse.json({ error: "A valid patient is required." }, { status: 400 });
  }

  if (!isValidTriageVitals(vitals)) {
    return NextResponse.json(
      { error: "Vitals are outside the accepted input range." },
      { status: 400 }
    );
  }

  // Ensure scoped check: patient must belong to the active admin's hospital
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, name, personal_id, hospital_id")
    .eq("id", patientId)
    .eq("hospital_id", activeHospitalId)
    .maybeSingle();

  if (patientError || !patient) {
    return NextResponse.json({ error: "Patient record could not be found." }, { status: 404 });
  }

  const assessment = assessTriage(vitals);
  const aiRecommendation = await getAiRecommendation(patient, vitals, assessment);
  const recommendation = aiRecommendation?.text ?? assessment.recommendation;

  return NextResponse.json({
    mews_score: assessment.mewsScore,
    risk_level: assessment.riskLevel,
    probability: assessment.probability,
    recommendation,
    baseline_recommendation: assessment.recommendation,
    observations: assessment.observations,
    ai: {
      generated: Boolean(aiRecommendation?.text),
      model: aiRecommendation?.model ?? null,
    },
  });
}

async function getAiRecommendation(
  patient: Patient,
  vitals: TriageVitals,
  assessment: TriageAssessment
) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Corrected to OpenAI v4 SDK chat.completions.create syntax
    // Implemented a 4-second timeout abort signal to guarantee safety on Edge routes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a cautious clinical decision support assistant for hospital triage. You do not diagnose. Write concise escalation guidance for a licensed clinician using the supplied MEWS score, vitals, and baseline recommendation. Mention that the clinician should confirm against the full patient chart. Return 2-3 short sentences. No markdown."
        },
        {
          role: "user",
          content: [
            `Patient: ${patient.name} (${patient.personal_id})`,
            `Vitals: heart rate ${vitals.heartRate} bpm, SpO2 ${vitals.spo2}%, temperature ${vitals.temperature} C.`,
            `MEWS score: ${assessment.mewsScore}/12. Risk: ${assessment.riskLevel}.`,
            `Baseline recommendation: ${assessment.recommendation}`,
            `Observations: ${assessment.observations.join(" ")}`
          ].join("\n")
        }
      ],
      max_tokens: 180,
    }, { signal: controller.signal });

    clearTimeout(timeoutId);
    const text = response.choices[0]?.message?.content?.trim();

    if (!text) {
      return null;
    }

    return {
      text,
      model: OPENAI_MODEL,
    };
  } catch (err) {
    console.error("AI Triage generation failed. Falling back to local MEWS:", err);
    return null;
  }
}
