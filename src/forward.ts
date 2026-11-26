import type { Env } from "./env";
import type { NormalizedMessageEvent } from "./types";

export async function forwardEvent(
  env: Env,
  event: NormalizedMessageEvent,
): Promise<void> {
  const url = env.FORWARD_WEBHOOK_URL?.trim();
  if (!url) {
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const secret = env.FORWARD_WEBHOOK_SECRET?.trim();
  if (secret) {
    const headerName = env.FORWARD_WEBHOOK_HEADER?.trim();
    if (headerName) {
      headers[headerName] = secret;
    } else {
      headers.Authorization = `Bearer ${secret}`;
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "forward_webhook_failed",
        status: response.status,
        message_id: event.message_id,
      }),
    );
  }
}