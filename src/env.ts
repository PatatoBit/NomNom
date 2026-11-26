export interface Env {
  WEBHOOK_VERIFY_TOKEN: string;
  INSTAGRAM_APP_SECRET: string;
  INSTAGRAM_ACCESS_TOKEN: string;
  /** Optional override for username lookup (default: graph.facebook.com/v27.0). */
  INSTAGRAM_GRAPH_BASE_URL?: string;
  ALLOWED_USERNAMES?: string;
  FORWARD_WEBHOOK_URL?: string;
  FORWARD_WEBHOOK_SECRET?: string;
  FORWARD_WEBHOOK_HEADER?: string;
}

export const DEFAULT_ALLOWED_USERNAMES = "patato.jpeg,youthkid9048";

export function parseAllowedUsernames(raw: string | undefined): Set<string> {
  const source = (raw ?? DEFAULT_ALLOWED_USERNAMES).trim();
  if (!source) {
    return new Set();
  }
  return new Set(
    source
      .split(",")
      .map((part) => part.trim().replace(/^@+/, "").toLowerCase())
      .filter(Boolean),
  );
}

export function isUsernameAllowed(
  username: string | undefined,
  allowed: Set<string>,
): boolean {
  if (!username) {
    return false;
  }
  const normalized = username.trim().replace(/^@+/, "").toLowerCase();
  return allowed.has(normalized);
}