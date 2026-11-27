import { env, SELF } from "cloudflare:test";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../src/env";

describe("REST API", () => {
  it("GET /api/health", async () => {
    const res = await SELF.fetch("https://example.com/api/health");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; service: string };
    expect(json).toEqual({ ok: true, service: "mooyoung" });
  });

  it("GET /api/places includes seed data", async () => {
    const res = await SELF.fetch("https://example.com/api/places");
    const places = (await res.json()) as { name: string }[];
    expect(places.some((p) => p.name.includes("Tonkatsu Wako"))).toBe(true);
  });

  it("GET /api/inbox?poll=1 returns lightweight meta", async () => {
    const res = await SELF.fetch("https://example.com/api/inbox?poll=1");
    expect(res.status).toBe(200);
    const meta = (await res.json()) as {
      processing_count: number;
      latest_inbox_id: number | null;
      place_count: number;
      food_count: number;
      processing: unknown[];
    };
    expect(typeof meta.processing_count).toBe("number");
    expect(Array.isArray(meta.processing)).toBe(true);
    expect(typeof meta.place_count).toBe("number");
    expect(typeof meta.food_count).toBe("number");
  });

  it("PATCH /api/inbox/:id reprocess sorts a stuck food reel", async () => {
    const fullEnv = env as unknown as Env;
    fullEnv.AI = {
      run: vi.fn().mockResolvedValue({
        response: JSON.stringify({ kind: "unclear" }),
      }),
    } as unknown as Ai;

    const insert = await fullEnv.DB.prepare(
      `INSERT INTO inbox_events (
        message_id, sender_id, sender_username, added_by, text,
        reels_json, attachments_json, extraction_json, result_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "mid-api-reprocess-1",
        "sender-api",
        "patato.jpeg",
        "Pat",
        null,
        JSON.stringify([
          {
            url: "https://www.instagram.com/reel/APIRETRY1/",
            title: "มาม่าต้มยำหมูสับน้ำข้น\n#อร่อย #เมนูง่ายๆ",
          },
        ]),
        "[]",
        JSON.stringify({ kind: "unclear" }),
        "needs_review",
      )
      .run();
    const id = Number(insert.meta.last_row_id);

    const res = await SELF.fetch(`https://example.com/api/inbox/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reprocess: true }),
    });
    expect(res.status).toBe(200);
    const row = (await res.json()) as {
      result_status: string;
      extraction_json: string;
    };
    expect(row.result_status).toBe("added");
    expect(row.extraction_json).toContain("มาม่าต้มยำ");

    const missing = await SELF.fetch("https://example.com/api/inbox/999999", {
      method: "PATCH",
      headers: { 'Content-Type': "application/json" },
      body: JSON.stringify({ reprocess: true }),
    });
    expect(missing.status).toBe(404);
  });
});
