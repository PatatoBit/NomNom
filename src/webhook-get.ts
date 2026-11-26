import { timingSafeEqual } from "./crypto";
import type { Env } from "./env";

export function handleWebhookVerification(
  request: Request,
  env: Env,
): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || challenge === null || token === null) {
    return new Response("Forbidden", { status: 403 });
  }

  if (!timingSafeEqual(token, env.WEBHOOK_VERIFY_TOKEN)) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}