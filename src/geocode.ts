export interface LatLng {
  lat: number;
  lng: number;
}

export function buildGoogleMapsSearchUrl(
  name: string,
  area?: string | null,
): string {
  const q = [name, area].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export async function nominatimLookup(
  query: string,
  signal?: AbortSignal,
): Promise<LatLng | null> {
  const url =
    "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({
      q: query,
      format: "json",
      limit: "1",
    }).toString();

  try {
    const response = await fetch(url, {
      signal,
      headers: {
        "User-Agent": "MooYoung/1.0 (mooyoung.chayapat.me)",
        Accept: "application/json",
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { lat?: string; lon?: string }[];
    if (!data?.length) {
      return null;
    }
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  } catch {
    return null;
  }
}

export async function geocodePlaceName(
  name: string,
  area?: string | null,
  city?: string | null,
): Promise<LatLng | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const q = [name, area, city].filter(Boolean).join(", ");
    return await nominatimLookup(q, controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

export function isBangkokLatLng(lat: number, lng: number): boolean {
  return lat > 13 && lat < 15 && lng > 99.5 && lng < 101.5;
}