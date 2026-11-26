import { describe, expect, it } from "vitest";
import {
  DEFAULT_ALLOWED_USERNAMES,
  isUsernameAllowed,
  parseAllowedUsernames,
} from "../src/env";

describe("allowlist", () => {
  it("defaults to patato.jpeg and youthkid9048", () => {
    const allowed = parseAllowedUsernames(undefined);
    expect(allowed.has("patato.jpeg")).toBe(true);
    expect(allowed.has("youthkid9048")).toBe(true);
    expect(DEFAULT_ALLOWED_USERNAMES).toContain("patato.jpeg");
  });

  it("is case-insensitive and trims @", () => {
    const allowed = parseAllowedUsernames("@Patato.JPEG,  youthkid9048 ");
    expect(isUsernameAllowed("PATATO.jpeg", allowed)).toBe(true);
    expect(isUsernameAllowed("@youthkid9048", allowed)).toBe(true);
    expect(isUsernameAllowed("stranger", allowed)).toBe(false);
  });
});