import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_INSTAGRAM_GRAPH_BASE_URL,
  lookupInstagramUsername,
  sendMooyoungSavedReply,
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

describe("sendMooyoungSavedReply", () => {
  it("posts saved reply with reply_to and Bearer auth", async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await sendMooyoungSavedReply({
      recipientIgId: "bot-ig-1",
      senderIgsid: "sender-igsid",
      messageId: "mid-reply-1",
      accessToken: "ig_token",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://graph.facebook.com/v27.0/bot-ig-1/messages",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer ig_token");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      recipient: { id: "sender-igsid" },
      message: { text: "เซฟให้แล้วงับ" },
      reply_to: { mid: "mid-reply-1" },
    });
    const sentLog = logSpy.mock.calls.find(
      (c) =>
        typeof c[0] === "string" && c[0].includes('"msg":"mooyoung_reply_sent"'),
    );
    expect(sentLog).toBeDefined();
    logSpy.mockRestore();
  });

  it("retries without reply_to when Meta rejects reply_to", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("bad reply_to", { status: 400 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.spyOn(console, "log").mockImplementation(() => {});

    await sendMooyoungSavedReply({
      recipientIgId: "bot-ig-2",
      senderIgsid: "s1",
      messageId: "m1",
      accessToken: "tok",
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (mockFetch.mock.calls[1][1] as RequestInit).body as string,
    );
    expect(secondBody.reply_to).toBeUndefined();
  });

  it("logs failure without throwing when send fails", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("error", { status: 500 }),
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      sendMooyoungSavedReply({
        recipientIgId: "bot",
        senderIgsid: "s",
        messageId: "m",
        accessToken: "tok",
      }),
    ).resolves.toBeUndefined();

    const failLog = errSpy.mock.calls.find(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"msg":"mooyoung_reply_failed"'),
    );
    expect(failLog).toBeDefined();
    errSpy.mockRestore();
  });

  it("skips send when access token or recipient id is missing", async () => {
    await sendMooyoungSavedReply({
      recipientIgId: "",
      senderIgsid: "s",
      messageId: "m",
      accessToken: "tok",
    });
    await sendMooyoungSavedReply({
      recipientIgId: "bot",
      senderIgsid: "s",
      messageId: "m",
      accessToken: "",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});