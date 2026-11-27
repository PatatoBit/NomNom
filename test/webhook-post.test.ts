import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { env as workerEnv } from "cloudflare:test";
import type { Env } from "../src/env";
import {
  clearUsernameCacheForTests,
  handleWebhookPost,
  processWebhookPayload,
} from "../src/webhook-post";

const baseEnv: Env = {
  ...(workerEnv as unknown as Env),
  WEBHOOK_VERIFY_TOKEN: "verify",
  INSTAGRAM_APP_SECRET: "test_app_secret",
  INSTAGRAM_ACCESS_TOKEN: "ig_token",
  ALLOWED_USERNAMES: "patato.jpeg,youthkid9048",
};

async function signBody(body: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );
  const hex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

const mockFetch = vi.fn();

function reelAttachment(url = "https://www.instagram.com/reel/TESTREEL1/") {
  return {
    type: "ig_reel",
    payload: { url, title: "Test reel" },
  };
}

beforeEach(() => {
  clearUsernameCacheForTests();
  vi.stubGlobal("fetch", mockFetch);
  baseEnv.AI = {
    run: vi.fn().mockResolvedValue({
      response: JSON.stringify({ kind: "unclear" }),
    }),
  } as unknown as Ai;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /webhook signature", () => {
  it("returns 401 when signature is missing", async () => {
    const body = "{}";
    const request = new Request("https://example.com/webhook", {
      method: "POST",
      body,
    });
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    const response = await handleWebhookPost(request, baseEnv, ctx);
    expect(response.status).toBe(401);
  });

  it("returns 401 when signature is invalid", async () => {
    const body = '{"entry":[]}';
    const request = new Request("https://example.com/webhook", {
      method: "POST",
      headers: { "X-Hub-Signature-256": "sha256=" + "f".repeat(64) },
      body,
    });
    const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;
    const response = await handleWebhookPost(request, baseEnv, ctx);
    expect(response.status).toBe(401);
  });

  it("returns 200 immediately with valid signature", async () => {
    const body = JSON.stringify({ entry: [{ messaging: [] }] });
    const sig = await signBody(body, baseEnv.INSTAGRAM_APP_SECRET);
    const waitUntil = vi.fn();
    const ctx = { waitUntil } as unknown as ExecutionContext;
    const request = new Request("https://example.com/webhook", {
      method: "POST",
      headers: { "X-Hub-Signature-256": sig },
      body,
    });
    const response = await handleWebhookPost(request, baseEnv, ctx);
    expect(response.status).toBe(200);
    expect(waitUntil).toHaveBeenCalledOnce();
  });
});

describe("sender lookup and allowlist", () => {
  it("ignores senders not on the allowlist", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "not_allowed_user" }), {
        status: 200,
      }),
    );

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "sender-1" },
              timestamp: 1,
              message: { mid: "m1", text: "hello" },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);
    expect(mockFetch).toHaveBeenCalledOnce();
    const lookupUrl = String(mockFetch.mock.calls[0][0]);
    expect(lookupUrl).toBe(
      "https://graph.facebook.com/v27.0/sender-1?fields=username",
    );
    logSpy.mockRestore();
  });

  it("processes allowlisted sender patato.jpeg", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "Patato.JPEG" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "sender-2" },
              timestamp: 1,
              message: {
                mid: "m2-unique-" + Date.now(),
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);
    const lookupUrl = String(mockFetch.mock.calls[0][0]);
    expect(lookupUrl).toBe(
      "https://graph.facebook.com/v27.0/sender-2?fields=username",
    );
    const mooyoungLogs = logSpy.mock.calls.filter(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"type":"mooyoung_event"'),
    );
    expect(mooyoungLogs).toHaveLength(1);
    const parsed = JSON.parse(mooyoungLogs[0][0] as string);
    expect(parsed.sender_username).toBe("Patato.JPEG");
    logSpy.mockRestore();
  });

  it("ignores plain text DMs with no reel", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "patato.jpeg" }), {
        status: 200,
      }),
    );

    const mid = "m-plain-" + Date.now();
    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "sender-plain" },
              recipient: { id: "bot-1" },
              message: { mid, text: "just saying hi" },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    const mooyoungLogs = logSpy.mock.calls.filter(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"type":"mooyoung_event"'),
    );
    expect(mooyoungLogs).toHaveLength(0);

    const replyCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes("/messages"),
    );
    expect(replyCalls).toHaveLength(0);

    const row = await baseEnv.DB.prepare(
      `SELECT id FROM inbox_events WHERE message_id = ?`,
    )
      .bind(mid)
      .first();
    expect(row).toBeNull();
    logSpy.mockRestore();
  });
});

describe("forwarding", () => {
  it("standalone mode logs without forward fetch", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "youthkid9048" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const env: Env = { ...baseEnv };
    delete env.FORWARD_WEBHOOK_URL;

    const payload = {
      entry: [
        {
          id: "solo-bot-id",
          messaging: [
            {
              sender: { id: "s3" },
              recipient: { id: "solo-bot-id" },
              message: {
                mid: "m3-" + Date.now(),
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(env, payload);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const forwardCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes("hooks"),
    );
    expect(forwardCalls).toHaveLength(0);
    logSpy.mockRestore();
  });

  it("forwards with default Authorization header when secret set", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "youthkid9048" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const env: Env = {
      ...baseEnv,
      FORWARD_WEBHOOK_URL: "https://example.com/hooks/mooyoung",
      FORWARD_WEBHOOK_SECRET: "forward-secret",
    };

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "s4" },
              message: {
                mid: "m4-" + Date.now(),
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(env, payload);

    const forwardCall = mockFetch.mock.calls.find((c) =>
      String(c[0]).includes("hooks/mooyoung"),
    );
    expect(forwardCall).toBeDefined();
    const init = forwardCall![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer forward-secret");
  });

  it("forwards with custom header when FORWARD_WEBHOOK_HEADER is set", async () => {
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "patato.jpeg" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const env: Env = {
      ...baseEnv,
      FORWARD_WEBHOOK_URL: "https://example.com/hooks/mooyoung",
      FORWARD_WEBHOOK_SECRET: "s",
      FORWARD_WEBHOOK_HEADER: "X-MooYoung-Secret",
    };

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "s5" },
              message: {
                mid: "m5-" + Date.now(),
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(env, payload);

    const forwardCall = mockFetch.mock.calls.find((c) =>
      String(c[0]).includes("hooks/mooyoung"),
    );
    const init = forwardCall![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-MooYoung-Secret"]).toBe("s");
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("saved DM reply", () => {
  it("sends saved reply after processing a new allowed reel DM", async () => {
    const mid = "m-reply-new-" + Date.now();
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "patato.jpeg" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const payload = {
      entry: [
        {
          id: "entry-page-id",
          messaging: [
            {
              sender: { id: "sender-igsid-42" },
              recipient: { id: "bot-recipient-99" },
              timestamp: 1,
              message: {
                mid,
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    const replyCall = mockFetch.mock.calls.find((c) =>
      String(c[0]).endsWith("/bot-recipient-99/messages"),
    );
    expect(replyCall).toBeDefined();
    const init = replyCall![1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer ig_token",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      recipient: { id: "sender-igsid-42" },
      message: { text: "เซฟให้แล้วงับ" },
      reply_to: { mid },
    });
    const sentLog = logSpy.mock.calls.find(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"msg":"mooyoung_reply_sent"'),
    );
    expect(sentLog).toBeDefined();
    logSpy.mockRestore();
  });

  it("does not send reply for plain text with no reel", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "patato.jpeg" }), {
        status: 200,
      }),
    );

    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "s-text" },
              recipient: { id: "bot-1" },
              message: { mid: "m-text-" + Date.now(), text: "save this place" },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    const replyCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes("/messages"),
    );
    expect(replyCalls).toHaveLength(0);
  });

  it("uses entry.id when recipient.id is missing", async () => {
    const mid = "m-entry-fallback-" + Date.now();
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "youthkid9048" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const payload = {
      entry: [
        {
          id: "entry-only-bot-id",
          messaging: [
            {
              sender: { id: "s-fallback" },
              timestamp: 1,
              message: {
                mid,
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    const replyCall = mockFetch.mock.calls.find((c) =>
      String(c[0]).endsWith("/entry-only-bot-id/messages"),
    );
    expect(replyCall).toBeDefined();
  });

  it("does not send reply on duplicate message_id", async () => {
    const mid = "m-duplicate-reply-" + Date.now();
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "patato.jpeg" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "s-dup" },
              recipient: { id: "bot-1" },
              message: {
                mid,
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    mockFetch.mockClear();
    mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));

    await processWebhookPayload(baseEnv, payload);

    const replyCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes("/messages"),
    );
    expect(replyCalls).toHaveLength(0);
  });

  it("does not send reply for echo messages", async () => {
    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "s-echo" },
              recipient: { id: "bot-1" },
              message: { mid: "echo-mid", text: "echo", is_echo: true },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not send reply for non-allowlisted sender", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "stranger" }), { status: 200 }),
    );

    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "s-stranger" },
              recipient: { id: "bot-1" },
              message: {
                mid: "m-stranger-" + Date.now(),
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(baseEnv, payload);

    const replyCalls = mockFetch.mock.calls.filter((c) =>
      String(c[0]).includes("/messages"),
    );
    expect(replyCalls).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("does not fail webhook when reply API errors", async () => {
    const mid = "m-reply-fail-" + Date.now();
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ username: "patato.jpeg" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response("nope", { status: 502 }));

    const payload = {
      entry: [
        {
          id: "bot-1",
          messaging: [
            {
              sender: { id: "s-err" },
              recipient: { id: "bot-1" },
              message: {
                mid,
                attachments: [reelAttachment()],
              },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(processWebhookPayload(baseEnv, payload)).resolves.toBeUndefined();

    const failLog = errSpy.mock.calls.find(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"msg":"mooyoung_reply_failed"'),
    );
    expect(failLog).toBeDefined();
    const mooyoungEvent = logSpy.mock.calls.find(
      (c) =>
        typeof c[0] === "string" && c[0].includes('"type":"mooyoung_event"'),
    );
    expect(mooyoungEvent).toBeDefined();
    logSpy.mockRestore();
    errSpy.mockRestore();
  });
});