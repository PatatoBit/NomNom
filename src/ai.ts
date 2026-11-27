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

const EXTRACTION_PROMPT = `You extract restaurant and food information from Instagram DM / reel captions about food.
Captions may be Thai, English, Japanese, Korean, or mixed, with emojis and hashtags.
Reply with ONLY valid JSON, no markdown, matching this schema:
{
  "kind": "place" | "food" | "both" | "unclear" | "non_food",
  "place": { "name", "area", "city", "cuisine", "price_level", "notes" } or null,
  "food": { "name", "category": "Dish to try" | "Recipe", "cuisine", "restaurant_name", "notes" } or null
}
Rules:
- Prefer classifying food content over "unclear". This list is for restaurants and dishes.
- Use a short clean name (first line of the caption, without hashtags/emojis when possible).
- Dish / recipe / cooking / menu / street food / cafe food → kind "food".
- Restaurant / cafe / buffet / named venue → kind "place".
- category must be exactly "Dish to try" or "Recipe".
- Never invent ratings, prices in numbers, or map URLs.
- Leave unknown fields out or use null.
- Only use "non_food" when clearly unrelated to eating out or cooking.
- Use "unclear" only when there is truly no food or place signal at all.
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
  if (result.place?.name) {
    result.place.name = cleanCandidateName(result.place.name) || result.place.name;
  }
  if (result.food?.name) {
    result.food.name = cleanCandidateName(result.food.name) || result.food.name;
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

/** Shorten Instagram captions into a usable place/food name. */
export function cleanCandidateName(raw: string): string | undefined {
  let text = raw.replace(/\r/g, "").trim();
  if (!text) {
    return undefined;
  }
  text = text.split("\n").map((l) => l.trim()).find(Boolean) ?? text;
  text = text
    .replace(/#[^\s#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Drop trailing emoji-heavy flourishes but keep CJK / Thai letters.
  text = text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/gu, " ").replace(/\s+/g, " ").trim();
  if (text.length > 80) {
    text = text.slice(0, 80).trim();
  }
  return text.length > 1 ? text : undefined;
}

const PLACE_HINT_RE =
  /(restaurant|ramen|tonkatsu|cafe|café|porridge|shabu|buffet|@central|dotonbori|cantina|izakaya|bistro|eatery|ร้าน|คาเฟ่|บุฟเฟ่ต์)/i;

const RECIPE_HINT_RE =
  /(recipe|cook at home|5-minute|instant noodle|easy dinner|easy recipe|เมนูง่าย|สูตร|ทำกิน|how to make|cooking)/i;

const FOOD_HINT_RE =
  /(food|dish|menu|noodle|pasta|ramen|sushi|tuna|beef|pork|chicken|dessert|street food|มาม่า|ต้มยำ|อร่อย|เมนู|อาหาร|กิน|ราเมน|ข้าว|หมี่|ก๋วยเตี๋ยว|#food|#recipe|#อร่อย|#เมนู)/i;

function extractionHasOutcome(result: ExtractionResult): boolean {
  if (result.kind === "place" || result.kind === "both") {
    return Boolean(result.place?.name?.trim());
  }
  if (result.kind === "food") {
    return Boolean(result.food?.name?.trim());
  }
  return false;
}

export function fallbackExtraction(input: {
  text?: string;
  reelTitles: string[];
  reelUrls: string[];
}): ExtractionResult {
  const blob = [input.text ?? "", ...input.reelTitles, ...input.reelUrls]
    .filter(Boolean)
    .join("\n");
  if (!blob.trim()) {
    return { kind: "unclear" };
  }

  const candidate =
    cleanCandidateName(input.reelTitles[0] ?? "") ||
    cleanCandidateName(input.text ?? "") ||
    cleanCandidateName(blob.split("\n")[0] ?? "");

  const looksLikePrank = /textprank|prank|meme|outfit|travel vlog/i.test(blob);
  const restaurantHints = PLACE_HINT_RE.test(blob);
  const recipeHints = RECIPE_HINT_RE.test(blob);
  const foodHints = FOOD_HINT_RE.test(blob) || recipeHints;

  if (looksLikePrank && !recipeHints) {
    return { kind: "unclear" };
  }

  if (restaurantHints && !recipeHints && candidate) {
    return {
      kind: "place",
      place: { name: candidate, notes: input.text?.slice(0, 500) },
    };
  }

  if ((recipeHints || foodHints) && candidate) {
    return {
      kind: "food",
      food: {
        name: candidate,
        category: recipeHints ? "Recipe" : "Dish to try",
        notes: input.text,
      },
    };
  }

  // Nom Nom inbox is food-first: a substantive Instagram reel title
  // (not a short DM like "lol") is worth saving as a dish to try.
  const reelTitleName = cleanCandidateName(input.reelTitles[0] ?? "");
  if (reelTitleName && reelTitleName.length >= 8 && !looksLikePrank) {
    return {
      kind: "food",
      food: {
        name: reelTitleName,
        category: "Dish to try",
        notes: input.text,
      },
    };
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

  let aiResult: ExtractionResult | null = null;

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

    aiResult = parseExtractionJson(text);
    if (aiResult && extractionHasOutcome(aiResult)) {
      return aiResult;
    }
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", msg: "ai_extraction_failed", err: String(err) }),
    );
  }

  const fallback = fallbackExtraction(input);
  if (extractionHasOutcome(fallback)) {
    return fallback;
  }

  return aiResult ?? fallback;
}
