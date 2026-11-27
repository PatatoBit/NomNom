import { describe, expect, it, vi } from "vitest";
import {
  cleanCandidateName,
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

  it("cleans long caption names", () => {
    const raw = JSON.stringify({
      kind: "food",
      food: {
        name: "12 easy dinner ideas 💡\n#food #dinnerideas",
        category: "Recipe",
      },
    });
    const result = parseExtractionJson(raw);
    expect(result?.food?.name).toBe("12 easy dinner ideas");
  });
});

describe("cleanCandidateName", () => {
  it("keeps the first line and strips hashtags", () => {
    expect(
      cleanCandidateName(
        "มาม่าต้มยำหมูสับน้ำข้น แซ่บบบ🔥✨\n#อร่อย #เมนูง่ายๆ #มาม่าต้มยำหมูสับ",
      ),
    ).toBe("มาม่าต้มยำหมูสับน้ำข้น แซ่บบบ");
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

  it("detects Thai recipe/food captions", () => {
    const result = fallbackExtraction({
      reelTitles: [
        "มาม่าต้มยำหมูสับน้ำข้น แซ่บบบ🔥✨\n#อร่อย #เมนูง่ายๆ #มาม่าต้มยำหมูสับ\n#aonzfooddiary",
      ],
      reelUrls: ["https://www.instagram.com/reel/DdOOCX5glrJ/"],
    });
    expect(result.kind).toBe("food");
    expect(result.food?.name).toContain("มาม่าต้มยำ");
    expect(result.food?.category).toBe("Recipe");
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

  it("falls back when AI returns unclear for a food reel", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({ kind: "unclear" }),
    });
    const env = { AI: { run } } as unknown as Env;
    const result = await runExtraction(env, {
      text: undefined,
      reelTitles: [
        "มาม่าต้มยำหมูสับน้ำข้น แซ่บบบ🔥✨\n#อร่อย #เมนูง่ายๆ #มาม่าต้มยำหมูสับ",
      ],
      reelUrls: ["https://www.instagram.com/reel/DdOOCX5glrJ/"],
    });
    expect(result.kind).toBe("food");
    expect(result.food?.name).toContain("มาม่าต้มยำ");
  });
});
