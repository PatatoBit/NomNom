import { verifyHubSignature256 } from "./crypto";
import { parseAllowedUsernames, isUsernameAllowed, type Env } from "./env";
import {
  buildNormalizedEvent,
  collectMessagingEvents,
  isProcessableMessageEvent,
} from "./extract";
import { forwardEvent } from "./forward";
import { lookupInstagramUsername } from "./instagram";
import type { WebhookPayload } from "./types";

const usernameCache = new Map<string, string>();

export async function handleWebhookPost(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const signature = request.headers.get("X-Hub-Signature-256");
  const rawBody = await request.text();

  const valid = await verifyHubSignature256(
    rawBody,
    signature,
    env.INSTAGRAM_APP_SECRET,
  );
  if (!valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  ctx.waitUntil(processWebhookPayload(env, payload));

  return new Response("OK", { status: 200 });
}

export async function processWebhookPayload(
  env: Env,
  payload: WebhookPayload,
): Promise<void> {
  const allowed = parseAllowedUsernames(env.ALLOWED_USERNAMES);
  const events = collectMessagingEvents(payload);

  for (const event of events) {
    if (!isProcessableMessageEvent(event)) {
      continue;
    }

    let username = usernameCache.get(event.sender.id);
    if (!username) {
      const lookedUp = await lookupInstagramUsername(
        event.sender.id,
        env.INSTAGRAM_ACCESS_TOKEN,
      );
      if (!lookedUp) {
        continue;
      }
      username = lookedUp;
      usernameCache.set(event.sender.id, username);
    }

    if (!isUsernameAllowed(username, allowed)) {
      continue;
    }

    const normalized = buildNormalizedEvent(event, username);
    console.log(JSON.stringify({ type: "nomnom_event", ...normalized }));
    await forwardEvent(env, normalized);
  }
}

/** Test helper: clear in-memory username cache between tests. */
export function clearUsernameCacheForTests(): void {
  usernameCache.clear();
}