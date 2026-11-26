export interface Env {
  DB: D1Database;
  AI: Ai;
  WEBHOOK_VERIFY_TOKEN: string;
  INSTAGRAM_APP_SECRET: string;
  INSTAGRAM_ACCESS_TOKEN: string;
  /** Optional override for username lookup (default: graph.facebook.com/v27.0). */
  INSTAGRAM_GRAPH_BASE_URL?: string;
  ALLOWED_USERNAMES?: string;
  FORWARD_WEBHOOK_URL?: string;
  FORWARD_WEBHOOK_SECRET?: string;
  FORWARD_WEBHOOK_HEADER?: string;
  /** CARTO basemap API key for Leaflet tiles on the Nom Nom map. */
  CARTO_API_KEY?: string;
}

const USERNAME_TO_ADDED_BY: Record<string, "Pat" | "Miyu"> = {
  "patato.jpeg": "Pat",
  "youthkid9048": "Miyu",
};

export function usernameToAddedBy(username: string): "Pat" | "Miyu" | null {
  const key = username.trim().replace(/^@+/, "").toLowerCase();
  return USERNAME_TO_ADDED_BY[key] ?? null;
}

export function bangkokDateYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
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