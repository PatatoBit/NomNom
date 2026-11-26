import type { InboxResultStatus } from "./db";

export type { InboxResultStatus };

export interface ReelAttachment {
  url: string;
  title?: string;
  reel_video_id?: string;
}

export interface GenericAttachment {
  type: string;
  url?: string;
  title?: string;
  payload?: Record<string, unknown>;
}

export interface NormalizedMessageEvent {
  message_id: string;
  sender_id: string;
  sender_username: string;
  sent_at: string;
  text?: string;
  reels: ReelAttachment[];
  attachments: GenericAttachment[];
}

export interface MessagingAttachment {
  type?: string;
  payload?: {
    url?: string;
    title?: string;
    reel_video_id?: string;
    [key: string]: unknown;
  };
}

export interface MessagingMessage {
  mid?: string;
  text?: string;
  is_echo?: boolean;
  attachments?: MessagingAttachment[];
}

export interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: MessagingMessage;
  delivery?: unknown;
  read?: unknown;
}

export interface WebhookEntry {
  id?: string;
  messaging?: MessagingEvent[];
}

export interface WebhookPayload {
  object?: string;
  entry?: WebhookEntry[];
}