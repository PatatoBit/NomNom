import { describe, expect, it, vi } from "vitest";
import {
  fallbackExtraction,
  parseExtractionJson,
  runExtraction,
} from "../src/ai";
import type { Env } from "../src/env";

describe("parseExtractionJson", () => {
  it("parses JSON embedded in text", () => {
    const raw = 'Here you go: {"kind":"place","place":{"name":"Tora Ramen"}}';
    const result = parseExtractionJson(raw);
    expect(result?.kind).toBe("place");
    expect(result?.place?.name).toBe("Tora Ramen");
  });

  it("returns null for invalid JSON", () => {
    expect(parseExtractionJson("not json")).toBeNull();
  });
});

describe("fallbackExtraction", () => {
  it("detects place from ramen hint", () => {
    const result = fallbackExtraction({
      text: "Check this ramen spot",
      reelTitles: ["Tora Ramen Bangkok"],
      reelUrls: [],
    });
    expect(result.kind).toBe("place");
    expect(result.place?.name).toContain("Tora");
  });

  it("returns unclear for empty input", () => {
    expect(fallbackExtraction({ reelTitles: [], reelUrls: [] }).kind).toBe(
      "unclear",
    );
  });
});

describe("runExtraction", () => {
  it("uses AI output when valid", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        kind: "food",
        food: {
          name: "Buldak wrap",
          category: "Dish to try",
        },
      }),
    });
    const env = { AI: { run } } as unknown as Env;
    const result = await runExtraction(env, {
      text: "yum",
      reelTitles: ["Buldak"],
      reelUrls: [],
    });
    expect(result.kind).toBe("food");
    expect(result.food?.name).toBe("Buldak wrap");
  });

  it("falls back when AI fails", async () => {
    const run = vi.fn().mockRejectedValue(new Error("ai down"));
    const env = { AI: { run } } as unknown as Env;
    const result = await runExtraction(env, {
      text: "recipe for ramen at home",
      reelTitles: [],
      reelUrls: [],
    });
    expect(result.kind).toBe("food");
  });
});