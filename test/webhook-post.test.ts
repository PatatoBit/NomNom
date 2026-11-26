import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Env } from "../src/env";
import {
  clearUsernameCacheForTests,
  handleWebhookPost,
  processWebhookPayload,
} from "../src/webhook-post";

const baseEnv: Env = {
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

beforeEach(() => {
  clearUsernameCacheForTests();
  vi.stubGlobal("fetch", mockFetch);
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
    const mooyoungLogs = logSpy.mock.calls.filter(
      (c) =>
        typeof c[0] === "string" &&
        c[0].includes('"type":"mooyoung_event"'),
    );
    expect(mooyoungLogs).toHaveLength(0);
    logSpy.mockRestore();
  });

  it("processes allowlisted sender patato.jpeg", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "Patato.JPEG" }), {
        status: 200,
      }),
    );

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "sender-2" },
              timestamp: 1,
              message: { mid: "m2", text: "reel please" },
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
});

describe("forwarding", () => {
  it("standalone mode logs without forward fetch", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ username: "youthkid9048" }), {
        status: 200,
      }),
    );

    const env: Env = { ...baseEnv };
    delete env.FORWARD_WEBHOOK_URL;

    const payload = {
      entry: [
        {
          messaging: [
            {
              sender: { id: "s3" },
              message: { mid: "m3", text: "solo" },
            },
          ],
        },
      ],
    };

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await processWebhookPayload(env, payload);
    expect(mockFetch).toHaveBeenCalledTimes(1);
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
              message: { mid: "m4", text: "forward me" },
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
              message: { mid: "m5", text: "custom header" },
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