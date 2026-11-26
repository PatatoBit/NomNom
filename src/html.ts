export function serveAppHtml(): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MooYoung | Miyu &amp; Pat's Nom Nom List</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    :root {
      --bg: #fff8f3;
      --bg-card: #ffffff;
      --ink: #2b2118;
      --muted: #6b5d52;
      --accent: #e85d4c;
      --accent-soft: #ffe8e3;
      --success: #2d8a5c;
      --border: #ecd9cc;
      --shadow: 0 8px 28px rgba(74, 40, 20, 0.08);
      --radius: 14px;
      --font: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      color: var(--ink);
      background: radial-gradient(circle at top, #fff1e6 0%, var(--bg) 55%);
      min-height: 100vh;
    }
    .wrap { max-width: 1120px; margin: 0 auto; padding: 24px 20px 64px; }
    header {
      text-align: center;
      padding: 12px 0 20px;
    }
    header h1 {
      margin: 0;
      font-size: 2.4rem;
      letter-spacing: -0.02em;
    }
    header p { margin: 8px 0 0; color: var(--muted); font-size: 1.05rem; }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      margin-top: 16px;
    }
    .stat {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 0.9rem;
      box-shadow: var(--shadow);
    }
    .stat strong { color: var(--accent); }
    .badge-review {
      background: var(--accent-soft);
      color: var(--accent);
      border-color: #f5b8ae;
    }
    .tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin: 20px 0;
      justify-content: center;
    }
    .tab-btn {
      border: 1px solid var(--border);
      background: var(--bg-card);
      border-radius: 999px;
      padding: 10px 18px;
      cursor: pointer;
      font-weight: 600;
      color: var(--muted);
    }
    .tab-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .panel { display: none; }
    .panel.active { display: block; }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0 0 18px;
      padding: 14px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }
    .filters input, .filters select {
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px 10px;
      font: inherit;
      background: #fff;
    }
    #map {
      height: 420px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      margin-bottom: 12px;
      overflow: hidden;
    }
    .off-map {
      font-size: 0.92rem;
      color: var(--muted);
      margin-bottom: 18px;
    }
    .masonry {
      column-count: 1;
      column-gap: 16px;
    }
    @media (min-width: 640px) { .masonry { column-count: 2; } }
    @media (min-width: 960px) { .masonry { column-count: 3; } }
    .card {
      break-inside: avoid;
      margin-bottom: 16px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .card-img {
      aspect-ratio: 4/3;
      background: linear-gradient(135deg, #ffd8c8, #fff2ea);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
    }
    .card-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .card-body { padding: 14px; }
    .card h3 { margin: 0; font-size: 1.05rem; line-height: 1.35; }
    .meta { color: var(--muted); font-size: 0.88rem; margin-top: 6px; }
    .status {
      margin-top: 8px;
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--accent);
    }
    .status.done { color: var(--success); }
    .links { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.88rem; }
    .links a { color: var(--accent); }
    .actions { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
    .btn {
      border: 1px solid var(--border);
      background: #fff;
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 0.82rem;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .inbox-item {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 12px;
      background: var(--bg-card);
    }
    .toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    dialog {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      max-width: 480px;
      width: calc(100% - 32px);
    }
    dialog form label {
      display: block;
      font-size: 0.85rem;
      margin: 10px 0 4px;
      color: var(--muted);
    }
    dialog input, dialog select, dialog textarea {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 8px;
      font: inherit;
    }
    .city-badge {
      display: inline-block;
      background: #f0e6dc;
      border-radius: 8px;
      padding: 4px 8px;
      font-size: 0.8rem;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>MooYoung</h1>
      <p>Miyu &amp; Pat's Nom Nom List</p>
      <p style="font-size:0.92rem;max-width:520px;margin:10px auto 0;">Restaurants, dishes, and recipes we want to try, and the ones we have already tried.</p>
      <div class="stats" id="stats"></div>
    </header>
    <div class="tabs" role="tablist">
      <button class="tab-btn active" data-tab="places" type="button">Places</button>
      <button class="tab-btn" data-tab="foods" type="button">Foods</button>
      <button class="tab-btn" data-tab="inbox" type="button">DM Inbox</button>
    </div>
    <section id="panel-places" class="panel active">
      <div class="filters" id="place-filters"></div>
      <div id="map"></div>
      <p class="off-map" id="off-map-note"></p>
      <div class="toolbar">
        <button class="btn btn-primary" type="button" id="add-place-btn">Add place</button>
      </div>
      <div class="masonry" id="places-grid"></div>
    </section>
    <section id="panel-foods" class="panel">
      <div class="filters" id="food-filters"></div>
      <div class="toolbar">
        <button class="btn btn-primary" type="button" id="add-food-btn">Add food</button>
      </div>
      <div class="masonry" id="foods-grid"></div>
    </section>
    <section id="panel-inbox" class="panel">
      <div id="inbox-list"></div>
    </section>
  </div>
  <dialog id="edit-dialog"></dialog>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
${APP_SCRIPT}
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

const APP_SCRIPT = `
const state = { places: [], foods: [], inbox: [], map: null, markers: [] };

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function isBangkok(lat, lng) {
  return lat > 13 && lat < 15 && lng > 99.5 && lng < 101.5;
}

function placeholderEmoji(cuisine) {
  const c = (cuisine || '').toLowerCase();
  if (c.includes('japanese')) return '🍜';
  if (c.includes('thai')) return '🍲';
  if (c.includes('korean')) return '🌶️';
  if (c.includes('chinese')) return '🥢';
  return '🍽️';
}

async function api(path, opts) {
  const res = await fetch(path, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function renderStats() {
  const visited = state.places.filter(p => p.status === 'visited').length;
  const tried = state.foods.filter(f => f.status === 'tried').length;
  const review = state.inbox.filter(i => i.result_status === 'needs_review').length;
  const el = document.getElementById('stats');
  el.innerHTML =
    '<span class="stat"><strong>' + state.places.length + '</strong> Places</span>' +
    '<span class="stat"><strong>' + state.foods.length + '</strong> Foods</span>' +
    '<span class="stat"><strong>' + visited + '</strong> Visited</span>' +
    '<span class="stat"><strong>' + tried + '</strong> Tried</span>' +
    (review ? '<span class="stat badge-review"><strong>' + review + '</strong> Needs review</span>' : '');
}

function buildPlaceFilters() {
  const areas = [...new Set(state.places.map(p => p.area).filter(Boolean))].sort();
  const cuisines = [...new Set(state.places.map(p => p.cuisine).filter(Boolean))].sort();
  const el = document.getElementById('place-filters');
  el.innerHTML =
    '<input type="search" id="pf-search" placeholder="Search places..." />' +
    '<select id="pf-area"><option value="">All areas</option>' + areas.map(a => '<option>' + esc(a) + '</option>').join('') + '</select>' +
    '<select id="pf-cuisine"><option value="">All cuisines</option>' + cuisines.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>' +
    '<select id="pf-price"><option value="">Any price</option><option>฿</option><option>$$</option><option>$$$</option></select>' +
    '<select id="pf-status"><option value="">All</option><option value="want_to_go">Want to go</option><option value="visited">Visited</option></select>';
  ['pf-search','pf-area','pf-cuisine','pf-price','pf-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderPlaces);
    document.getElementById(id).addEventListener('change', renderPlaces);
  });
}

function filteredPlaces() {
  const q = (document.getElementById('pf-search')?.value || '').toLowerCase();
  const area = document.getElementById('pf-area')?.value || '';
  const cuisine = document.getElementById('pf-cuisine')?.value || '';
  const price = document.getElementById('pf-price')?.value || '';
  const status = document.getElementById('pf-status')?.value || '';
  return state.places.filter(p => {
    if (q && !(p.name || '').toLowerCase().includes(q)) return false;
    if (area && p.area !== area) return false;
    if (cuisine && p.cuisine !== cuisine) return false;
    if (price && (p.price_level || '') !== price) return false;
    if (status && p.status !== status) return false;
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
    state.map = L.map('map', { scrollWheelZoom: false }).setView([13.7563, 100.5018], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OSM &copy; CARTO',
      maxZoom: 19
    }).addTo(state.map);
  }
  state.markers.forEach(m => state.map.removeLayer(m));
  state.markers = [];
  bkk.forEach(p => {
    const color = p.status === 'visited' ? '#2d8a5c' : '#e85d4c';
    const m = L.circleMarker([p.lat, p.lng], { radius: 9, color, fillColor: color, fillOpacity: 0.85, weight: 2 }).addTo(state.map);
    m.bindPopup('<strong>' + esc(p.name) + '</strong><br/>' + esc(p.area || ''));
    if (p.maps_url) m.on('click', () => window.open(p.maps_url, '_blank'));
    state.markers.push(m);
  });
  if (bkk.length > 1) {
    const bounds = L.latLngBounds(bkk.map(p => [p.lat, p.lng]));
    state.map.fitBounds(bounds, { padding: [24, 24] });
  }
}

function placeCard(p) {
  const img = p.image_url
    ? '<img src="' + esc(p.image_url) + '" alt="" />'
    : '<span>' + placeholderEmoji(p.cuisine) + '</span>';
  const statusLabel = p.status === 'visited' ? 'Visited' + (p.visit_date ? ' ' + esc(p.visit_date) : '') : 'Want to go';
  return '<article class="card" data-id="' + p.id + '">' +
    '<div class="card-img">' + img + '</div>' +
    '<div class="card-body">' +
    '<h3>' + esc(p.name) + '</h3>' +
    '<div class="meta">' + esc([p.area, p.city, p.cuisine, p.price_level].filter(Boolean).join(' · ')) + '</div>' +
    (p.rating ? '<div class="meta">' + esc(p.rating) + ' Google</div>' : '') +
  (!isBangkok(p.lat, p.lng) && p.city ? '<span class="city-badge">' + esc(p.city) + '</span>' : '') +
    '<div class="status' + (p.status === 'visited' ? ' done' : '') + '">' + statusLabel + '</div>' +
    '<div class="links">' +
    (p.maps_url ? '<a href="' + esc(p.maps_url) + '" target="_blank" rel="noreferrer">Maps</a>' : '') +
    (p.source_url ? '<a href="' + esc(p.source_url) + '" target="_blank" rel="noreferrer">Source</a>' : '') +
    '</div>' +
    '<div class="meta">Added by ' + esc(p.added_by || '?') + ', ' + esc(p.added_date || '') + '</div>' +
    (p.notes ? '<div class="meta">' + esc(p.notes) + '</div>' : '') +
    '<div class="actions">' +
    '<button class="btn" data-action="toggle-place" data-id="' + p.id + '">' + (p.status === 'visited' ? 'Mark want to go' : 'Mark visited') + '</button>' +
    '<button class="btn" data-action="edit-place" data-id="' + p.id + '">Edit</button>' +
    '<button class="btn" data-action="delete-place" data-id="' + p.id + '">Delete</button>' +
    '</div></div></article>';
}

function renderPlaces() {
  const list = filteredPlaces();
  document.getElementById('places-grid').innerHTML = list.map(placeCard).join('');
  renderMap(list);
}

function buildFoodFilters() {
  const el = document.getElementById('food-filters');
  const cuisines = [...new Set(state.foods.map(f => f.cuisine).filter(Boolean))].sort();
  el.innerHTML =
    '<input type="search" id="ff-search" placeholder="Search foods..." />' +
    '<select id="ff-cuisine"><option value="">All cuisines</option>' + cuisines.map(c => '<option>' + esc(c) + '</option>').join('') + '</select>' +
    '<select id="ff-status"><option value="">All</option><option value="want_to_go">Want to try</option><option value="tried">Tried</option></select>';
  ['ff-search','ff-cuisine','ff-status'].forEach(id => {
    document.getElementById(id).addEventListener('input', renderFoods);
    document.getElementById(id).addEventListener('change', renderFoods);
  });
}

function filteredFoods() {
  const q = (document.getElementById('ff-search')?.value || '').toLowerCase();
  const cuisine = document.getElementById('ff-cuisine')?.value || '';
  const status = document.getElementById('ff-status')?.value || '';
  return state.foods.filter(f => {
    if (q && !(f.name || '').toLowerCase().includes(q)) return false;
    if (cuisine && f.cuisine !== cuisine) return false;
    if (status && f.status !== status) return false;
    return true;
  });
}

function foodCard(f) {
  const img = f.image_url ? '<img src="' + esc(f.image_url) + '" alt="" />' : '<span>' + placeholderEmoji(f.cuisine) + '</span>';
  const statusLabel = f.status === 'tried' ? 'Tried' : 'Want to try';
  return '<article class="card">' +
    '<div class="card-img">' + img + '</div>' +
    '<div class="card-body">' +
    '<h3>' + esc(f.name) + '</h3>' +
    '<div class="meta">' + esc([f.category, f.cuisine].filter(Boolean).join(' · ')) + '</div>' +
    (f.restaurant_name ? '<div class="meta">At ' + esc(f.restaurant_name) + '</div>' : '') +
    (f.notes ? '<div class="meta">' + esc(f.notes) + '</div>' : '') +
    '<div class="status' + (f.status === 'tried' ? ' done' : '') + '">' + statusLabel + '</div>' +
    '<div class="links">' + (f.source_url ? '<a href="' + esc(f.source_url) + '" target="_blank" rel="noreferrer">Source</a>' : '') + '</div>' +
    '<div class="meta">Added by ' + esc(f.added_by || '?') + ', ' + esc(f.added_date || '') + '</div>' +
    '<div class="actions">' +
    '<button class="btn" data-action="toggle-food" data-id="' + f.id + '">' + (f.status === 'tried' ? 'Want to try' : 'Mark tried') + '</button>' +
    '<button class="btn" data-action="edit-food" data-id="' + f.id + '">Edit</button>' +
    '<button class="btn" data-action="delete-food" data-id="' + f.id + '">Delete</button>' +
    '</div></div></article>';
}

function renderFoods() {
  document.getElementById('foods-grid').innerHTML = filteredFoods().map(foodCard).join('');
}

function renderInbox() {
  const el = document.getElementById('inbox-list');
  if (!state.inbox.length) {
    el.innerHTML = '<p class="meta">No DMs yet. Send reels to mooyoung.save on Instagram.</p>';
    return;
  }
  el.innerHTML = state.inbox.map(row => {
    let reels = [];
    try { reels = JSON.parse(row.reels_json || '[]'); } catch (e) {}
    const reelLinks = reels.map(r => r.url ? '<a href="' + esc(r.url) + '" target="_blank" rel="noreferrer">Reel</a>' : '').join(' ');
    const actions = row.result_status === 'needs_review'
      ? '<button class="btn btn-primary" data-action="promote-place" data-id="' + row.id + '">Add as place</button>' +
        '<button class="btn" data-action="promote-food" data-id="' + row.id + '">Add as food</button>' +
        '<button class="btn" data-action="dismiss-inbox" data-id="' + row.id + '">Dismiss</button>'
      : '<span class="meta">Status: ' + esc(row.result_status) + '</span>';
    return '<div class="inbox-item">' +
      '<div class="meta">From @' + esc(row.sender_username) + ' · ' + esc(row.created_at) + '</div>' +
      '<p>' + esc(row.text || '(no text)') + '</p>' +
      '<div class="links">' + reelLinks + '</div>' +
      '<div class="actions">' + actions + '</div></div>';
  }).join('');
}

async function reload() {
  const [places, foods, inbox] = await Promise.all([
    api('/api/places'),
    api('/api/foods'),
    api('/api/inbox'),
  ]);
  state.places = places;
  state.foods = foods;
  state.inbox = inbox;
  renderStats();
  buildPlaceFilters();
  buildFoodFilters();
  renderPlaces();
  renderFoods();
  renderInbox();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'places' && state.map) setTimeout(() => state.map.invalidateSize(), 80);
  });
});

function openDialog(title, fields, onSubmit) {
  const dlg = document.getElementById('edit-dialog');
  dlg.innerHTML = '<form method="dialog"><h3>' + esc(title) + '</h3>' + fields +
    '<div style="margin-top:14px;display:flex;gap:8px;justify-content:flex-end">' +
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

reload().catch(err => console.error(err));
`;