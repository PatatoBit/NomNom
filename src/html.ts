import type { Env } from "./env";

export function serveAppHtml(env: Pick<Env, "CARTO_API_KEY"> = {}): Response {
  const cartoApiKeyJson = JSON.stringify(env.CARTO_API_KEY?.trim() ?? "");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <meta name="theme-color" content="#ffffff" />
  <title>MooYoung | Miyu &amp; Pat's Nom Nom List</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #ffffff;
      --ink: #000000;
      --muted: rgba(0, 0, 0, 0.4);
      --muted-soft: rgba(0, 0, 0, 0.3);
      --line: rgba(0, 0, 0, 0.1);
      --line-strong: #000000;
      --surface-soft: rgba(0, 0, 0, 0.05);
      --surface-mid: rgba(0, 0, 0, 0.1);
      --accent: #5167f4;
      --highlight: #feee5d;
      --purple: #be9cf3;
      --green: #23ffa1;
      --danger: #cd2c54;
      --radius-s: 6px;
      --radius-m: 12px;
      --radius-l: 16px;
      --radius-pill: 256px;
      --row-h: 42px;
      --control-h: 40px;
      --font: "Switzer", "Helvetica Neue", Helvetica, Arial, sans-serif;
      --shadow-float: 0 8px 16px rgba(0, 0, 0, 0.1);
      --ease: 0.15s ease;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: var(--font);
      color: var(--ink);
      background: var(--bg);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }
    button, input, select, textarea { font: inherit; color: inherit; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .app {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 28px 28px 80px;
      max-width: 1280px;
      margin: 0 auto;
    }
    @media (max-width: 720px) {
      .app { padding: 18px 16px 88px; }
    }

    /* Header — Tweek month/title pattern */
    .topbar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 36px;
    }
    .brand-block { min-width: 0; }
    .brand-row {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 10px 14px;
    }
    .brand {
      margin: 0;
      font-size: 31px;
      line-height: 40px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    .brand-meta {
      font-size: 31px;
      line-height: 40px;
      font-weight: 700;
      color: var(--muted-soft);
      letter-spacing: -0.03em;
    }
    .tagline {
      margin: 6px 0 0;
      font-size: 15px;
      line-height: 20px;
      color: var(--muted);
      max-width: 420px;
    }
    .top-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--purple);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .circle-btn {
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 50%;
      background: var(--ink);
      color: #fff;
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: transform var(--ease);
    }
    .circle-btn:hover { transform: scale(1.06); }
    .circle-btn svg { width: 14px; height: 14px; }

    /* Tabs as quiet text nav */
    .tabs {
      display: flex;
      gap: 22px;
      align-items: center;
      margin-bottom: 22px;
      border-bottom: 1px solid var(--line);
    }
    .tab-btn {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 0 0 12px;
      margin: 0;
      font-size: 15px;
      line-height: 20px;
      font-weight: 600;
      color: var(--muted);
      cursor: pointer;
      position: relative;
      transition: color var(--ease);
    }
    .tab-btn:hover { color: var(--ink); }
    .tab-btn.active { color: var(--ink); }
    .tab-btn.active::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: var(--ink);
    }
    .tab-count {
      margin-left: 6px;
      font-weight: 500;
      color: var(--muted-soft);
    }
    .tab-btn.active .tab-count { color: var(--muted); }
    .tab-btn.has-alert .tab-count { color: var(--danger); }

    .panel { display: none; }
    .panel.active { display: block; }

    /* Filters — hairline toolbar */
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 18px;
      padding-bottom: 14px;
      border-bottom: 1px solid var(--line);
    }
    .filters input,
    .filters select {
      height: 36px;
      border: 0;
      border-radius: var(--radius-pill);
      padding: 0 14px;
      background: var(--surface-soft);
      outline: none;
      min-width: 0;
    }
    .filters input:focus,
    .filters select:focus {
      box-shadow: inset 0 0 0 1.5px var(--ink);
      background: #fff;
    }
    .filters input[type="search"] { flex: 1 1 180px; min-width: 160px; }

    /* Map */
    #map {
      height: 280px;
      border-radius: var(--radius-l);
      border: 1px solid var(--line);
      margin-bottom: 8px;
      overflow: hidden;
      background: #f5f5f5;
    }
    .off-map {
      font-size: 14px;
      line-height: 20px;
      color: var(--muted);
      margin: 0 0 22px;
      min-height: 1.2em;
    }

    /* Board columns — Tweek day columns */
    .board {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px 32px;
      margin-bottom: 18px;
    }
    @media (max-width: 820px) {
      .board { grid-template-columns: 1fr; gap: 28px; }
    }
    .col-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 10px;
      border-bottom: 2px solid var(--line-strong);
      margin-bottom: 0;
    }
    .col-head.accent { border-bottom-color: var(--accent); }
    .col-head.accent .col-title,
    .col-head.accent .col-side { color: var(--accent); }
    .col-title {
      margin: 0;
      font-size: 17px;
      line-height: 22px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .col-side {
      font-size: 15px;
      line-height: 20px;
      color: var(--muted);
      font-weight: 500;
    }
    .ruled {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .row {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      min-height: var(--row-h);
      border-bottom: 1px solid var(--line);
      padding: 6px 0;
    }
    .row:hover { background: linear-gradient(var(--surface-soft), var(--surface-soft)); }
    .thumb {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      background: var(--surface-mid);
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
      color: var(--muted);
      flex-shrink: 0;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .row-main { min-width: 0; }
    .row-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 15px;
      line-height: 20px;
      font-weight: 500;
    }
    .row-title .name { font-weight: 600; }
    .chip {
      display: inline-block;
      padding: 1px 8px;
      border-radius: var(--radius-pill);
      background: var(--highlight);
      font-size: 13px;
      line-height: 18px;
      font-weight: 600;
    }
    .chip.done { background: var(--green); color: var(--ink); }
    .chip.blue { background: #dce1fd; color: var(--accent); }
    .row-meta {
      margin-top: 2px;
      font-size: 12px;
      line-height: 18px;
      color: var(--muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .row-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      transition: opacity var(--ease);
    }
    .row:hover .row-actions,
    .row:focus-within .row-actions { opacity: 1; }
    @media (hover: none) {
      .row-actions { opacity: 1; }
    }
    .icon-btn {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: var(--muted);
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .icon-btn:hover { background: var(--surface-soft); color: var(--ink); }
    .icon-btn.danger:hover { color: var(--danger); }
    .icon-btn svg { width: 14px; height: 14px; }
    .check {
      width: 22px;
      height: 22px;
      border: 1.5px solid var(--muted-soft);
      border-radius: 50%;
      background: transparent;
      display: grid;
      place-items: center;
      cursor: pointer;
      padding: 0;
      transition: transform 90ms ease-out, background var(--ease), border-color var(--ease);
      color: transparent;
    }
    .check:hover { transform: scale(1.15); border-color: var(--ink); }
    .check.on {
      background: var(--ink);
      border-color: var(--ink);
      color: #fff;
    }
    .check svg { width: 12px; height: 12px; }

    .empty {
      min-height: calc(var(--row-h) * 3);
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 15px;
      line-height: var(--row-h);
      padding: 0;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    /* Buttons */
    .btn {
      height: var(--control-h);
      border: 0;
      border-radius: var(--radius-pill);
      padding: 0 18px;
      background: var(--surface-soft);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform var(--ease), background var(--ease);
    }
    .btn:hover { background: var(--surface-mid); }
    .btn-primary {
      background: var(--ink);
      color: #fff;
    }
    .btn-primary:hover { background: #222; }
    .btn-sm {
      height: 28px;
      padding: 0 12px;
      font-size: 13px;
    }

    /* Inbox */
    .inbox-item {
      border-bottom: 1px solid var(--line);
      padding: 14px 0;
    }
    .inbox-item p {
      margin: 6px 0 0;
      font-size: 15px;
      line-height: 22px;
    }
    .inbox-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
      font-size: 14px;
    }

    /* Floating about / stats pill */
    .float-pill {
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 40;
      display: flex;
      align-items: center;
      gap: 10px;
      height: 40px;
      padding: 0 16px;
      border-radius: var(--radius-pill);
      background: #fff;
      border: 1px solid var(--line);
      box-shadow: var(--shadow-float);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .float-pill span { color: var(--muted); font-weight: 500; }
    .float-pill strong { color: var(--ink); }

    /* Dialog */
    dialog {
      border: 0;
      border-radius: var(--radius-l);
      padding: 0;
      max-width: 420px;
      width: calc(100% - 32px);
      box-shadow: var(--shadow-float);
    }
    dialog::backdrop { background: rgba(0, 0, 0, 0.45); }
    dialog form { padding: 22px; }
    dialog h3 {
      margin: 0 0 8px;
      font-size: 21px;
      line-height: 24px;
      letter-spacing: -0.02em;
    }
    dialog label {
      display: block;
      font-size: 13px;
      margin: 12px 0 4px;
      color: var(--muted);
      font-weight: 500;
    }
    dialog input, dialog select, dialog textarea {
      width: 100%;
      border: 0;
      border-radius: var(--radius-s);
      padding: 10px 12px;
      background: var(--surface-soft);
      outline: none;
    }
    dialog input:focus, dialog select:focus, dialog textarea:focus {
      box-shadow: inset 0 0 0 1.5px var(--ink);
      background: #fff;
    }
    dialog textarea { min-height: 80px; resize: vertical; }
    .dlg-actions {
      margin-top: 18px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .city-badge {
      display: inline-block;
      background: var(--surface-soft);
      border-radius: var(--radius-pill);
      padding: 1px 8px;
      font-size: 12px;
      color: var(--muted);
    }

    .stats-popover {
      display: none;
      position: fixed;
      right: 20px;
      bottom: 76px;
      z-index: 41;
      width: min(280px, calc(100vw - 40px));
      background: #fff;
      border: 1px solid var(--line);
      border-radius: var(--radius-l);
      box-shadow: var(--shadow-float);
      padding: 14px 16px;
      font-size: 14px;
      line-height: 22px;
      pointer-events: auto;
    }
    .stats-popover.open { display: block; }
    .stats-popover .stat-line {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid var(--line);
      padding: 8px 0;
    }
    .stats-popover .stat-line:last-child { border-bottom: 0; }
    .stats-popover .stat-line span { color: var(--muted); }

    .processing-banner {
      display: none;
      align-items: center;
      gap: 10px;
      margin: -18px 0 18px;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      background: #fff;
      font-size: 14px;
      line-height: 20px;
      color: var(--ink);
      cursor: pointer;
      width: fit-content;
      max-width: 100%;
      transition: background var(--ease), border-color var(--ease);
    }
    .processing-banner.visible { display: inline-flex; }
    .processing-banner:hover {
      background: var(--surface-soft);
      border-color: var(--line-strong);
    }
    .processing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ink);
      flex-shrink: 0;
      animation: processing-pulse 1.4s ease-in-out infinite;
    }
    @keyframes processing-pulse {
      0%, 100% { opacity: 0.35; transform: scale(0.92); }
      50% { opacity: 1; transform: scale(1); }
    }
    .processing-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 8px;
      border: 1px solid var(--line);
      border-radius: var(--radius-pill);
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin-left: 8px;
    }
    .processing-badge .processing-dot { width: 6px; height: 6px; }
    .row-processing {
      border: 1px dashed var(--line);
      border-radius: var(--radius-s);
      margin-bottom: 4px;
      opacity: 0.75;
      pointer-events: none;
    }
    .row-processing .thumb {
      background: var(--surface-soft);
      color: var(--muted);
      font-weight: 700;
      letter-spacing: 0.12em;
    }
    .inbox-item.is-processing { opacity: 0.92; }
  </style>
</head>
<body>
  <div class="app">
    <header class="topbar">
      <div class="brand-block">
        <div class="brand-row">
          <h1 class="brand">MooYoung</h1>
          <span class="brand-meta" id="brand-meta">Nom Nom</span>
        </div>
        <p class="tagline">Miyu &amp; Pat's Nom Nom List — restaurants, dishes, and recipes to try.</p>
      </div>
      <div class="top-actions">
        <div class="avatar" title="Miyu &amp; Pat">MP</div>
        <button class="circle-btn" type="button" id="reload-btn" title="Refresh" aria-label="Refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.3"/><path d="M21 3v6h-6"/></svg>
        </button>
      </div>
    </header>

    <button type="button" class="processing-banner" id="processing-banner" hidden aria-live="polite">
      <span class="processing-dot" aria-hidden="true"></span>
      <span id="processing-banner-text"></span>
    </button>

    <nav class="tabs" role="tablist">
      <button class="tab-btn active" data-tab="places" type="button">Places<span class="tab-count" id="tab-places-count"></span></button>
      <button class="tab-btn" data-tab="foods" type="button">Foods<span class="tab-count" id="tab-foods-count"></span></button>
      <button class="tab-btn" data-tab="inbox" type="button" id="tab-inbox">Inbox<span class="tab-count" id="tab-inbox-count"></span></button>
    </nav>

    <section id="panel-places" class="panel active">
      <div class="filters" id="place-filters"></div>
      <div id="map"></div>
      <p class="off-map" id="off-map-note"></p>
      <div class="board">
        <div>
          <div class="col-head accent">
            <h2 class="col-title">Want to go</h2>
            <span class="col-side" id="want-count">0</span>
          </div>
          <ul class="ruled" id="places-want"></ul>
        </div>
        <div>
          <div class="col-head">
            <h2 class="col-title">Visited</h2>
            <span class="col-side" id="visited-count">0</span>
          </div>
          <ul class="ruled" id="places-visited"></ul>
        </div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" type="button" id="add-place-btn">Add place</button>
      </div>
    </section>

    <section id="panel-foods" class="panel">
      <div class="filters" id="food-filters"></div>
      <div class="board">
        <div>
          <div class="col-head accent">
            <h2 class="col-title">Want to try</h2>
            <span class="col-side" id="food-want-count">0</span>
          </div>
          <ul class="ruled" id="foods-want"></ul>
        </div>
        <div>
          <div class="col-head">
            <h2 class="col-title">Tried</h2>
            <span class="col-side" id="food-tried-count">0</span>
          </div>
          <ul class="ruled" id="foods-tried"></ul>
        </div>
      </div>
      <div class="toolbar">
        <button class="btn btn-primary" type="button" id="add-food-btn">Add food</button>
      </div>
    </section>

    <section id="panel-inbox" class="panel">
      <div id="inbox-list"></div>
    </section>
  </div>

  <button class="float-pill" type="button" id="stats-toggle" aria-expanded="false">Stats <span id="stats-summary"></span></button>
  <div class="stats-popover" id="stats-popover"></div>

  <dialog id="edit-dialog"></dialog>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
const CARTO_API_KEY = ${cartoApiKeyJson};
${APP_SCRIPT}
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const APP_SCRIPT = `
const state = { places: [], foods: [], inbox: [], map: null, markers: [], statsOpen: false, filtersBuilt: false };
const PROCESSING_STALE_MS = 5 * 60 * 1000;
let pollTimer = null;
let pollFingerprint = '';

function parseCreatedAtMs(createdAt) {
  if (!createdAt) return 0;
  const normalized = createdAt.includes('T') ? createdAt : createdAt.replace(' ', 'T') + 'Z';
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : 0;
}

function isRecentProcessing(row) {
  if (row.result_status !== 'processing') return false;
  const age = Date.now() - parseCreatedAtMs(row.created_at);
  return age >= 0 && age < PROCESSING_STALE_MS;
}

function recentProcessingItems() {
  return state.inbox.filter(isRecentProcessing);
}

function inboxFingerprint(meta) {
  return [
    meta?.latest_inbox_id ?? 0,
    meta?.processing_count ?? 0,
    meta?.place_count ?? 0,
    meta?.food_count ?? 0,
    meta?.needs_review_count ?? 0,
  ].join(':');
}

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + tab);
  });
  if (tab === 'places' && state.map) setTimeout(() => state.map.invalidateSize(), 80);
}

function renderProcessingBanner() {
  const items = recentProcessingItems();
  const banner = document.getElementById('processing-banner');
  const text = document.getElementById('processing-banner-text');
  if (!banner || !text) return;
  if (!items.length) {
    banner.classList.remove('visible');
    banner.hidden = true;
    return;
  }
  const first = items[0];
  const handle = first.sender_username ? '@' + first.sender_username : 'Instagram';
  text.textContent = items.length === 1
    ? 'Processing new reel from ' + handle + '...'
  : 'Processing ' + items.length + ' new reels...';
  banner.classList.add('visible');
  banner.hidden = false;
}

function processingPlaceholders() {
  return recentProcessingItems().map(row => {
    const handle = row.sender_username ? '@' + row.sender_username : 'Instagram';
    return '<li class="row row-processing">' +
      '<span class="thumb">···</span>' +
      '<div class="row-main">' +
        '<div class="row-title"><span class="name">New reel processing</span>' +
          '<span class="processing-badge"><span class="processing-dot"></span>Processing</span></div>' +
        '<div class="row-meta">From ' + esc(handle) + '</div>' +
      '</div></li>';
  }).join('');
}

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const EDIT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg>';

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function isBangkok(lat, lng) {
  return lat > 13 && lat < 15 && lng > 99.5 && lng < 101.5;
}

function initials(name) {
  const parts = String(name || '').trim().split(/\\s+/).filter(Boolean);
  if (!parts.length) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderStats() {
  const visited = state.places.filter(p => p.status === 'visited').length;
  const want = state.places.length - visited;
  const tried = state.foods.filter(f => f.status === 'tried').length;
  const foodWant = state.foods.length - tried;
  const review = state.inbox.filter(i => i.result_status === 'needs_review').length;

  document.getElementById('brand-meta').textContent = state.places.length + ' places';
  document.getElementById('tab-places-count').textContent = String(state.places.length || '');
  document.getElementById('tab-foods-count').textContent = String(state.foods.length || '');
  document.getElementById('tab-inbox-count').textContent = review ? String(review) : String(state.inbox.length || '');
  document.getElementById('tab-inbox').classList.toggle('has-alert', review > 0);

  document.getElementById('stats-summary').textContent = '· ' + want + ' open';
  document.getElementById('stats-popover').innerHTML =
    '<div class="stat-line"><span>Places</span><strong>' + state.places.length + '</strong></div>' +
    '<div class="stat-line"><span>Want to go</span><strong>' + want + '</strong></div>' +
    '<div class="stat-line"><span>Visited</span><strong>' + visited + '</strong></div>' +
    '<div class="stat-line"><span>Foods</span><strong>' + state.foods.length + '</strong></div>' +
    '<div class="stat-line"><span>Tried</span><strong>' + tried + '</strong></div>' +
    (review ? '<div class="stat-line"><span>Needs review</span><strong>' + review + '</strong></div>' : '');
}

function buildPlaceFilters() {
  const areas = [...new Set(state.places.map(p => p.area).filter(Boolean))].sort();
  const cuisines = [...new Set(state.places.map(p => p.cuisine).filter(Boolean))].sort();
  const el = document.getElementById('place-filters');
  el.innerHTML =
    '<input type="search" id="pf-search" placeholder="Search places" />' +
    '<select id="pf-area"><option value="">All areas</option>' + areas.map(a => '<option>' + esc(a) + '</option>').join('') + '</select>' +
    '<select id="pf-cuisine"><option value="">All cuisines</option>' + cuisines.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>' +
    '<select id="pf-price"><option value="">Any price</option><option>฿</option><option>$$</option><option>$$$</option></select>';
  ['pf-search','pf-area','pf-cuisine','pf-price'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderPlaces);
    document.getElementById(id).addEventListener('change', renderPlaces);
  });
}

function filteredPlaces() {
  const q = (document.getElementById('pf-search')?.value || '').toLowerCase();
  const area = document.getElementById('pf-area')?.value || '';
  const cuisine = document.getElementById('pf-cuisine')?.value || '';
  const price = document.getElementById('pf-price')?.value || '';
  return state.places.filter(p => {
    if (q && !(p.name || '').toLowerCase().includes(q) && !(p.area || '').toLowerCase().includes(q)) return false;
    if (area && p.area !== area) return false;
    if (cuisine && p.cuisine !== cuisine) return false;
    if (price && (p.price_level || '') !== price) return false;
    return true;
  });
}

function renderMap(places) {
  const withCoords = places.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
  const bkk = withCoords.filter(p => isBangkok(p.lat, p.lng));
  const off = withCoords.filter(p => !isBangkok(p.lat, p.lng));
  const note = document.getElementById('off-map-note');
  if (off.length) {
    note.textContent = off.map(p => p.name).join(', ') + (off.length === 1 ? ' is' : ' are') + ' farther away, so ' + (off.length === 1 ? 'it sits' : 'they sit') + ' on the list but not on this Bangkok map.';
  } else {
    note.textContent = '';
  }
  if (!state.map) {
    state.map = L.map('map', { scrollWheelZoom: false, zoomControl: false }).setView([13.7563, 100.5018], 11);
    L.control.zoom({ position: 'topright' }).addTo(state.map);
    if (CARTO_API_KEY) {
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(CARTO_API_KEY),
        { attribution: '&copy; OSM &copy; CARTO', maxZoom: 19 }
      ).addTo(state.map);
    } else {
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(state.map);
    }
  }
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];
  bkk.forEach(p => {
    const color = p.status === 'visited' ? '#000000' : '#5167f4';
    const m = L.circleMarker([p.lat, p.lng], { radius: 7, color, fillColor: color, fillOpacity: 0.9, weight: 0 }).addTo(state.map);
    m.bindPopup('<strong>' + esc(p.name) + '</strong><br/>' + esc(p.area || ''));
    if (p.maps_url) m.on('click', () => window.open(p.maps_url, '_blank'));
    state.markers.push(m);
  });
  if (bkk.length > 1) {
    const bounds = L.latLngBounds(bkk.map(p => [p.lat, p.lng]));
    state.map.fitBounds(bounds, { padding: [24, 24] });
  }
}

function isInstagramSource(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(^|\\.)instagram\\.com$/i.test(u.hostname) && /\\/(reel|reels|p|tv)\\//i.test(u.pathname);
  } catch (e) {
    return false;
  }
}

function rowPreview(item, label) {
  if (item.image_url) {
    return '<span class="thumb"><img src="' + esc(item.image_url) + '" alt="" loading="lazy" /></span>';
  }
  if (isInstagramSource(item.source_url)) {
    return '<span class="thumb"><img src="/api/thumbnail?url=' + encodeURIComponent(item.source_url) + '" alt="" loading="lazy" /></span>';
  }
  return '<span class="thumb">' + esc(initials(label || item.name)) + '</span>';
}

function placeRow(p) {
  const done = p.status === 'visited';
  const thumb = rowPreview(p, p.name);
  const meta = [p.area, p.city, p.cuisine, p.price_level].filter(Boolean).join(' · ');
  const chip = done && p.visit_date ? '<span class="chip done">' + esc(p.visit_date) + '</span>' : '';
  const city = (!isBangkok(p.lat, p.lng) && p.city) ? ' <span class="city-badge">' + esc(p.city) + '</span>' : '';
  return '<li class="row" data-id="' + p.id + '">' +
    thumb +
    '<div class="row-main">' +
      '<div class="row-title"><span class="name">' + esc(p.name) + '</span>' + chip + city + '</div>' +
      (meta ? '<div class="row-meta">' + esc(meta) + (p.rating ? ' · ' + esc(p.rating) + ' Google' : '') + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:4px">' +
      '<div class="row-actions">' +
        (p.maps_url ? '<a class="icon-btn" href="' + esc(p.maps_url) + '" target="_blank" rel="noreferrer" title="Maps" aria-label="Maps"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg></a>' : '') +
        '<button class="icon-btn" data-action="edit-place" data-id="' + p.id + '" title="Edit" aria-label="Edit">' + EDIT_SVG + '</button>' +
        '<button class="icon-btn danger" data-action="delete-place" data-id="' + p.id + '" title="Delete" aria-label="Delete">' + TRASH_SVG + '</button>' +
      '</div>' +
      '<button class="check' + (done ? ' on' : '') + '" data-action="toggle-place" data-id="' + p.id + '" title="' + (done ? 'Mark want to go' : 'Mark visited') + '" aria-label="Toggle visited">' + CHECK_SVG + '</button>' +
    '</div></li>';
}

function renderPlaces() {
  const list = filteredPlaces();
  const want = list.filter(p => p.status !== 'visited');
  const visited = list.filter(p => p.status === 'visited');
  const placeholders = processingPlaceholders();
  document.getElementById('want-count').textContent = String(want.length);
  document.getElementById('visited-count').textContent = String(visited.length);
  const wantHtml = placeholders + (want.length ? want.map(placeRow).join('') : '');
  document.getElementById('places-want').innerHTML = wantHtml || '<li class="empty">Keep places here without a visit yet</li>';
  document.getElementById('places-visited').innerHTML = visited.length ? visited.map(placeRow).join('') : '<li class="empty">Nothing visited yet</li>';
  renderMap(list);
  renderProcessingBanner();
}

function buildFoodFilters() {
  const el = document.getElementById('food-filters');
  const cuisines = [...new Set(state.foods.map(f => f.cuisine).filter(Boolean))].sort();
  el.innerHTML =
    '<input type="search" id="ff-search" placeholder="Search foods" />' +
    '<select id="ff-cuisine"><option value="">All cuisines</option>' + cuisines.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>';
  ['ff-search','ff-cuisine'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderFoods);
    document.getElementById(id).addEventListener('change', renderFoods);
  });
}

function filteredFoods() {
  const q = (document.getElementById('ff-search')?.value || '').toLowerCase();
  const cuisine = document.getElementById('ff-cuisine')?.value || '';
  return state.foods.filter(f => {
    if (q && !(f.name || '').toLowerCase().includes(q)) return false;
    if (cuisine && f.cuisine !== cuisine) return false;
    return true;
  });
}

function foodRow(f) {
  const done = f.status === 'tried';
  const thumb = rowPreview(f, f.name);
  const meta = [f.category, f.cuisine, f.restaurant_name ? 'At ' + f.restaurant_name : ''].filter(Boolean).join(' · ');
  return '<li class="row">' +
    thumb +
    '<div class="row-main">' +
      '<div class="row-title"><span class="name">' + esc(f.name) + '</span></div>' +
      (meta ? '<div class="row-meta">' + esc(meta) + '</div>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:4px">' +
      '<div class="row-actions">' +
        (f.source_url ? '<a class="icon-btn" href="' + esc(f.source_url) + '" target="_blank" rel="noreferrer" title="Source" aria-label="Source"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg></a>' : '') +
        '<button class="icon-btn" data-action="edit-food" data-id="' + f.id + '" title="Edit" aria-label="Edit">' + EDIT_SVG + '</button>' +
        '<button class="icon-btn danger" data-action="delete-food" data-id="' + f.id + '" title="Delete" aria-label="Delete">' + TRASH_SVG + '</button>' +
      '</div>' +
      '<button class="check' + (done ? ' on' : '') + '" data-action="toggle-food" data-id="' + f.id + '" title="' + (done ? 'Want to try' : 'Mark tried') + '" aria-label="Toggle tried">' + CHECK_SVG + '</button>' +
    '</div></li>';
}

function renderFoods() {
  const list = filteredFoods();
  const want = list.filter(f => f.status !== 'tried');
  const tried = list.filter(f => f.status === 'tried');
  document.getElementById('food-want-count').textContent = String(want.length);
  document.getElementById('food-tried-count').textContent = String(tried.length);
  document.getElementById('foods-want').innerHTML = want.length ? want.map(foodRow).join('') : '<li class="empty">Keep dishes here without tasting yet</li>';
  document.getElementById('foods-tried').innerHTML = tried.length ? tried.map(foodRow).join('') : '<li class="empty">Nothing tried yet</li>';
}

function renderInbox() {
  const el = document.getElementById('inbox-list');
  if (!state.inbox.length) {
    el.innerHTML = '<div class="empty">No DMs yet. Send reels to mooyoung.save on Instagram.</div>';
    renderProcessingBanner();
    return;
  }
  const sorted = [...state.inbox].sort((a, b) => {
    const ap = a.result_status === 'processing' ? 1 : 0;
    const bp = b.result_status === 'processing' ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return (b.id || 0) - (a.id || 0);
  });
  el.innerHTML = sorted.map(row => {
    let reels = [];
    try { reels = JSON.parse(row.reels_json || '[]'); } catch (e) {}
    const reelLinks = reels.map(r => r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noreferrer">Reel</a>' : '').join(' ');
    const processing = row.result_status === 'processing';
    const actions = processing
      ? '<span class="processing-badge"><span class="processing-dot"></span>Processing...</span>'
      : row.result_status === 'needs_review'
      ? '<button class="btn btn-primary btn-sm" data-action="promote-place" data-id="' + row.id + '">Add as place</button>' +
        '<button class="btn btn-sm" data-action="promote-food" data-id="' + row.id + '">Add as food</button>' +
        '<button class="btn btn-sm" data-action="dismiss-inbox" data-id="' + row.id + '">Dismiss</button>'
      : '<span class="row-meta">Status: ' + esc(row.result_status) + '</span>';
    return '<div class="inbox-item' + (processing ? ' is-processing' : '') + '">' +
      '<div class="row-meta">From @' + esc(row.sender_username) + ' · ' + esc(row.created_at) + '</div>' +
      '<p>' + esc(row.text || '(no text)') + '</p>' +
      (reelLinks ? '<div class="links">' + reelLinks + '</div>' : '') +
      '<div class="inbox-actions">' + actions + '</div></div>';
  }).join('');
  renderProcessingBanner();
}

async function reload(opts) {
  const preserveUi = opts?.preserveUi === true;
  const activeTab = preserveUi
    ? (document.querySelector('.tab-btn.active')?.dataset.tab || 'places')
    : null;
  const dlg = document.getElementById('edit-dialog');
  const dialogOpen = preserveUi && dlg && dlg.open;

  const [places, foods, inbox] = await Promise.all([
    api('/api/places'),
    api('/api/foods'),
    api('/api/inbox'),
  ]);
  state.places = places;
  state.foods = foods;
  state.inbox = inbox;
  renderStats();
  if (state.filtersBuilt && preserveUi) {
    renderPlaces();
    renderFoods();
  } else {
    buildPlaceFilters();
    buildFoodFilters();
    state.filtersBuilt = true;
    renderPlaces();
    renderFoods();
  }
  renderInbox();
  if (activeTab) activateTab(activeTab);
  if (dialogOpen && dlg) dlg.showModal();
}

function schedulePoll(ms) {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = setTimeout(() => tickInboxPoll().catch(err => console.error(err)), ms);
}

async function tickInboxPoll() {
  if (document.hidden) return;
  let meta;
  try {
    meta = await api('/api/inbox?poll=1');
  } catch (err) {
    schedulePoll(5000);
    return;
  }
  const fp = inboxFingerprint(meta);
  const hadProcessing = recentProcessingItems().length > 0;
  if (fp !== pollFingerprint) {
    pollFingerprint = fp;
    await reload({ preserveUi: true });
  } else {
    renderProcessingBanner();
  }
  const hasProcessing = (meta.processing_count || 0) > 0 || hadProcessing;
  schedulePoll(hasProcessing ? 2000 : 5000);
}

document.getElementById('processing-banner').onclick = () => {
  activateTab('inbox');
};

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    return;
  }
  tickInboxPoll().catch(err => console.error(err));
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'places' && state.map) setTimeout(() => state.map.invalidateSize(), 80);
  });
});

document.getElementById('reload-btn').onclick = () => reload().catch(err => console.error(err));

document.getElementById('stats-toggle').onclick = () => {
  state.statsOpen = !state.statsOpen;
  document.getElementById('stats-popover').classList.toggle('open', state.statsOpen);
  document.getElementById('stats-toggle').setAttribute('aria-expanded', state.statsOpen ? 'true' : 'false');
};

function openDialog(title, fields, onSubmit) {
  const dlg = document.getElementById('edit-dialog');
  dlg.innerHTML = '<form method="dialog"><h3>' + esc(title) + '</h3>' + fields +
    '<div class="dlg-actions">' +
    '<button type="button" class="btn" id="dlg-cancel">Cancel</button>' +
    '<button type="submit" class="btn btn-primary">Save</button></div></form>';
  dlg.showModal();
  dlg.querySelector('#dlg-cancel').onclick = () => dlg.close();
  dlg.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    await onSubmit(data);
    dlg.close();
    await reload();
  };
}

document.getElementById('add-place-btn').onclick = () => {
  openDialog('Add place',
    '<label>Name<input name="name" required /></label>' +
    '<label>Area<input name="area" /></label>' +
    '<label>City<input name="city" /></label>' +
    '<label>Cuisine<input name="cuisine" /></label>' +
    '<label>Price<input name="price_level" /></label>' +
    '<label>Maps URL<input name="maps_url" /></label>' +
    '<label>Added by<select name="added_by"><option>Pat</option><option>Miyu</option></select></label>',
    data => api('/api/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  );
};

document.getElementById('add-food-btn').onclick = () => {
  openDialog('Add food',
    '<label>Name<input name="name" required /></label>' +
    '<label>Category<select name="category"><option>Dish to try</option><option>Recipe</option></select></label>' +
    '<label>Cuisine<input name="cuisine" /></label>' +
    '<label>Restaurant<input name="restaurant_name" /></label>' +
    '<label>Notes<textarea name="notes"></textarea></label>' +
    '<label>Added by<select name="added_by"><option>Pat</option><option>Miyu</option></select></label>',
    data => api('/api/foods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  );
};

document.body.addEventListener('click', async (ev) => {
  const btn = ev.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;
  if (action === 'delete-place') {
    if (confirm('Delete this place?')) {
      await api('/api/places/' + id, { method: 'DELETE' });
      await reload();
    }
  } else if (action === 'delete-food') {
    if (confirm('Delete this food?')) {
      await api('/api/foods/' + id, { method: 'DELETE' });
      await reload();
    }
  } else if (action === 'toggle-place') {
    const p = state.places.find(x => x.id === id);
    const status = p.status === 'visited' ? 'want_to_go' : 'visited';
    let extra = {};
    if (status === 'visited') {
      const rating = prompt('Visit rating (optional)');
      const notes = prompt('Visit notes (optional)');
      extra = { visit_rating: rating || null, visit_notes: notes || null, visit_date: new Date().toISOString().slice(0,10) };
    }
    await api('/api/places/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, ...extra }) });
    await reload();
  } else if (action === 'toggle-food') {
    const f = state.foods.find(x => x.id === id);
    const status = f.status === 'tried' ? 'want_to_go' : 'tried';
    await api('/api/foods/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    await reload();
  } else if (action === 'edit-place') {
    const p = state.places.find(x => x.id === id);
    openDialog('Edit place',
      '<label>Name<input name="name" value="' + esc(p.name) + '" required /></label>' +
      '<label>Area<input name="area" value="' + esc(p.area || '') + '" /></label>' +
      '<label>Notes<textarea name="notes">' + esc(p.notes || '') + '</textarea></label>',
      data => api('/api/places/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    );
  } else if (action === 'edit-food') {
    const f = state.foods.find(x => x.id === id);
    openDialog('Edit food',
      '<label>Name<input name="name" value="' + esc(f.name) + '" required /></label>' +
      '<label>Notes<textarea name="notes">' + esc(f.notes || '') + '</textarea></label>',
      data => api('/api/foods/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    );
  } else if (action === 'promote-place') {
    const row = state.inbox.find(x => x.id === id);
    let extraction = {};
    try { extraction = JSON.parse(row.extraction_json || '{}').place || {}; } catch (e) {}
    const name = prompt('Place name', extraction.name || row.text?.slice(0, 80) || '');
    if (!name) return;
    await api('/api/inbox/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promote_place: { name, area: extraction.area, cuisine: extraction.cuisine, notes: row.text } })
    });
    await reload();
  } else if (action === 'promote-food') {
    const row = state.inbox.find(x => x.id === id);
    let extraction = {};
    try { extraction = JSON.parse(row.extraction_json || '{}').food || {}; } catch (e) {}
    const name = prompt('Food name', extraction.name || row.text?.slice(0, 80) || '');
    if (!name) return;
    await api('/api/inbox/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promote_food: { name, category: extraction.category || 'Dish to try', notes: row.text } })
    });
    await reload();
  } else if (action === 'dismiss-inbox') {
    await api('/api/inbox/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result_status: 'ignored' })
    });
    await reload();
  }
});

reload().then(() => {
  tickInboxPoll().catch(err => console.error(err));
}).catch(err => console.error(err));
`;
