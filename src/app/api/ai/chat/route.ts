import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";

import { getAuthenticatedTenantContext } from "@/lib/auth-context";
import { canUseAIChat, getRoleLabel } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_MODEL = process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_TRIAGE_MODEL ?? "gpt-4o";
const MAX_MESSAGES = 14;
const MAX_MESSAGE_LENGTH = 2500;
const MAX_TOTAL_LENGTH = 12000;

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatBody = {
  messages?: IncomingMessage[];
};

function cleanMessage(message: IncomingMessage) {
  const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
  const content = typeof message.content === "string" ? message.content.trim() : "";

  if (!role || !content) {
    return null;
  }

  return {
    role,
    content: content.slice(0, MAX_MESSAGE_LENGTH),
  };
}

function getSystemPrompt(roleLabel: string) {
  return [
    "You are MedOS AI Chat, a concise assistant inside a Nigerian hospital operations system.",
    "Help users with hospital workflow questions, documentation drafts, patient-friendly explanations, administrative planning, and safe clinical support.",
    "Do not diagnose, prescribe, invent patient records, or claim access to data that was not supplied in the conversation.",
    "For urgent symptoms, emergencies, or deterioration, tell the user to seek immediate in-person clinical assessment.",
    "Keep answers practical, structured, and appropriate for the user's workspace role.",
    `Current user role: ${roleLabel}.`,
  ].join("\n");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const context = await getAuthenticatedTenantContext(supabase, { requireHospital: true });

  if (context.error) {
    return NextResponse.json({ error: context.error.message }, { status: context.error.status });
  }

  if (!canUseAIChat(context.role)) {
    return NextResponse.json({ error: "Your role cannot use AI chat." }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI chat is not configured. Add OPENAI_API_KEY to the deployment environment." },
      { status: 503 }
    );
  }

  let body: ChatBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .map(cleanMessage)
    .filter((message): message is NonNullable<ReturnType<typeof cleanMessage>> => Boolean(message))
    .slice(-MAX_MESSAGES);

  const totalLength = messages.reduce((sum, message) => sum + message.content.length, 0);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || lastMessage.role !== "user") {
    return NextResponse.json({ error: "A user message is required." }, { status: 400 });
  }

  if (totalLength > MAX_TOTAL_LENGTH) {
    return NextResponse.json(
      { error: "This conversation is too long. Start a new chat and try again." },
      { status: 413 }
    );
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await client.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: getSystemPrompt(getRoleLabel(context.role)),
          },
          ...messages,
        ],
        temperature: 0.2,
        max_tokens: 750,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "AI chat did not return a response." }, { status: 502 });
    }

    return NextResponse.json({
      message: {
        role: "assistant",
        content,
      },
      model: OPENAI_MODEL,
    });
  } catch (error) {
    console.error("AI chat generation failed:", error);
    return NextResponse.json(
      { error: "AI chat is temporarily unavailable. Try again shortly." },
      { status: 502 }
    );
  }
}
