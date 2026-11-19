// Leonida Trophy Guide — checklist, filters, spoiler mode, detail view.
// Progress lives only in this browser (localStorage) and can be exported/imported.
const KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoilers-v1';

const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const countEl = document.getElementById('count');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const spoilerEl = document.getElementById('spoilers');
const backdrop = document.getElementById('backdrop');
const modalBody = document.getElementById('modal-body');

let doc;
try {
  doc = await (await fetch('data/trophies.json')).json();
} catch (err) {
  grid.innerHTML = '';
  empty.hidden = false;
  empty.textContent = 'Could not load data/trophies.json. Serve this folder over HTTP (node serve.ts) instead of opening the file directly.';
  throw err;
}
const trophies = doc.trophies;

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
earned = new Set([...earned].filter((id) => trophies.some((t) => t.id === id)));

let kind = 'all';
spoilerEl.checked = localStorage.getItem(SPOILER_KEY) !== 'off';

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isConcealed(t) {
  return spoilerEl.checked && t.hidden && !earned.has(t.id);
}

function visibleText(t) {
  // Spoiler-concealed trophies must not leak through search.
  if (isConcealed(t)) return 'hidden trophy';
  return `${t.name} ${t.description} ${t.guide} ${t.source}`.toLowerCase();
}

function matches(t) {
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'story' && t.kind !== 'story') return false;
  if (kind === 'collectibles' && t.kind !== 'collectibles') return false;
  if (kind === 'activities' && t.kind !== 'activities') return false;
  if (kind === 'online') return false;
  const q = searchEl.value.trim().toLowerCase();
  if (q && !visibleText(t).includes(q)) return false;
  return true;
}

function esc(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function badge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}

function tags(t) {
  const parts = [`<span class="tag">${t.kind}</span>`];
  if (t.hidden) parts.push('<span class="tag hidden-tag">hidden</span>');
  if (t.missable) parts.push('<span class="tag missable">⚠ possibly missable</span>');
  return parts.join('');
}

function card(t) {
  const el = document.createElement('article');
  el.className = 'card' + (earned.has(t.id) ? ' earned' : '');
  el.dataset.id = String(t.id);
  const concealed = isConcealed(t);
  const body = concealed
    ? `<p class="spoiler-note">Hidden trophy — earn it in-game to reveal its name, description and guide.</p>`
    : `<p class="desc">${esc(t.description)}</p>
       <p class="guide">${esc(t.guide)}</p>`;
  el.innerHTML = `
    <div class="card-top">
      <input type="checkbox" ${earned.has(t.id) ? 'checked' : ''} aria-label="Mark ${concealed ? 'hidden trophy' : esc(t.name)} as earned">
      <span class="name">${concealed ? 'Hidden trophy' : esc(t.name)}</span>
      ${badge(t)}
    </div>
    ${body}
    <div class="tags">${tags(t)}</div>`;
  el.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) earned.add(t.id);
    else earned.delete(t.id);
    save();
    render();
  });
  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return;
    openDetail(t);
  });
  return el;
}

function render() {
  const shown = trophies.filter(matches);
  grid.replaceChildren(...shown.map(card));
  const total = trophies.length;
  const done = earned.size;
  document.getElementById('progress-text').textContent = `${done} of ${total} earned`;
  document.getElementById('progress-pct').textContent = `${Math.round((done / total) * 100)}%`;
  document.getElementById('progress-fill').style.width = `${(done / total) * 100}%`;
  const byGrade = {};
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    byGrade[g] = trophies.filter((t) => t.grade === g && earned.has(t.id)).length;
  }
  document.getElementById('grade-counts').innerHTML =
    `<span class="pill">Platinum <b>${byGrade.platinum}/1</b></span>` +
    `<span class="pill">Gold <b>${byGrade.gold}/2</b></span>` +
    `<span class="pill">Silver <b>${byGrade.silver}/6</b></span>` +
    `<span class="pill">Bronze <b>${byGrade.bronze}/46</b></span>`;
  if (kind === 'online') {
    empty.hidden = false;
    empty.textContent = 'No online trophies — all 55 GTA VI trophies are single-player and offline.';
    countEl.textContent = 'Showing 0 of 55 trophies';
  } else if (shown.length === 0) {
    empty.hidden = false;
    empty.textContent = 'No trophies match this filter. Try clearing the search or choosing another kind or grade.';
    countEl.textContent = 'Showing 0 of 55 trophies';
  } else {
    empty.hidden = true;
    countEl.textContent = `Showing ${shown.length} of ${total} trophies`;
  }
}

function openDetail(t) {
  const concealed = isConcealed(t);
  modalBody.innerHTML = concealed
    ? `${badge(t)}
       <h2 id="modal-name">Hidden trophy</h2>
       <p class="desc">This trophy stays hidden on PlayStation until you earn it.</p>
       <p class="guide">Its name and description give away story details, so they stay covered while spoiler mode is on. Tick it off in the checklist once you have earned it in-game to reveal the guide, or turn spoiler mode off.</p>`
    : `${badge(t)}
       <h2 id="modal-name">${esc(t.name)}</h2>
       <p class="desc">${esc(t.description)}</p>
       ${t.missable ? '<p class="warn"><b>Possibly missable.</b> See the guide below — this is the one trophy in the set that PowerPyx flags as potentially missable.</p>' : ''}
       <p class="guide">${esc(t.guide)}</p>
       <p class="source">Guide facts: <b>${esc(t.source)}</b> · Official name and description as published on PlayStation Network (via Exophase, cross-checked with PSNProfiles).${t.hidden ? ' This trophy is hidden on PS5 until earned.' : ''}</p>`;
  backdrop.hidden = false;
}

function closeDetail() {
  backdrop.hidden = true;
}

document.getElementById('modal-close').addEventListener('click', closeDetail);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeDetail(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });

document.querySelectorAll('.kinds button').forEach((btn) => {
  btn.addEventListener('click', () => {
    kind = btn.dataset.kind;
    document.querySelectorAll('.kinds button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
  });
});
searchEl.addEventListener('input', render);
gradeEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? 'on' : 'off');
  render();
});

document.getElementById('export').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', earned: [...earned].sort((a, b) => a - b), exportedAt: new Date().toISOString() };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const ids = Array.isArray(data) ? data : data.earned ?? [];
    const next = new Set();
    for (const v of ids) {
      if (typeof v === 'number' && trophies.some((t) => t.id === v)) next.add(v);
      const byName = trophies.find((t) => t.name === v);
      if (byName) next.add(byName.id);
    }
    earned = next;
    save();
    render();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) {
    earned = new Set();
    save();
    render();
  }
});

render();
