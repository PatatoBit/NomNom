import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_INSTAGRAM_GRAPH_BASE_URL,
  lookupInstagramUsername,
} from "../src/instagram";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("lookupInstagramUsername", () => {
  it("calls graph.facebook.com/v27.0 by default", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "patato.jpeg" }), {
        status: 200,
      }),
    );

    const username = await lookupInstagramUsername("sender-99", "ig_token");
    expect(username).toBe("patato.jpeg");
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://graph.facebook.com/v27.0/sender-99?fields=username",
    );
    expect(DEFAULT_INSTAGRAM_GRAPH_BASE_URL).toBe(
      "https://graph.facebook.com/v27.0",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ig_token");
  });

  it("uses INSTAGRAM_GRAPH_BASE_URL override when provided", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "youthkid9048" }), {
        status: 200,
      }),
    );

    const customBase = "https://graph.facebook.com/v28.0";
    await lookupInstagramUsername("abc123", "token", customBase);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://graph.facebook.com/v28.0/abc123?fields=username",
    );
  });

  it("strips trailing slash from graph base URL override", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "u" }), { status: 200 }),
    );

    await lookupInstagramUsername(
      "id1",
      "token",
      "https://graph.facebook.com/v27.0/",
    );
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://graph.facebook.com/v27.0/id1?fields=username",
    );
  });
});