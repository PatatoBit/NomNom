import type { ExtractionResult } from "./ai";
import { runExtraction } from "./ai";
import {
  findFoodByName,
  findPlaceByName,
  insertFood,
  insertInboxIfNew,
  insertPlace,
  updateInboxEvent,
} from "./db";
import type { AddedBy, InboxResultStatus } from "./db";
import { bangkokDateYmd, type Env, usernameToAddedBy } from "./env";
import { buildGoogleMapsSearchUrl, geocodePlaceName } from "./geocode";
import { forwardEvent } from "./forward";
import { sendMooyoungSavedReply } from "./instagram";
import type { NormalizedMessageEvent } from "./types";

export interface ProcessNormalizedEventContext {
  recipientIgId?: string;
}

export async function processNormalizedEvent(
  env: Env,
  event: NormalizedMessageEvent,
  ctx?: ProcessNormalizedEventContext,
): Promise<void> {
  const addedBy = usernameToAddedBy(event.sender_username);
  if (!addedBy) {
    return;
  }

  const reelsJson = JSON.stringify(event.reels);
  const attachmentsJson = JSON.stringify(event.attachments);

  const inbox = await insertInboxIfNew(env.DB, {
    message_id: event.message_id,
    sender_id: event.sender_id,
    sender_username: event.sender_username,
    added_by: addedBy,
    text: event.text,
    reels_json: reelsJson,
    attachments_json: attachmentsJson,
  });

  if (!inbox.inserted) {
    await forwardEvent(env, event);
    return;
  }

  const reelTitles = event.reels
    .map((r) => r.title?.trim())
    .filter((t): t is string => Boolean(t));
  const reelUrls = event.reels.map((r) => r.url).filter(Boolean);
  const sourceUrl = reelUrls[0] ?? undefined;

  let resultStatus: InboxResultStatus = "needs_review";
  let extraction: ExtractionResult = { kind: "unclear" };

  try {
    extraction = await runExtraction(env, {
      text: event.text,
      reelTitles,
      reelUrls,
    });

    const outcomes: InboxResultStatus[] = [];

    if (
      (extraction.kind === "place" || extraction.kind === "both") &&
      extraction.place?.name
    ) {
      outcomes.push(
        await persistPlace(env, extraction.place, addedBy, sourceUrl),
      );
    }

    if (
      (extraction.kind === "food" || extraction.kind === "both") &&
      extraction.food?.name
    ) {
      outcomes.push(
        await persistFood(env, extraction.food, addedBy, sourceUrl),
      );
    }

    if (outcomes.includes("added")) {
      resultStatus = "added";
    } else if (outcomes.includes("duplicate")) {
      resultStatus = "duplicate";
    } else if (extraction.kind === "unclear" || extraction.kind === "non_food") {
      resultStatus = "needs_review";
    } else if (outcomes.length === 0) {
      resultStatus = "needs_review";
    } else {
      resultStatus = "duplicate";
    }
  } catch (err) {
    const errText = String(err);
    extraction = { kind: "unclear", pipeline_error: errText };
    resultStatus = "needs_review";
    console.error(
      JSON.stringify({
        level: "error",
        msg: "pipeline_error",
        message_id: event.message_id,
        err: errText,
      }),
    );
  }

  if (inbox.id != null) {
    try {
      await updateInboxEvent(env.DB, inbox.id, {
        extraction_json: JSON.stringify(extraction),
        result_status: resultStatus,
      });
    } catch (updateErr) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "inbox_finalize_failed",
          message_id: event.message_id,
          err: String(updateErr),
        }),
      );
      try {
        await updateInboxEvent(env.DB, inbox.id, {
          extraction_json: JSON.stringify({
            kind: "unclear",
            pipeline_error: String(updateErr),
          }),
          result_status: "error",
        });
      } catch {
        // best effort; row may remain processing until manual fix
      }
    }
  }

  console.log(
    JSON.stringify({
      type: "mooyoung_event",
      ...event,
      added_by: addedBy,
      result_status: resultStatus,
    }),
  );

  await forwardEvent(env, event);

  if (ctx?.recipientIgId) {
    await sendMooyoungSavedReply({
      recipientIgId: ctx.recipientIgId,
      senderIgsid: event.sender_id,
      messageId: event.message_id,
      accessToken: env.INSTAGRAM_ACCESS_TOKEN,
      graphBaseUrl: env.INSTAGRAM_GRAPH_BASE_URL,
    });
  }
}

async function persistPlace(
  env: Env,
  place: NonNullable<ExtractionResult["place"]>,
  addedBy: AddedBy,
  sourceUrl?: string,
): Promise<InboxResultStatus> {
  const name = place.name!.trim();
  const existing = await findPlaceByName(env.DB, name);
  if (existing) {
    return "duplicate";
  }

  let lat: number | null = null;
  let lng: number | null = null;
  const geo = await geocodePlaceName(name, place.area, place.city);
  if (geo) {
    lat = geo.lat;
    lng = geo.lng;
  }

  const mapsUrl = buildGoogleMapsSearchUrl(name, place.area);

  await insertPlace(env.DB, {
    name,
    area: place.area ?? null,
    city: place.city ?? null,
    cuisine: place.cuisine ?? null,
    price_level: place.price_level ?? null,
    rating: null,
    maps_url: mapsUrl,
    source_url: sourceUrl ?? null,
    image_url: null,
    lat,
    lng,
    status: "want_to_go",
    added_by: addedBy,
    added_date: bangkokDateYmd(),
    visit_date: null,
    visit_rating: null,
    visit_notes: null,
    notes: place.notes ?? null,
  });

  return "added";
}

async function persistFood(
  env: Env,
  food: NonNullable<ExtractionResult["food"]>,
  addedBy: AddedBy,
  sourceUrl?: string,
): Promise<InboxResultStatus> {
  const name = food.name!.trim();
  const existing = await findFoodByName(env.DB, name);
  if (existing) {
    return "duplicate";
  }

  let placeId: number | null = null;
  if (food.restaurant_name) {
    const linked = await findPlaceByName(env.DB, food.restaurant_name);
    placeId = linked?.id ?? null;
  }

  await insertFood(env.DB, {
    name,
    category: food.category ?? "Dish to try",
    cuisine: food.cuisine ?? null,
    restaurant_name: food.restaurant_name ?? null,
    place_id: placeId,
    price: null,
    source_url: sourceUrl ?? null,
    image_url: null,
    status: "want_to_go",
    added_by: addedBy,
    added_date: bangkokDateYmd(),
    notes: food.notes ?? null,
  });

  return "added";
}