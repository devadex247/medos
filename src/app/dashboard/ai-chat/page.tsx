"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  BrainCircuit,
  Clipboard,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCircle,
} from "lucide-react";

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatResponse = {
  error?: string;
  message?: {
    role: "assistant";
    content: string;
  };
  model?: string;
};

const STARTER_MESSAGE: ChatMessage = {
  id: "starter",
  role: "assistant",
  content:
    "I am ready to help with hospital workflows, documentation, patient communication, operations planning, and safe clinical support. Share the task or question you want to work through.",
};

const QUICK_PROMPTS = [
  "Draft a patient follow-up message for a missed appointment.",
  "Create a shift handover checklist for front-desk staff.",
  "Summarize a pharmacy stock review plan.",
  "Explain a lab result status update in patient-friendly language.",
];

function makeMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([STARTER_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();

    if (!trimmed || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: makeMessageId(),
      role: "user",
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = (await response.json()) as ChatResponse;

      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "AI chat could not respond.");
      }

      setMessages((current) => [
        ...current,
        {
          id: makeMessageId(),
          role: "assistant",
          content: payload.message.content,
        },
      ]);
      setModel(payload.model ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI chat could not respond.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([STARTER_MESSAGE]);
    setInput("");
    setError("");
    setModel(null);
  };

  const copyLatestResponse = async () => {
    const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");

    if (!latestAssistantMessage) {
      return;
    }

    await navigator.clipboard.writeText(latestAssistantMessage.content);
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="glass-panel rounded-2xl overflow-hidden flex min-h-[36rem] flex-col">
        <div className="border-b border-med-border px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-med-teal/10 text-med-teal flex items-center justify-center">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-med-primary">AI Chat</h1>
              <p className="text-xs text-med-muted">Hospital workspace assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {model && (
              <span className="hidden sm:inline-flex rounded-lg border border-med-border px-2.5 py-1 text-xs text-med-muted">
                {model}
              </span>
            )}
            <button
              type="button"
              onClick={copyLatestResponse}
              className="inline-flex items-center gap-2 rounded-lg border border-med-border px-3 py-2 text-xs font-medium text-med-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Clipboard size={14} /> Copy
            </button>
            <button
              type="button"
              onClick={resetChat}
              className="inline-flex items-center gap-2 rounded-lg border border-med-border px-3 py-2 text-xs font-medium text-med-primary hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const Icon = isAssistant ? BrainCircuit : UserCircle;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
                >
                  {isAssistant && (
                    <div className="mt-1 w-8 h-8 rounded-lg bg-med-teal/10 text-med-teal flex flex-shrink-0 items-center justify-center">
                      <Icon size={17} />
                    </div>
                  )}
                  <div
                    className={`max-w-[min(46rem,85%)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isAssistant
                        ? "bg-med-card border border-med-border text-med-primary"
                        : "bg-medosBlue text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  </div>
                  {!isAssistant && (
                    <div className="mt-1 w-8 h-8 rounded-lg bg-medosBlue/10 text-medosBlue flex flex-shrink-0 items-center justify-center">
                      <Icon size={17} />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-med-muted">
                <div className="w-8 h-8 rounded-lg bg-med-teal/10 text-med-teal flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin" />
                </div>
                AI chat is thinking...
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </div>

        <div className="border-t border-med-border p-4 sm:p-5">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about hospital workflows, documentation, operations, or care support..."
              rows={3}
              className="min-h-20 flex-1 resize-none rounded-xl border border-med-border bg-med-card px-4 py-3 text-sm text-med-primary outline-none focus:border-medosBlue focus:ring-2 focus:ring-medosBlue/20"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-12 w-12 flex-shrink-0 rounded-xl bg-medosBlue text-white flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50"
              aria-label="Send message"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-med-teal" />
            <h2 className="text-sm font-semibold text-med-primary">Prompt Starters</h2>
          </div>
          <div className="mt-4 grid gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void sendMessage(prompt)}
                disabled={loading}
                className="rounded-xl border border-med-border bg-med-card px-3 py-3 text-left text-sm text-med-primary hover:border-medosBlue/40 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <h2 className="text-sm font-semibold text-med-primary">Clinical Guardrails</h2>
          </div>
          <div className="mt-4 space-y-3 text-sm text-med-muted">
            <p>AI responses must be reviewed by qualified hospital staff before they affect care decisions.</p>
            <p>Do not enter unnecessary patient identifiers unless they are needed for the task.</p>
          </div>
        </section>

        <section className="glass-panel rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-med-accent" />
            <h2 className="text-sm font-semibold text-med-primary">Best Fit</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm text-med-muted">
            <p>Care-team messages</p>
            <p>Operational checklists</p>
            <p>Policy drafts</p>
            <p>Patient-friendly summaries</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
