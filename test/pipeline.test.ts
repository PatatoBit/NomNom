import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { processNormalizedEvent } from "../src/pipeline";
import type { Env } from "../src/env";

const mockFetch = vi.fn();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("webhook pipeline", () => {
  it("marks unclear messages as needs_review", async () => {
    vi.stubGlobal("fetch", mockFetch);
    const fullEnv = env as unknown as Env;
    fullEnv.AI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({ kind: "unclear" }),
      }),
    } as unknown as Ai;

    await processNormalizedEvent(fullEnv, {
      message_id: "mid-needs-review-1",
      sender_id: "s1",
      sender_username: "patato.jpeg",
      sent_at: new Date().toISOString(),
      text: "lol",
      reels: [],
      attachments: [],
    });

    const row = await fullEnv.DB.prepare(
      `SELECT result_status FROM inbox_events WHERE message_id = ?`,
    )
      .bind("mid-needs-review-1")
      .first<{ result_status: string }>();
    expect(row?.result_status).toBe("needs_review");
  });

  it("adds a place and skips duplicate inbox", async () => {
    vi.stubGlobal("fetch", mockFetch.mockResolvedValue(new Response("[]")));
    const fullEnv = env as unknown as Env;
    fullEnv.AI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({
          kind: "place",
          place: { name: "Unique Pipeline Place XYZ", area: "Bangkok" },
        }),
      }),
    } as unknown as Ai;

    const event = {
      message_id: "mid-pipeline-place-1",
      sender_id: "s2",
      sender_username: "youthkid9048",
      sent_at: new Date().toISOString(),
      text: "save this",
      reels: [{ url: "https://www.instagram.com/reel/ABC123/" }],
      attachments: [],
    };

    await processNormalizedEvent(fullEnv, event);

    const inbox = await fullEnv.DB.prepare(
      `SELECT result_status FROM inbox_events WHERE message_id = ?`,
    )
      .bind(event.message_id)
      .first<{ result_status: string }>();
    expect(inbox?.result_status).toBe("added");

    const place = await fullEnv.DB.prepare(
      `SELECT name FROM places WHERE lower(name) = lower(?)`,
    )
      .bind("Unique Pipeline Place XYZ")
      .first<{ name: string }>();
    expect(place?.name).toBe("Unique Pipeline Place XYZ");

    await processNormalizedEvent(fullEnv, event);
    const count = await fullEnv.DB.prepare(
      `SELECT COUNT(*) as c FROM inbox_events WHERE message_id = ?`,
    )
      .bind(event.message_id)
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });
});