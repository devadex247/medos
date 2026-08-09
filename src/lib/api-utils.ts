export const WORKSPACE_ROLES = ["doctor", "staff", "patient"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export async function parseJsonBody<T = Record<string, unknown>>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

export function cleanString(value: unknown, maxLength = 240): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function nullableString(value: unknown, maxLength = 240): string | null {
  const cleaned = cleanString(value, maxLength);
  return cleaned || null;
}

export function cleanOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function cleanAccessToken(value: unknown) {
  return cleanString(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function makeUsername(email: string) {
  const base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${base || "user"}_${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function makePersonalId() {
  return `PAT-${Math.floor(Math.random() * 900000 + 100000)}`;
}

export function makeAccessToken(length = 8) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let token = "";

  for (let i = 0; i < length; i++) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return token;
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected database error occurred.";
}

export function isWorkspaceRole(value: unknown): value is WorkspaceRole {
  return typeof value === "string" && WORKSPACE_ROLES.includes(value as WorkspaceRole);
}

export function isTableName(value: string) {
  return /^[a-z0-9_]+$/i.test(value);
}
