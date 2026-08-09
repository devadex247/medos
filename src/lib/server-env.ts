import "server-only";

export const REQUIRED_SERVER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export const OPTIONAL_SERVER_ENV = [
  "OPENAI_API_KEY",
  "OPENAI_CHAT_MODEL",
  "OPENAI_TRIAGE_MODEL",
  "RESEND_API_KEY",
] as const;

type EnvName =
  | (typeof REQUIRED_SERVER_ENV)[number]
  | (typeof OPTIONAL_SERVER_ENV)[number];
type RequiredEnvName = (typeof REQUIRED_SERVER_ENV)[number];

export class EnvConfigError extends Error {
  missing: string[];

  constructor(missing: string[]) {
    super(`Missing required server environment variables: ${missing.join(", ")}`);
    this.name = "EnvConfigError";
    this.missing = missing;
  }
}

export function isConfiguredEnv(name: EnvName) {
  const value = process.env[name]?.trim();
  return Boolean(value) && !value?.startsWith("placeholder-");
}

export function getEnvStatus() {
  const required = REQUIRED_SERVER_ENV.map((name) => ({
    name,
    configured: isConfiguredEnv(name),
  }));
  const optional = OPTIONAL_SERVER_ENV.map((name) => ({
    name,
    configured: isConfiguredEnv(name),
  }));
  const missing = required.filter((item) => !item.configured).map((item) => item.name);

  return {
    ok: missing.length === 0,
    missing,
    required,
    optional,
  };
}

export function assertRequiredEnv(names: readonly RequiredEnvName[] = REQUIRED_SERVER_ENV) {
  const missing = names.filter((name) => !isConfiguredEnv(name));

  if (missing.length > 0) {
    throw new EnvConfigError([...missing]);
  }
}

export function getRequiredEnv(name: RequiredEnvName) {
  assertRequiredEnv([name]);
  return process.env[name] as string;
}

export function getEnvErrorPayload(error: unknown) {
  if (error instanceof EnvConfigError) {
    return {
      error: "Server configuration is incomplete.",
      code: "SERVER_ENV_MISSING",
      missing: error.missing,
    };
  }

  return null;
}
