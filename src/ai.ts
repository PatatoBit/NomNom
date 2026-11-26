import type { Env } from "./env";

export type ExtractionKind = "place" | "food" | "both" | "unclear" | "non_food";

export interface PlaceExtraction {
  name?: string;
  area?: string;
  city?: string;
  cuisine?: string;
  price_level?: string;
  notes?: string;
}

export interface FoodExtraction {
  name?: string;
  category?: "Dish to try" | "Recipe";
  cuisine?: string;
  restaurant_name?: string;
  notes?: string;
}

export interface ExtractionResult {
  kind: ExtractionKind;
  place?: PlaceExtraction;
  food?: FoodExtraction;
  pipeline_error?: string;
}

const EXTRACTION_PROMPT = `You extract restaurant and food information from Instagram DM text about food.
Reply with ONLY valid JSON, no markdown, matching this schema:
{
  "kind": "place" | "food" | "both" | "unclear" | "non_food",
  "place": { "name", "area", "city", "cuisine", "price_level", "notes" } or null,
  "food": { "name", "category": "Dish to try" | "Recipe", "cuisine", "restaurant_name", "notes" } or null
}
Rules:
- Never invent ratings, prices in numbers, or map URLs.
- Leave unknown fields out or use null.
- category must be exactly "Dish to try" or "Recipe".
- If nothing clearly names a place or dish, use kind "unclear" or "non_food".
`;

export function parseExtractionJson(raw: string): ExtractionResult | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as ExtractionResult;
    if (!parsed.kind) {
      return null;
    }
    normalizeExtraction(parsed);
    return parsed;
  } catch {
    return null;
  }
}

function normalizeExtraction(result: ExtractionResult): void {
  const kinds: ExtractionKind[] = [
    "place",
    "food",
    "both",
    "unclear",
    "non_food",
  ];
  if (!kinds.includes(result.kind)) {
    result.kind = "unclear";
  }
  if (result.food?.category) {
    const c = String(result.food.category);
    if (c !== "Dish to try" && c !== "Recipe") {
      if (c.toLowerCase().includes("recipe")) {
        result.food.category = "Recipe";
      } else {
        result.food.category = "Dish to try";
      }
    }
  }
}

export function fallbackExtraction(input: {
  text?: string;
  reelTitles: string[];
  reelUrls: string[];
}): ExtractionResult {
  const blob = [input.text ?? "", ...input.reelTitles, ...input.reelUrls]
    .filter(Boolean)
    .join("\n");
  const lower = blob.toLowerCase();
  if (!blob.trim()) {
    return { kind: "unclear" };
  }
  const restaurantHints =
    /(restaurant|ramen|tonkatsu|cafe|porridge|shabu|buffet|@central|dotonbori)/i.test(
      blob,
    );
  const recipeHints = /(recipe|cook at home|5-minute|instant noodle)/i.test(blob);
  if (restaurantHints && !recipeHints) {
    const name =
      input.reelTitles[0]?.trim() ||
      blob
        .split("\n")[0]
        ?.trim()
        .slice(0, 120);
    if (name && name.length > 2) {
      return {
        kind: "place",
        place: { name, notes: input.text?.slice(0, 500) },
      };
    }
  }
  if (recipeHints || /dish to try/i.test(lower)) {
    const name = input.reelTitles[0]?.trim() || input.text?.slice(0, 120).trim();
    if (name) {
      return {
        kind: "food",
        food: {
          name,
          category: recipeHints ? "Recipe" : "Dish to try",
          notes: input.text,
        },
      };
    }
  }
  return { kind: "unclear" };
}

export async function runExtraction(
  env: Env,
  input: {
    text?: string;
    reelTitles: string[];
    reelUrls: string[];
  },
): Promise<ExtractionResult> {
  const userContent = [
    "Message text:",
    input.text ?? "(none)",
    "Reel titles:",
    input.reelTitles.length ? input.reelTitles.join("\n") : "(none)",
    "Reel URLs:",
    input.reelUrls.length ? input.reelUrls.join("\n") : "(none)",
  ].join("\n");

  try {
    const response = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.1,
    });

    const text =
      typeof response === "object" &&
      response !== null &&
      "response" in response
        ? String((response as { response?: string }).response ?? "")
        : JSON.stringify(response);

    const parsed = parseExtractionJson(text);
    if (parsed) {
      return parsed;
    }
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", msg: "ai_extraction_failed", err: String(err) }),
    );
  }

  return fallbackExtraction(input);
}