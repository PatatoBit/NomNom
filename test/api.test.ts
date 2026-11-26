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
});