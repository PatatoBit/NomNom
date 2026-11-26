import type { Env } from "./env";

export type PlaceStatus = "want_to_go" | "visited";
export type FoodStatus = "want_to_go" | "tried";
export type AddedBy = "Pat" | "Miyu";
export type InboxResultStatus =
  | "added"
  | "duplicate"
  | "needs_review"
  | "ignored"
  | "error"
  | "processing";

export interface PlaceRow {
  id: number;
  name: string;
  area: string | null;
  city: string | null;
  cuisine: string | null;
  price_level: string | null;
  rating: string | null;
  maps_url: string | null;
  source_url: string | null;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  status: PlaceStatus;
  added_by: AddedBy | null;
  added_date: string | null;
  visit_date: string | null;
  visit_rating: string | null;
  visit_notes: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodRow {
  id: number;
  name: string;
  category: string | null;
  cuisine: string | null;
  restaurant_name: string | null;
  place_id: number | null;
  price: string | null;
  source_url: string | null;
  image_url: string | null;
  status: FoodStatus;
  added_by: AddedBy | null;
  added_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxRow {
  id: number;
  message_id: string;
  sender_id: string | null;
  sender_username: string | null;
  added_by: AddedBy | null;
  text: string | null;
  reels_json: string | null;
  attachments_json: string | null;
  extraction_json: string | null;
  result_status: InboxResultStatus;
  created_at: string;
}

export async function findPlaceByName(
  db: D1Database,
  name: string,
): Promise<PlaceRow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM places WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1`,
    )
    .bind(name)
    .first<PlaceRow>();
  return row ?? null;
}

export async function findFoodByName(
  db: D1Database,
  name: string,
): Promise<FoodRow | null> {
  const row = await db
    .prepare(
      `SELECT * FROM foods WHERE lower(trim(name)) = lower(trim(?)) LIMIT 1`,
    )
    .bind(name)
    .first<FoodRow>();
  return row ?? null;
}

export async function insertInboxIfNew(
  db: D1Database,
  data: {
    message_id: string;
    sender_id: string;
    sender_username: string;
    added_by: AddedBy;
    text?: string;
    reels_json: string;
    attachments_json: string;
  },
): Promise<{ inserted: boolean; id: number | null }> {
  const existing = await db
    .prepare(`SELECT id FROM inbox_events WHERE message_id = ?`)
    .bind(data.message_id)
    .first<{ id: number }>();
  if (existing) {
    return { inserted: false, id: existing.id };
  }
  const result = await db
    .prepare(
      `INSERT INTO inbox_events (
        message_id, sender_id, sender_username, added_by, text,
        reels_json, attachments_json, result_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')`,
    )
    .bind(
      data.message_id,
      data.sender_id,
      data.sender_username,
      data.added_by,
      data.text ?? null,
      data.reels_json,
      data.attachments_json,
    )
    .run();
  return { inserted: true, id: Number(result.meta.last_row_id) };
}

export async function updateInboxEvent(
  db: D1Database,
  id: number,
  patch: {
    extraction_json?: string;
    result_status?: InboxResultStatus;
  },
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.extraction_json !== undefined) {
    sets.push("extraction_json = ?");
    values.push(patch.extraction_json);
  }
  if (patch.result_status !== undefined) {
    sets.push("result_status = ?");
    values.push(patch.result_status);
  }
  if (sets.length === 0) {
    return;
  }
  values.push(id);
  await db
    .prepare(`UPDATE inbox_events SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function insertPlace(
  db: D1Database,
  data: Omit<PlaceRow, "id" | "created_at" | "updated_at">,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO places (
        name, area, city, cuisine, price_level, rating, maps_url, source_url,
        image_url, lat, lng, status, added_by, added_date, visit_date,
        visit_rating, visit_notes, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      data.name,
      data.area,
      data.city,
      data.cuisine,
      data.price_level,
      data.rating,
      data.maps_url,
      data.source_url,
      data.image_url,
      data.lat,
      data.lng,
      data.status,
      data.added_by,
      data.added_date,
      data.visit_date,
      data.visit_rating,
      data.visit_notes,
      data.notes,
    )
    .run();
  return Number(result.meta.last_row_id);
}

export async function insertFood(
  db: D1Database,
  data: Omit<FoodRow, "id" | "created_at" | "updated_at">,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO foods (
        name, category, cuisine, restaurant_name, place_id, price, source_url,
        image_url, status, added_by, added_date, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .bind(
      data.name,
      data.category,
      data.cuisine,
      data.restaurant_name,
      data.place_id,
      data.price,
      data.source_url,
      data.image_url,
      data.status,
      data.added_by,
      data.added_date,
      data.notes,
    )
    .run();
  return Number(result.meta.last_row_id);
}

export async function listPlaces(db: D1Database): Promise<PlaceRow[]> {
  const { results } = await db
    .prepare(`SELECT * FROM places ORDER BY id ASC`)
    .all<PlaceRow>();
  return results ?? [];
}

export async function listFoods(db: D1Database): Promise<FoodRow[]> {
  const { results } = await db
    .prepare(`SELECT * FROM foods ORDER BY id ASC`)
    .all<FoodRow>();
  return results ?? [];
}

export async function listInbox(db: D1Database): Promise<InboxRow[]> {
  const { results } = await db
    .prepare(`SELECT * FROM inbox_events ORDER BY id DESC LIMIT 100`)
    .all<InboxRow>();
  return results ?? [];
}

export async function countInboxNeedsReview(db: D1Database): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) as c FROM inbox_events WHERE result_status = 'needs_review'`,
    )
    .first<{ c: number }>();
  return row?.c ?? 0;
}

export interface InboxProcessingRow {
  id: number;
  sender_username: string | null;
  created_at: string;
}

export interface InboxPollMeta {
  processing_count: number;
  latest_inbox_id: number | null;
  latest_created_at: string | null;
  place_count: number;
  food_count: number;
  needs_review_count: number;
  processing: InboxProcessingRow[];
}

export async function getInboxPollMeta(db: D1Database): Promise<InboxPollMeta> {
  const summary = await db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM inbox_events WHERE result_status = 'processing') AS processing_count,
        (SELECT MAX(id) FROM inbox_events) AS latest_inbox_id,
        (SELECT created_at FROM inbox_events ORDER BY id DESC LIMIT 1) AS latest_created_at,
        (SELECT COUNT(*) FROM places) AS place_count,
        (SELECT COUNT(*) FROM foods) AS food_count,
        (SELECT COUNT(*) FROM inbox_events WHERE result_status = 'needs_review') AS needs_review_count`,
    )
    .first<{
      processing_count: number;
      latest_inbox_id: number | null;
      latest_created_at: string | null;
      place_count: number;
      food_count: number;
      needs_review_count: number;
    }>();

  const { results } = await db
    .prepare(
      `SELECT id, sender_username, created_at
       FROM inbox_events
       WHERE result_status = 'processing'
       ORDER BY id DESC
       LIMIT 10`,
    )
    .all<InboxProcessingRow>();

  return {
    processing_count: summary?.processing_count ?? 0,
    latest_inbox_id: summary?.latest_inbox_id ?? null,
    latest_created_at: summary?.latest_created_at ?? null,
    place_count: summary?.place_count ?? 0,
    food_count: summary?.food_count ?? 0,
    needs_review_count: summary?.needs_review_count ?? 0,
    processing: results ?? [],
  };
}

export async function getPlace(db: D1Database, id: number): Promise<PlaceRow | null> {
  return (
    (await db.prepare(`SELECT * FROM places WHERE id = ?`).bind(id).first<PlaceRow>()) ??
    null
  );
}

export async function getFood(db: D1Database, id: number): Promise<FoodRow | null> {
  return (
    (await db.prepare(`SELECT * FROM foods WHERE id = ?`).bind(id).first<FoodRow>()) ??
    null
  );
}

export async function deletePlace(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM places WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function deleteFood(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM foods WHERE id = ?`).bind(id).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function patchPlace(
  db: D1Database,
  id: number,
  fields: Record<string, unknown>,
): Promise<PlaceRow | null> {
  const allowed = new Set([
    "name",
    "area",
    "city",
    "cuisine",
    "price_level",
    "rating",
    "maps_url",
    "source_url",
    "image_url",
    "lat",
    "lng",
    "status",
    "added_by",
    "added_date",
    "visit_date",
    "visit_rating",
    "visit_notes",
    "notes",
  ]);
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (!allowed.has(key)) {
      continue;
    }
    sets.push(`${key} = ?`);
    values.push(val);
  }
  if (sets.length === 1) {
    return getPlace(db, id);
  }
  values.push(id);
  await db
    .prepare(`UPDATE places SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  return getPlace(db, id);
}

export async function patchFood(
  db: D1Database,
  id: number,
  fields: Record<string, unknown>,
): Promise<FoodRow | null> {
  const allowed = new Set([
    "name",
    "category",
    "cuisine",
    "restaurant_name",
    "place_id",
    "price",
    "source_url",
    "image_url",
    "status",
    "added_by",
    "added_date",
    "notes",
  ]);
  const sets: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];
  for (const [key, val] of Object.entries(fields)) {
    if (!allowed.has(key)) {
      continue;
    }
    sets.push(`${key} = ?`);
    values.push(val);
  }
  if (sets.length === 1) {
    return getFood(db, id);
  }
  values.push(id);
  await db
    .prepare(`UPDATE foods SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
  return getFood(db, id);
}

export async function getInbox(db: D1Database, id: number): Promise<InboxRow | null> {
  return (
    (await db
      .prepare(`SELECT * FROM inbox_events WHERE id = ?`)
      .bind(id)
      .first<InboxRow>()) ?? null
  );
}