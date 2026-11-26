import { describe, expect, it } from "vitest";
import { handleWebhookVerification } from "../src/webhook-get";
import type { Env } from "../src/env";

const env: Env = {
  WEBHOOK_VERIFY_TOKEN: "my_verify_token",
  INSTAGRAM_APP_SECRET: "secret",
  INSTAGRAM_ACCESS_TOKEN: "token",
};

function verificationUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  return `https://example.com/webhook?${search.toString()}`;
}

describe("GET /webhook verification", () => {
  it("returns challenge for valid subscribe handshake", async () => {
    const request = new Request(
      verificationUrl({
        "hub.mode": "subscribe",
        "hub.verify_token": "my_verify_token",
        "hub.challenge": "1234567890",
      }),
    );
    const response = handleWebhookVerification(request, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(await response.text()).toBe("1234567890");
  });

  it("returns 403 for wrong verify token", async () => {
    const request = new Request(
      verificationUrl({
        "hub.mode": "subscribe",
        "hub.verify_token": "wrong",
        "hub.challenge": "1234567890",
      }),
    );
    const response = handleWebhookVerification(request, env);
    expect(response.status).toBe(403);
  });

  it("returns 403 for wrong hub.mode", async () => {
    const request = new Request(
      verificationUrl({
        "hub.mode": "unsubscribe",
        "hub.verify_token": "my_verify_token",
        "hub.challenge": "1234567890",
      }),
    );
    const response = handleWebhookVerification(request, env);
    expect(response.status).toBe(403);
  });
});