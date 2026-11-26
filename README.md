# MooYoung (mooyoung)

MooYoung is a TypeScript [Cloudflare Worker](https://developers.cloudflare.com/workers/) that receives Instagram Direct Message webhooks from Meta's Instagram API (Unified Login, `messages` field). It reads shared reels and text from an allowlisted pair of Instagram users: `patato.jpeg` and `youthkid9048`.

## Features

- Meta webhook verification on `GET /webhook`
- HMAC-SHA256 signature checks on `POST /webhook` (`X-Hub-Signature-256`)
- Fast `200 OK` responses with background processing via `ctx.waitUntil`
- Instagram Graph API username lookup for each sender (`graph.facebook.com/v27.0`)
- Parsing for `ig_reel` attachments, other shares, and reel URLs in message text
- Structured JSON logs for `wrangler tail`
- Optional forwarding of normalized events to a downstream URL

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Health check: `{ "ok": true, "service": "mooyoung" }` |
| `GET` | `/webhook` | Meta subscription verification |
| `POST` | `/webhook` | Instagram messaging webhooks |

## Configuration

Copy `.dev.vars.example` to `.dev.vars` for local development (do not commit `.dev.vars`).

| Variable | Required | Description |
|----------|----------|-------------|
| `WEBHOOK_VERIFY_TOKEN` | Yes | Token you enter in the Meta app webhook settings |
| `INSTAGRAM_APP_SECRET` | Yes | Meta app secret for webhook signature verification |
| `INSTAGRAM_ACCESS_TOKEN` | Yes | System User token for `graph.facebook.com` username lookup |
| `INSTAGRAM_GRAPH_BASE_URL` | No | Override Graph API base (default: `https://graph.facebook.com/v27.0`) |
| `ALLOWED_USERNAMES` | No | Comma-separated allowlist (default: `patato.jpeg,youthkid9048`) |
| `FORWARD_WEBHOOK_URL` | No | If set, POST normalized JSON events to this URL |
| `FORWARD_WEBHOOK_SECRET` | No | Optional shared secret for the forward request |
| `FORWARD_WEBHOOK_HEADER` | No | Header name for the secret; default is `Authorization: Bearer ...` |

Set production secrets with Wrangler:

```bash
npx wrangler secret put WEBHOOK_VERIFY_TOKEN
npx wrangler secret put INSTAGRAM_APP_SECRET
npx wrangler secret put INSTAGRAM_ACCESS_TOKEN
```

## Local development

```bash
npm install
npm run dev
```

In another terminal:

```bash
npm run test
npm run typecheck
```

Stream logs:

```bash
npx wrangler tail
```

## Deploy

```bash
npm run deploy
```

Configure your Meta app webhook to point at `https://mooyoung.chayapat.me/webhook` (or your worker host) and subscribe to the `messages` field for Instagram.

## Normalized event shape

Each processed message is logged (and optionally forwarded) as:

```json
{
  "type": "mooyoung_event",
  "message_id": "...",
  "sender_id": "...",
  "sender_username": "patato.jpeg",
  "sent_at": "2025-11-26T12:00:00.000Z",
  "text": "optional text",
  "reels": [{ "url": "...", "title": "...", "reel_video_id": "..." }],
  "attachments": [{ "type": "ig_post", "url": "..." }]
}
```

## License

Private project. All rights reserved unless otherwise noted.