export async function lookupInstagramUsername(
  senderId: string,
  accessToken: string,
): Promise<string | null> {
  const url = `https://graph.instagram.com/v22.0/${encodeURIComponent(senderId)}?fields=username`;
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