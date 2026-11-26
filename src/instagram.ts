export const DEFAULT_INSTAGRAM_GRAPH_BASE_URL =
  "https://graph.facebook.com/v27.0";

export const MOOYOUNG_SAVED_REPLY_TEXT = "เซฟให้แล้วงับ";

export interface SendMooyoungSavedReplyParams {
  recipientIgId: string;
  senderIgsid: string;
  messageId?: string;
  accessToken: string;
  graphBaseUrl?: string;
}

export async function sendMooyoungSavedReply(
  params: SendMooyoungSavedReplyParams,
): Promise<void> {
  const {
    recipientIgId,
    senderIgsid,
    messageId,
    accessToken,
    graphBaseUrl,
  } = params;

  if (!accessToken?.trim() || !recipientIgId?.trim()) {
    return;
  }

  const base = (graphBaseUrl ?? DEFAULT_INSTAGRAM_GRAPH_BASE_URL).replace(
    /\/$/,
    "",
  );
  const url = `${base}/${encodeURIComponent(recipientIgId)}/messages`;

  const buildBody = (withReplyTo: boolean): string => {
    const payload: {
      recipient: { id: string };
      message: { text: string };
      reply_to?: { mid: string };
    } = {
      recipient: { id: senderIgsid },
      message: { text: MOOYOUNG_SAVED_REPLY_TEXT },
    };
    if (
      withReplyTo &&
      typeof messageId === "string" &&
      messageId.trim().length > 0
    ) {
      payload.reply_to = { mid: messageId.trim() };
    }
    return JSON.stringify(payload);
  };

  const post = (body: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body,
    });

  try {
    const hasMid =
      typeof messageId === "string" && messageId.trim().length > 0;
    let response = await post(buildBody(hasMid));

    if (
      !response.ok &&
      hasMid &&
      response.status >= 400 &&
      response.status < 500
    ) {
      response = await post(buildBody(false));
    }

    if (response.ok) {
      console.log(
        JSON.stringify({
          level: "info",
          msg: "mooyoung_reply_sent",
          recipient_ig_id: recipientIgId,
          sender_igsid: senderIgsid,
          message_id: messageId ?? null,
        }),
      );
      return;
    }

    const errBody = await response.text();
    console.error(
      JSON.stringify({
        level: "error",
        msg: "mooyoung_reply_failed",
        recipient_ig_id: recipientIgId,
        sender_igsid: senderIgsid,
        message_id: messageId ?? null,
        status: response.status,
        body: errBody.slice(0, 500),
      }),
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "mooyoung_reply_failed",
        recipient_ig_id: recipientIgId,
        sender_igsid: senderIgsid,
        message_id: messageId ?? null,
        err: String(err),
      }),
    );
  }
}

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