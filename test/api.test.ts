import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

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
});