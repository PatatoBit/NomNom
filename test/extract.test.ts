import { describe, expect, it } from "vitest";
import {
  buildNormalizedEvent,
  extractReelUrlsFromText,
  isProcessableMessageEvent,
} from "../src/extract";
import type { MessagingEvent } from "../src/types";

describe("isProcessableMessageEvent", () => {
  it("skips echo messages", () => {
    const event: MessagingEvent = {
      sender: { id: "1" },
      message: { mid: "m1", is_echo: true, text: "hi" },
    };
    expect(isProcessableMessageEvent(event)).toBe(false);
  });

  it("skips delivery receipts", () => {
    const event: MessagingEvent = {
      sender: { id: "1" },
      delivery: { mids: ["m1"] },
    };
    expect(isProcessableMessageEvent(event)).toBe(false);
  });

  it("skips read receipts", () => {
    const event: MessagingEvent = {
      sender: { id: "1" },
      read: { watermark: 1 },
    };
    expect(isProcessableMessageEvent(event)).toBe(false);
  });

  it("accepts normal messages", () => {
    const event: MessagingEvent = {
      sender: { id: "1" },
      timestamp: 1_700_000_000_000,
      message: { mid: "m1", text: "hello" },
    };
    expect(isProcessableMessageEvent(event)).toBe(true);
  });
});

describe("buildNormalizedEvent", () => {
  it("extracts ig_reel attachments", () => {
    const event = {
      sender: { id: "99" },
      timestamp: 1_700_000_000_000,
      message: {
        mid: "mid-reel",
        attachments: [
          {
            type: "ig_reel",
            payload: {
              url: "https://www.instagram.com/reel/ABC123/",
              title: "Cool reel",
              reel_video_id: "vid_123",
            },
          },
        ],
      },
    };
    const normalized = buildNormalizedEvent(event, "patato.jpeg");
    expect(normalized.reels).toEqual([
      {
        url: "https://www.instagram.com/reel/ABC123/",
        title: "Cool reel",
        reel_video_id: "vid_123",
      },
    ]);
    expect(normalized.message_id).toBe("mid-reel");
    expect(normalized.sender_username).toBe("patato.jpeg");
  });

  it("captures text and reel URLs embedded in text", () => {
    const text =
      "Check this https://www.instagram.com/reels/XYZ789/ and also https://instagram.com/reel/LOWER1/";
    const event = {
      sender: { id: "1" },
      message: { mid: "m2", text },
    };
    const normalized = buildNormalizedEvent(event, "youthkid9048");
    expect(normalized.text).toBe(text);
    expect(normalized.reels.map((r) => r.url)).toEqual(
      expect.arrayContaining([
        "https://www.instagram.com/reels/XYZ789",
        "https://instagram.com/reel/LOWER1",
      ]),
    );
  });

  it("keeps other share attachments", () => {
    const event = {
      sender: { id: "1" },
      message: {
        mid: "m3",
        attachments: [
          {
            type: "ig_post",
            payload: { url: "https://www.instagram.com/p/POST1/" },
          },
          {
            type: "share",
            payload: { url: "https://example.com/link", title: "link" },
          },
        ],
      },
    };
    const normalized = buildNormalizedEvent(event, "patato.jpeg");
    expect(normalized.attachments).toHaveLength(2);
    expect(normalized.attachments[0].type).toBe("ig_post");
  });
});

describe("extractReelUrlsFromText", () => {
  it("finds reel and reels paths", () => {
    const urls = extractReelUrlsFromText(
      "a https://instagram.com/reel/Ab1/ b https://www.instagram.com/reels/Cd2/",
    );
    expect(urls).toHaveLength(2);
  });
});