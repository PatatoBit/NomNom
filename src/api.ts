import {
  deleteFood,
  deletePlace,
  getFood,
  getInbox,
  getPlace,
  listFoods,
  getInboxPollMeta,
  listInbox,
  listPlaces,
  patchFood,
  patchPlace,
  insertFood,
  insertPlace,
  updateInboxEvent,
  type FoodRow,
  type PlaceRow,
} from "./db";
import type { Env } from "./env";
import { bangkokDateYmd } from "./env";
import { reprocessInboxEvent } from "./pipeline";
import { fetchReelThumbnail } from "./thumbnail";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function badRequest(msg: string): Response {
  return json({ error: msg }, 400);
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function sourceUrlFromInbox(row: {
  text: string | null;
  reels_json: string | null;
}): string | null {
  try {
    const reels = JSON.parse(row.reels_json || "[]") as { url?: string }[];
    const reelUrl = reels.find((r) => typeof r.url === "string" && r.url)?.url;
    if (reelUrl) {
      return reelUrl;
    }
  } catch {
    // ignore malformed JSON
  }
  if (row.text?.includes("http")) {
    const match = row.text.match(/https?:\/\/\S+/);
    return match?.[0] ?? null;
  }
  return null;
}

export async function handleApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/health" && request.method === "GET") {
    return json({ ok: true, service: "mooyoung" });
  }

  if (path === "/api/thumbnail" && request.method === "GET") {
    const target = url.searchParams.get("url")?.trim();
    if (!target) {
      return badRequest("url is required");
    }
    return fetchReelThumbnail(
      target,
      request.url,
      env.INSTAGRAM_ACCESS_TOKEN,
    );
  }

  if (path === "/api/places") {
    if (request.method === "GET") {
      const places = await listPlaces(env.DB);
      return json(places);
    }
    if (request.method === "POST") {
      const body = await readJson<Partial<PlaceRow>>(request);
      if (!body?.name?.trim()) {
        return badRequest("name is required");
      }
      const id = await insertPlace(env.DB, {
        name: body.name.trim(),
        area: body.area ?? null,
        city: body.city ?? null,
        cuisine: body.cuisine ?? null,
        price_level: body.price_level ?? null,
        rating: body.rating ?? null,
        maps_url: body.maps_url ?? null,
        source_url: body.source_url ?? null,
        image_url: body.image_url ?? null,
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        status: body.status === "visited" ? "visited" : "want_to_go",
        added_by: body.added_by === "Miyu" ? "Miyu" : body.added_by === "Pat" ? "Pat" : null,
        added_date: body.added_date ?? bangkokDateYmd(),
        visit_date: body.visit_date ?? null,
        visit_rating: body.visit_rating ?? null,
        visit_notes: body.visit_notes ?? null,
        notes: body.notes ?? null,
      });
      const place = await getPlace(env.DB, id);
      return json(place, 201);
    }
  }

  const placeMatch = path.match(/^\/api\/places\/(\d+)$/);
  if (placeMatch) {
    const id = Number(placeMatch[1]);
    if (request.method === "PATCH") {
      const body = await readJson<Record<string, unknown>>(request);
      if (!body) {
        return badRequest("invalid json");
      }
      const updated = await patchPlace(env.DB, id, body);
      if (!updated) {
        return json({ error: "not found" }, 404);
      }
      return json(updated);
    }
    if (request.method === "DELETE") {
      const ok = await deletePlace(env.DB, id);
      return ok ? json({ ok: true }) : json({ error: "not found" }, 404);
    }
  }

  if (path === "/api/foods") {
    if (request.method === "GET") {
      const foods = await listFoods(env.DB);
      return json(foods);
    }
    if (request.method === "POST") {
      const body = await readJson<Partial<FoodRow>>(request);
      if (!body?.name?.trim()) {
        return badRequest("name is required");
      }
      const id = await insertFood(env.DB, {
        name: body.name.trim(),
        category: body.category ?? null,
        cuisine: body.cuisine ?? null,
        restaurant_name: body.restaurant_name ?? null,
        place_id: body.place_id ?? null,
        price: body.price ?? null,
        source_url: body.source_url ?? null,
        image_url: body.image_url ?? null,
        status: body.status === "tried" ? "tried" : "want_to_go",
        added_by: body.added_by === "Miyu" ? "Miyu" : body.added_by === "Pat" ? "Pat" : null,
        added_date: body.added_date ?? bangkokDateYmd(),
        notes: body.notes ?? null,
      });
      const food = await getFood(env.DB, id);
      return json(food, 201);
    }
  }

  const foodMatch = path.match(/^\/api\/foods\/(\d+)$/);
  if (foodMatch) {
    const id = Number(foodMatch[1]);
    if (request.method === "PATCH") {
      const body = await readJson<Record<string, unknown>>(request);
      if (!body) {
        return badRequest("invalid json");
      }
      const updated = await patchFood(env.DB, id, body);
      if (!updated) {
        return json({ error: "not found" }, 404);
      }
      return json(updated);
    }
    if (request.method === "DELETE") {
      const ok = await deleteFood(env.DB, id);
      return ok ? json({ ok: true }) : json({ error: "not found" }, 404);
    }
  }

  if (path === "/api/inbox" && request.method === "GET") {
    if (url.searchParams.get("poll") === "1") {
      const meta = await getInboxPollMeta(env.DB);
      return json(meta);
    }
    const inbox = await listInbox(env.DB);
    return json(inbox);
  }

  const inboxMatch = path.match(/^\/api\/inbox\/(\d+)$/);
  if (inboxMatch && request.method === "PATCH") {
    const id = Number(inboxMatch[1]);
    const row = await getInbox(env.DB, id);
    if (!row) {
      return json({ error: "not found" }, 404);
    }
    if (row.result_status === "processing") {
      return json({ error: "still processing" }, 409);
    }
    const body = await readJson<{
      result_status?: string;
      reprocess?: boolean;
      promote_place?: Record<string, unknown>;
      promote_food?: Record<string, unknown>;
    }>(request);
    if (!body) {
      return badRequest("invalid json");
    }

    if (body.reprocess === true) {
      const status = await reprocessInboxEvent(env, id);
      if (status === null) {
        return json({ error: "cannot reprocess" }, 400);
      }
      if (status === "processing") {
        return json({ error: "still processing" }, 409);
      }
      const updated = await getInbox(env.DB, id);
      return json(updated);
    }

    const inboxSourceUrl = sourceUrlFromInbox(row);

    if (body.promote_place && typeof body.promote_place === "object") {
      const p = body.promote_place;
      if (typeof p.name === "string" && p.name.trim()) {
        await insertPlace(env.DB, {
          name: p.name.trim(),
          area: (p.area as string) ?? null,
          city: (p.city as string) ?? null,
          cuisine: (p.cuisine as string) ?? null,
          price_level: (p.price_level as string) ?? null,
          rating: null,
          maps_url: (p.maps_url as string) ?? null,
          source_url: inboxSourceUrl,
          image_url: null,
          lat: typeof p.lat === "number" ? p.lat : null,
          lng: typeof p.lng === "number" ? p.lng : null,
          status: "want_to_go",
          added_by: row.added_by,
          added_date: bangkokDateYmd(),
          visit_date: null,
          visit_rating: null,
          visit_notes: null,
          notes: (p.notes as string) ?? row.text,
        });
      }
      await updateInboxEvent(env.DB, id, { result_status: "added" });
    } else if (body.promote_food && typeof body.promote_food === "object") {
      const f = body.promote_food;
      if (typeof f.name === "string" && f.name.trim()) {
        await insertFood(env.DB, {
          name: f.name.trim(),
          category: (f.category as string) ?? "Dish to try",
          cuisine: (f.cuisine as string) ?? null,
          restaurant_name: (f.restaurant_name as string) ?? null,
          place_id: typeof f.place_id === "number" ? f.place_id : null,
          price: null,
          source_url: inboxSourceUrl,
          image_url: null,
          status: "want_to_go",
          added_by: row.added_by,
          added_date: bangkokDateYmd(),
          notes: (f.notes as string) ?? row.text,
        });
      }
      await updateInboxEvent(env.DB, id, { result_status: "added" });
    } else if (body.result_status) {
      const allowed = new Set([
        "added",
        "duplicate",
        "needs_review",
        "ignored",
        "error",
      ]);
      if (allowed.has(body.result_status)) {
        await updateInboxEvent(env.DB, id, {
          result_status: body.result_status as
            | "added"
            | "duplicate"
            | "needs_review"
            | "ignored"
            | "error",
        });
      }
    }

    const updated = await getInbox(env.DB, id);
    return json(updated);
  }

  return null;
}