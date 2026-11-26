import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach } from "vitest";
import type { Env } from "../src/env";
import {
  findPlaceByName,
  insertPlace,
  listPlaces,
  patchPlace,
  deletePlace,
} from "../src/db";

const testEnv = env as unknown as Env;

describe("D1 places CRUD", () => {
  beforeEach(async () => {
    await testEnv.DB.prepare(`DELETE FROM places WHERE name = ?`).bind("Test Cafe").run();
  });

  it("inserts and lists a place", async () => {
    const id = await insertPlace(testEnv.DB, {
      name: "Test Cafe",
      area: "Bangkok",
      city: "Bangkok",
      cuisine: "Thai",
      price_level: "฿",
      rating: null,
      maps_url: null,
      source_url: null,
      image_url: null,
      lat: 13.75,
      lng: 100.5,
      status: "want_to_go",
      added_by: "Pat",
      added_date: "2026-11-26",
      visit_date: null,
      visit_rating: null,
      visit_notes: null,
      notes: null,
    });
    expect(id).toBeGreaterThan(0);
    const places = await listPlaces(testEnv.DB);
    expect(places.some((p) => p.id === id)).toBe(true);
  });

  it("dedupes by case-insensitive name", async () => {
    const hit = await findPlaceByName(testEnv.DB, "tonkatsu wako @centralworld");
    expect(hit?.name).toContain("Wako");
  });

  it("patches and deletes", async () => {
    const id = await insertPlace(testEnv.DB, {
      name: "Test Cafe",
      area: null,
      city: null,
      cuisine: null,
      price_level: null,
      rating: null,
      maps_url: null,
      source_url: null,
      image_url: null,
      lat: null,
      lng: null,
      status: "want_to_go",
      added_by: "Miyu",
      added_date: "2026-11-26",
      visit_date: null,
      visit_rating: null,
      visit_notes: null,
      notes: null,
    });
    const updated = await patchPlace(testEnv.DB, id, { status: "visited" });
    expect(updated?.status).toBe("visited");
    const ok = await deletePlace(testEnv.DB, id);
    expect(ok).toBe(true);
  });
});