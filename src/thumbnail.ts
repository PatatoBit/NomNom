const IG_HOST_RE = /(^|\.)instagram\.com$/i;

// Instagram only includes og:image for mobile / crawler user agents.
const PAGE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IMAGE_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export function isInstagramPermalink(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }
    if (!IG_HOST_RE.test(url.hostname)) {
      return false;
    }
    return /\/(reel|reels|p|tv)\//i.test(url.pathname);
  } catch {
    return false;
  }
}

export function extractMetaImageUrl(html: string): string | null {
  const patterns = [
    /property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+name=["']twitter:image["']/i,
    // Instagram often embeds these in bootstrapped JSON when meta tags are stripped.
    /"display_url"\s*:\s*"(https:\\\/\\\/[^"]+)"/i,
    /"thumbnail_src"\s*:\s*"(https:\\\/\\\/[^"]+)"/i,
    /"thumbnail_url"\s*:\s*"(https:\\\/\\\/[^"]+)"/i,
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match?.[1]) {
      const raw = match[1].trim();
      const unescaped = raw.includes("\\/")
        ? raw.replace(/\\u0026/g, "&").replace(/\\\//g, "/")
        : raw;
      return decodeHtmlEntities(unescaped);
    }
  }
  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageCandidate(raw: string): string | null {
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function resolveViaOEmbed(
  permalink: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const endpoint = new URL("https://graph.facebook.com/v27.0/instagram_oembed");
  endpoint.searchParams.set("url", permalink);
  endpoint.searchParams.set("access_token", accessToken);
  endpoint.searchParams.set("omitscript", "true");
  try {
    const response = await fetch(endpoint.toString(), { signal });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { thumbnail_url?: string };
    if (typeof data.thumbnail_url === "string" && data.thumbnail_url) {
      return normalizeImageCandidate(data.thumbnail_url);
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveInstagramThumbnailUrl(
  permalink: string,
  options: { signal?: AbortSignal; accessToken?: string } = {},
): Promise<string | null> {
  if (!isInstagramPermalink(permalink)) {
    return null;
  }

  const { signal, accessToken } = options;

  if (accessToken?.trim()) {
    const fromOEmbed = await resolveViaOEmbed(
      permalink,
      accessToken.trim(),
      signal,
    );
    if (fromOEmbed) {
      return fromOEmbed;
    }
  }

  const response = await fetch(permalink, {
    signal,
    redirect: "follow",
    headers: {
      "User-Agent": PAGE_UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) {
    return null;
  }
  const html = await response.text();
  const imageUrl = extractMetaImageUrl(html);
  if (!imageUrl) {
    return null;
  }
  return normalizeImageCandidate(imageUrl);
}

export async function fetchReelThumbnail(
  permalink: string,
  requestUrl: string,
  accessToken?: string,
): Promise<Response> {
  if (!isInstagramPermalink(permalink)) {
    return new Response("Invalid Instagram URL", { status: 400 });
  }

  const cacheKey = new Request(new URL(requestUrl).toString(), {
    method: "GET",
  });
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      return cached;
    }
  } catch {
    // Cache API may be unavailable in some test runtimes.
  }

  try {
    const imageUrl = await resolveInstagramThumbnailUrl(permalink, {
      accessToken,
    });
    if (!imageUrl) {
      return new Response("Thumbnail not found", { status: 404 });
    }

    const imageRes = await fetch(imageUrl, {
      headers: {
        "User-Agent": IMAGE_UA,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.instagram.com/",
      },
    });
    if (!imageRes.ok) {
      return new Response("Upstream thumbnail failed", { status: 502 });
    }

    const contentType = imageRes.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return new Response("Upstream was not an image", { status: 502 });
    }

    const body = await imageRes.arrayBuffer();
    const response = new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
    try {
      await caches.default.put(cacheKey, response.clone());
    } catch {
      // Cache write can fail in some runtimes; still return the image.
    }
    return response;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "reel_thumbnail_failed",
        err: String(err),
      }),
    );
    return new Response("Thumbnail fetch error", { status: 502 });
  }
}
