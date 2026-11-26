import { describe, expect, it } from "vitest";
import { buildGoogleMapsSearchUrl, isBangkokLatLng } from "../src/geocode";

describe("geocode helpers", () => {
  it("builds Google Maps search URL", () => {
    const url = buildGoogleMapsSearchUrl("Tora Ramen", "Phra Khanong");
    expect(url).toContain("google.com/maps/search");
    expect(url).toContain(encodeURIComponent("Tora Ramen"));
  });

  it("detects Bangkok coordinates", () => {
    expect(isBangkokLatLng(13.75, 100.5)).toBe(true);
    expect(isBangkokLatLng(34.68, 135.5)).toBe(false);
  });
});