import type {
  GenericAttachment,
  MessagingEvent,
  MessagingMessage,
  NormalizedMessageEvent,
  ReelAttachment,
  WebhookPayload,
} from "./types";

const REEL_URL_RE =
  /https?:\/\/(?:www\.)?instagram\.com\/reels?\/[A-Za-z0-9_-]+/gi;

export function extractReelUrlsFromText(text: string): string[] {
  const matches = text.match(REEL_URL_RE);
  if (!matches) {
    return [];
  }
  return [...new Set(matches)];
}

export function isProcessableMessageEvent(
  event: MessagingEvent,
): event is MessagingEvent & { message: MessagingMessage; sender: { id: string } } {
  if (event.delivery || event.read) {
    return false;
  }
  const message = event.message;
  if (!message || message.is_echo === true) {
    return false;
  }
  const senderId = event.sender?.id;
  if (!senderId) {
    return false;
  }
  const mid = message.mid;
  if (!mid) {
    return false;
  }
  return true;
}

/** True when the normalized DM includes at least one reel URL to save. */
export function hasReelToSave(event: NormalizedMessageEvent): boolean {
  return event.reels.some(
    (reel) => typeof reel.url === "string" && reel.url.trim().length > 0,
  );
}

function extractFromAttachments(message: MessagingMessage): {
  reels: ReelAttachment[];
  attachments: GenericAttachment[];
} {
  const reels: ReelAttachment[] = [];
  const attachments: GenericAttachment[] = [];

  for (const att of message.attachments ?? []) {
    const type = att.type ?? "unknown";
    const payload = att.payload ?? {};
    const url = typeof payload.url === "string" ? payload.url : undefined;
    const title = typeof payload.title === "string" ? payload.title : undefined;

    if (type === "ig_reel") {
      const reelVideoId =
        typeof payload.reel_video_id === "string"
          ? payload.reel_video_id
          : undefined;
      reels.push({
        url: url ?? "",
        title,
        reel_video_id: reelVideoId,
      });
    } else if (type === "share" || type === "ig_post" || type.startsWith("ig_")) {
      attachments.push({
        type,
        url,
        title,
        payload: payload as Record<string, unknown>,
      });
    } else if (url || title) {
      attachments.push({
        type,
        url,
        title,
        payload: payload as Record<string, unknown>,
      });
    }
  }

  return { reels, attachments };
}

export function buildNormalizedEvent(
  event: MessagingEvent & { message: MessagingMessage; sender: { id: string } },
  senderUsername: string,
): NormalizedMessageEvent {
  const message = event.message;
  const { reels, attachments } = extractFromAttachments(message);

  let text = message.text?.trim() || undefined;
  const textReelUrls = text ? extractReelUrlsFromText(text) : [];

  for (const reelUrl of textReelUrls) {
    const already = reels.some((r) => r.url === reelUrl);
    if (!already) {
      reels.push({ url: reelUrl });
    }
  }

  const sentAt = event.timestamp
    ? new Date(event.timestamp).toISOString()
    : new Date().toISOString();

  return {
    message_id: message.mid!,
    sender_id: event.sender.id,
    sender_username: senderUsername,
    sent_at: sentAt,
    text,
    reels,
    attachments,
  };
}

export function collectMessagingEvents(payload: WebhookPayload): MessagingEvent[] {
  const events: MessagingEvent[] = [];
  for (const entry of payload.entry ?? []) {
    for (const messaging of entry.messaging ?? []) {
      events.push(messaging);
    }
  }
  return events;
}