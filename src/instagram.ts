export const DEFAULT_INSTAGRAM_GRAPH_BASE_URL =
  "https://graph.facebook.com/v27.0";

export async function lookupInstagramUsername(
  senderId: string,
  accessToken: string,
  graphBaseUrl?: string,
): Promise<string | null> {
  const base = (graphBaseUrl ?? DEFAULT_INSTAGRAM_GRAPH_BASE_URL).replace(
    /\/$/,
    "",
  );
  const url = `${base}/${encodeURIComponent(senderId)}?fields=username`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "instagram_username_lookup_failed",
        sender_id: senderId,
        status: response.status,
      }),
    );
    return null;
  }
  const data = (await response.json()) as { username?: string };
  return data.username ?? null;
}