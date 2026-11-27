# MooYoung (mooyoung)

MooYoung is a TypeScript [Cloudflare Worker](https://developers.cloudflare.com/workers/) that receives Instagram Direct Message webhooks from Meta's Instagram API (Unified Login, `messages` field), extracts restaurants and dishes with Workers AI into [D1](https://developers.cloudflare.com/d1/), and serves the **Miyu & Pat Nom Nom List** web app at `GET /` (https://mooyoung.chayapat.me/). Allowed senders: `patato.jpeg` and `youthkid9048`.

## Features

- Meta webhook verification on `GET /webhook`
- HMAC-SHA256 signature checks on `POST /webhook` (`X-Hub-Signature-256`)
- Fast `200 OK` responses with background processing via `ctx.waitUntil`
- Instagram Graph API username lookup for each sender (`graph.facebook.com/v27.0`)
- Parsing for `ig_reel` attachments and reel URLs in message text (plain text / non-reel DMs are ignored; no save, no reply)
- Structured JSON logs for `wrangler tail`
- Optional forwarding of normalized events to a downstream URL
- D1-backed Places, Foods, and DM Inbox with REST API under `/api/*`
- Workers AI extraction pipeline with safe JSON parsing and heuristics fallback

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/` | Nom Nom List web app (HTML) |
| `GET` | `/api/health` | Health check: `{ "ok": true, "service": "mooyoung" }` |
| `GET/POST/PATCH/DELETE` | `/api/places`, `/api/foods` | CRUD for saved lists |
| `GET` | `/api/thumbnail?url=` | Proxy Instagram reel/post `og:image` for card previews |
| `GET/PATCH` | `/api/inbox` | Instagram DM inbox and review actions |
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
| `CARTO_API_KEY` | No | CARTO basemap API key for Leaflet tiles ([get one](https://carto.com/basemaps/apikey)) |

Set production secrets with Wrangler:

```bash
npx wrangler secret put WEBHOOK_VERIFY_TOKEN
npx wrangler secret put INSTAGRAM_APP_SECRET
npx wrangler secret put INSTAGRAM_ACCESS_TOKEN
npx wrangler secret put CARTO_API_KEY
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

Apply D1 migrations before or after the first deploy:

```bash
npx wrangler d1 migrations apply mooyoung-db --remote
```

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