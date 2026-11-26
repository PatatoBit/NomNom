import { SELF } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractMetaImageUrl,
  isInstagramPermalink,
} from "../src/thumbnail";

describe("isInstagramPermalink", () => {
  it("accepts reel and post URLs", () => {
    expect(
      isInstagramPermalink("https://www.instagram.com/reel/DeLsYojR_Ce/"),
    ).toBe(true);
    expect(
      isInstagramPermalink("https://instagram.com/reels/ABC123"),
    ).toBe(true);
    expect(isInstagramPermalink("https://www.instagram.com/p/XYZ/")).toBe(
      true,
    );
  });

  it("rejects non-instagram and non-media URLs", () => {
    expect(isInstagramPermalink("https://example.com/reel/abc")).toBe(false);
    expect(
      isInstagramPermalink("https://www.instagram.com/ploy__is_cooking/"),
    ).toBe(false);
    expect(isInstagramPermalink("not a url")).toBe(false);
  });
});

describe("extractMetaImageUrl", () => {
  it("reads og:image with HTML entities", () => {
    const html =
      '<meta property="og:image" content="https://cdn.example/img.jpg?a=1&amp;b=2" />';
    expect(extractMetaImageUrl(html)).toBe(
      "https://cdn.example/img.jpg?a=1&b=2",
    );
  });

  it("reads twitter:image fallback", () => {
    const html =
      '<meta name="twitter:image" content="https://cdn.example/tw.jpg" />';
    expect(extractMetaImageUrl(html)).toBe("https://cdn.example/tw.jpg");
  });

  it("reads display_url from embedded JSON", () => {
    const html =
      '{"display_url":"https:\\/\\/cdn.example\\/photo.jpg?a=1\\u0026b=2"}';
    expect(extractMetaImageUrl(html)).toBe(
      "https://cdn.example/photo.jpg?a=1&b=2",
    );
  });
});

describe("GET /api/thumbnail", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires url", async () => {
    const res = await SELF.fetch("https://example.com/api/thumbnail");
    expect(res.status).toBe(400);
  });

  it("rejects non-instagram urls", async () => {
    const res = await SELF.fetch(
      "https://example.com/api/thumbnail?url=" +
        encodeURIComponent("https://example.com/x"),
    );
    expect(res.status).toBe(400);
  });

  it("proxies the reel og:image", async () => {
    const permalink = "https://www.instagram.com/reel/DeLsYojR_Ce/";
    const imageUrl = "https://cdn.example/thumb.jpg";
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("instagram_oembed")) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        if (url === permalink || url.startsWith(permalink)) {
          return new Response(
            `<html><head><meta property="og:image" content="${imageUrl}" /></head></html>`,
            { status: 200, headers: { "Content-Type": "text/html" } },
          );
        }
        if (url === imageUrl) {
          return new Response(jpeg, {
            status: 200,
            headers: { "Content-Type": "image/jpeg" },
          });
        }
        return new Response("unexpected " + url, { status: 500 });
      }),
    );

    const res = await SELF.fetch(
      "https://example.com/api/thumbnail?url=" + encodeURIComponent(permalink),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/image\/jpeg/);
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([...buf.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it("uses oEmbed thumbnail_url when the access token is available", async () => {
    const permalink = "https://www.instagram.com/reel/OEmbed1/";
    const imageUrl = "https://cdn.example/oembed.jpg";
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("instagram_oembed")) {
          expect(url).toContain("access_token=test-token");
          return new Response(
            JSON.stringify({ thumbnail_url: imageUrl }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url === imageUrl) {
          return new Response(jpeg, {
            status: 200,
            headers: { "Content-Type": "image/jpeg" },
          });
        }
        return new Response("unexpected " + url, { status: 500 });
      }),
    );

    const { fetchReelThumbnail } = await import("../src/thumbnail");
    const res = await fetchReelThumbnail(
      permalink,
      "https://example.com/api/thumbnail?url=" + encodeURIComponent(permalink),
      "test-token",
    );
    expect(res.status).toBe(200);
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([...buf.slice(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });
});
