import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const TEST_VERIFY_TOKEN = "test_verify_token";

describe("MooYoung worker", () => {
  it("GET / returns HTML app", async () => {
    const response = await SELF.fetch("https://example.com/");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("MooYoung");
    expect(html).toContain("Miyu &amp; Pat");
    expect(html).toContain('const CARTO_API_KEY = "test_carto_api_key"');
    expect(html).toContain(".png?key=' + encodeURIComponent(CARTO_API_KEY)");
    expect(html).not.toContain("?api_key=");
    expect(response.headers.get("Content-Type")).toContain("text/html");
  });

  it("GET /webhook returns 403 without valid token in dev", async () => {
    const response = await SELF.fetch(
      "https://example.com/webhook?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=x",
    );
    expect(response.status).toBe(403);
  });

  it("GET /webhook challenge when token matches env", async () => {
    const response = await SELF.fetch(
      `https://example.com/webhook?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(TEST_VERIFY_TOKEN)}&hub.challenge=chal42`,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("chal42");
  });
});