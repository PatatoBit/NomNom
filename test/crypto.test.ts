import { describe, expect, it } from "vitest";
import { timingSafeEqual, verifyHubSignature256 } from "../src/crypto";

describe("verifyHubSignature256", () => {
  const secret = "test_app_secret";
  const body = '{"entry":[]}';

  async function sign(bodyText: string): Promise<string> {
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
      new TextEncoder().encode(bodyText),
    );
    const hex = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return `sha256=${hex}`;
  }

  it("accepts a valid signature", async () => {
    const header = await sign(body);
    await expect(verifyHubSignature256(body, header, secret)).resolves.toBe(
      true,
    );
  });

  it("rejects an invalid signature", async () => {
    const header = "sha256=" + "0".repeat(64);
    await expect(verifyHubSignature256(body, header, secret)).resolves.toBe(
      false,
    );
  });

  it("rejects a missing signature header", async () => {
    await expect(verifyHubSignature256(body, null, secret)).resolves.toBe(
      false,
    );
  });
});

describe("timingSafeEqual", () => {
  it("matches equal strings", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });

  it("rejects different strings", () => {
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "ab")).toBe(false);
  });
});