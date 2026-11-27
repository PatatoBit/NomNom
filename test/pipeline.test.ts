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
  it("persists processing before extraction finishes", async () => {
    vi.stubGlobal("fetch", mockFetch);
    const fullEnv = env as unknown as Env;
    let resolveAi: ((value: { response: string }) => void) | undefined;
    const aiDeferred = new Promise<{ response: string }>((resolve) => {
      resolveAi = resolve;
    });
    fullEnv.AI = {
      run: vi.fn().mockReturnValue(aiDeferred),
    } as unknown as Ai;

    const event = {
      message_id: "mid-processing-1",
      sender_id: "s-p",
      sender_username: "patato.jpeg",
      sent_at: new Date().toISOString(),
      text: "save this spot",
      reels: [{ url: "https://www.instagram.com/reel/PROC123/" }],
      attachments: [],
    };

    const pipelinePromise = processNormalizedEvent(fullEnv, event);

    await vi.waitFor(async () => {
      const row = await fullEnv.DB.prepare(
        `SELECT result_status FROM inbox_events WHERE message_id = ?`,
      )
        .bind(event.message_id)
        .first<{ result_status: string }>();
      expect(row?.result_status).toBe("processing");
    });

    resolveAi!({
      response: JSON.stringify({ kind: "unclear" }),
    });
    await pipelinePromise;

    const finalRow = await fullEnv.DB.prepare(
      `SELECT result_status FROM inbox_events WHERE message_id = ?`,
    )
      .bind(event.message_id)
      .first<{ result_status: string }>();
    expect(finalRow?.result_status).toBe("needs_review");
  });

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

  it("retries extraction when a prior attempt left the row processing", async () => {
    vi.stubGlobal("fetch", mockFetch.mockResolvedValue(new Response("[]")));
    const fullEnv = env as unknown as Env;
    fullEnv.AI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({ kind: "unclear" }),
      }),
    } as unknown as Ai;

    const event = {
      message_id: "mid-retry-processing-1",
      sender_id: "s-retry",
      sender_username: "patato.jpeg",
      sent_at: new Date().toISOString(),
      text: undefined,
      reels: [
        {
          url: "https://www.instagram.com/reel/RETRY123/",
          title:
            "มาม่าต้มยำหมูสับน้ำข้น แซ่บบบ🔥✨\n#อร่อย #เมนูง่ายๆ #มาม่าต้มยำหมูสับ",
        },
      ],
      attachments: [],
    };

    await fullEnv.DB.prepare(
      `INSERT INTO inbox_events (
        message_id, sender_id, sender_username, added_by, text,
        reels_json, attachments_json, result_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')`,
    )
      .bind(
        event.message_id,
        event.sender_id,
        event.sender_username,
        "Pat",
        null,
        JSON.stringify(event.reels),
        "[]",
      )
      .run();

    await processNormalizedEvent(fullEnv, event);

    const inbox = await fullEnv.DB.prepare(
      `SELECT result_status, extraction_json FROM inbox_events WHERE message_id = ?`,
    )
      .bind(event.message_id)
      .first<{ result_status: string; extraction_json: string }>();
    expect(inbox?.result_status).toBe("added");
    expect(inbox?.extraction_json).toContain("มาม่าต้มยำ");

    const food = await fullEnv.DB.prepare(
      `SELECT name FROM foods WHERE source_url = ?`,
    )
      .bind(event.reels[0].url)
      .first<{ name: string }>();
    expect(food?.name).toContain("มาม่าต้มยำ");
  });
});