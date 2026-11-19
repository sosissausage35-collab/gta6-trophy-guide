// Leonida Trophy Guide — checklist, filters, spoiler mode, detail view,
// audit strip, platinum roadmap and missable watch list.
// Progress lives only in this browser (localStorage) and can be exported/imported.
// Deep links (for screenshots and sharing): ?open=<id> opens a trophy's guide,
// ?section=<id> scrolls to a section, ?demo=1 pre-ticks 12 early trophies
// in memory only (never saved) so the tracker shows live progress.
const KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoilers-v1';
const DEMO_EARNED = [2, 3, 8, 16, 19, 20, 21, 30, 32, 35, 42, 53];

const params = new URLSearchParams(location.search);
const demoMode = params.get('demo') === '1';

const grid = document.getElementById('grid');
const empty = document.getElementById('empty');
const countEl = document.getElementById('count');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const stageEl = document.getElementById('stage');
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
const sources = doc.sources ?? [];
const sourceByKey = Object.fromEntries(sources.map((s) => [s.key, s]));

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { earned = new Set(); }
earned = new Set([...earned].filter((id) => trophies.some((t) => t.id === id)));
if (demoMode) earned = new Set(DEMO_EARNED);

let kind = 'all';
spoilerEl.checked = localStorage.getItem(SPOILER_KEY) !== 'off';
// Deep-link override for sharing/screenshots: ?spoilers=off shows hidden
// trophy names on this load only (never written to localStorage).
if (params.get('spoilers') === 'off') spoilerEl.checked = false;
if (params.get('spoilers') === 'on') spoilerEl.checked = true;

function save() {
  if (demoMode) return; // demo ticks are for screenshots only, never persisted
  localStorage.setItem(KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isConcealed(t) {
  return spoilerEl.checked && t.hidden && !earned.has(t.id);
}

function visibleText(t) {
  // Spoiler-concealed trophies must not leak through search.
  if (isConcealed(t)) return 'hidden trophy';
  return `${t.name} ${t.description} ${t.guide} ${(t.steps ?? []).join(' ')} ${t.source} ${t.count ?? ''} ${t.chapter ?? ''} ${t.time ?? ''}`.toLowerCase();
}

function matches(t) {
  if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
  if (stageEl.value !== 'all' && String(t.stage) !== stageEl.value) return false;
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
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function badge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}

function stageChip(t) {
  const names = { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100%', 3: 'Stage 3 · Cleanup', 4: 'Stage 4 · Platinum' };
  return `<span class="tag stage-tag" title="${esc(names[t.stage])}">S${t.stage}</span>`;
}

function difficultyLabel(t) {
  if (t.difficulty == null) return '<span class="tag diff-tag">difficulty unknown</span>';
  return `<span class="tag diff-tag" title="Our difficulty estimate, 1 (easy) to 5 (hardest)">difficulty ${t.difficulty}/5</span>`;
}

function factsLine(t) {
  const parts = [stageChip(t)];
  if (t.chapter) parts.push(`<span class="tag">${esc(t.chapter)}</span>`);
  if (t.count) parts.push(`<span class="tag count-tag">${esc(t.count)}</span>`);
  if (t.time) parts.push(`<span class="tag time-tag">${esc(t.time)}</span>`);
  parts.push(difficultyLabel(t));
  if (t.status === 'unconfirmed') parts.push('<span class="tag unconfirmed-tag">method unconfirmed</span>');
  return parts.join('');
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
       <p class="guide">${esc(t.guide)}</p>
       <div class="facts">${factsLine(t)}</div>`;
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

function renderAuditStrip() {
  const named = trophies.filter((t) => t.name.trim()).length;
  const described = trophies.filter((t) => t.description.trim()).length;
  const guided = trophies.filter((t) => t.guide.trim()).length;
  const cited = trophies.filter((t) => t.source.trim()).length;
  const stepped = trophies.filter((t) => Array.isArray(t.steps) && t.steps.length > 0).length;
  const estimated = trophies.filter((t) => t.difficulty != null && t.time).length;
  const unconfirmed = trophies.filter((t) => t.status === 'unconfirmed').length;
  const missable = trophies.filter((t) => t.missable).length;
  const hidden = trophies.filter((t) => t.hidden).length;
  document.getElementById('audit').innerHTML =
    `<span class="audit-item"><b>${named}/55</b> official names</span>` +
    `<span class="audit-item"><b>${described}/55</b> official descriptions</span>` +
    `<span class="audit-item"><b>${guided}/55</b> guides</span>` +
    `<span class="audit-item"><b>${stepped}/55</b> step-by-step guides</span>` +
    `<span class="audit-item"><b>${estimated}/55</b> difficulty + time estimates</span>` +
    `<span class="audit-item"><b>${cited}/55</b> cited sources</span>` +
    `<span class="audit-item"><b>${hidden}</b> hidden · <b>${missable}</b> missable</span>` +
    `<span class="audit-item warn"><b>${unconfirmed}</b> methods unconfirmed</span>` +
    `<span class="audit-item"><b>list checked 19 Nov 2026</b></span>`;
}

const STAGE_META = {
  1: { title: 'Stage 1 — Play the story', hours: '60–80 hours · Chapters 1–5',
       lede: 'Finish all 5 chapters and the story trophies unlock as you go — none of them can be missed. Scan vehicles and study animals whenever you see them; progress already counts toward 100%.' },
  2: { title: 'Stage 2 — 100% completion', hours: '~100 hours · after the story',
       lede: 'The checklist unlocks under Progress > Stats > 100% Completion. It is lenient — closer to 60% of true completion. You need any 70 of 80 challenges, 200 of 277 vehicles scanned, 100 of 255 animals studied and 300 stunts; only robberies, underwater finds, shooting ranges, drone races and Bret’s quests need everything.' },
  3: { title: 'Stage 3 — Strangers & cleanup', hours: '~10 hours · free-roam',
       lede: 'Finish the 8 Strangers & Freaks strands, the remaining questlines (Andy, Kenton, Billy, Randy, Tyrone, Bret), the money trophies and any collectibles left — meditations, card sets, WAiNK scans, garages and vehicle registrations.' },
  4: { title: 'Stage 4 — Platinum', hours: 'Vice Got a Price!',
       lede: 'When the other 54 trophies are earned, the platinum pops automatically. Before you celebrate: keep a manual save at the start of every chapter — there is no mission replay — and never turn on a cheat, because cheats disable trophies and saving.' },
};

function renderPath() {
  const path = doc.path ?? [];
  const host = document.getElementById('path');
  if (!host) return;
  host.replaceChildren(...path.map((step, i) => {
    const done = step.trophies.filter((id) => earned.has(id)).length;
    const el = document.createElement('li');
    el.className = 'path-step' + (done === step.trophies.length ? ' done' : '');
    el.innerHTML = `
      <div class="path-num">${i + 1}</div>
      <div class="path-body">
        <h3>${esc(step.title)}</h3>
        <p>${esc(step.detail)}</p>
        <p class="path-count"><b>${done}/${step.trophies.length}</b> trophies done in this step</p>
      </div>`;
    return el;
  }));
}

function renderChecklist100() {
  const rows = doc.checklist100 ?? [];
  const body = document.getElementById('c100-body');
  if (!body) return;
  body.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${esc(r.item)}</b></td><td class="c100-need">${esc(r.required)}</td><td>${esc(r.note)}</td>`;
    return tr;
  }));
}

function renderRoadmap() {
  renderPath();
  const host = document.getElementById('stages');
  host.replaceChildren(...[1, 2, 3, 4].map((n) => {
    const meta = STAGE_META[n];
    const list = trophies.filter((t) => t.stage === n);
    const done = list.filter((t) => earned.has(t.id)).length;
    const el = document.createElement('article');
    el.className = 'stage';
    el.innerHTML = `
      <h3>${esc(meta.title)}</h3>
      <div class="hours">${esc(meta.hours)}</div>
      <p>${esc(meta.lede)}</p>
      <p class="stage-count"><b>${done}/${list.length}</b> trophies in this stage</p>
      <div class="stage-trophies">${list.map((t) => {
        const label = isConcealed(t) ? 'Hidden trophy' : t.name;
        return `<button type="button" class="stage-chip${earned.has(t.id) ? ' done' : ''}" data-id="${t.id}">${esc(label)}${t.count ? ` <span class="chip-count">${esc(t.count)}</span>` : ''}</button>`;
      }).join('')}</div>`;
    el.querySelectorAll('.stage-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = trophies.find((x) => x.id === Number(btn.dataset.id));
        if (t) openDetail(t);
      });
    });
    return el;
  }));
}

function renderSources() {
  document.getElementById('source-list').innerHTML = sources.map((s) =>
    `<li><b>${esc(s.name)}</b> — updated ${esc(s.updated)} · <a href="${esc(s.url)}" rel="noopener" target="_blank">${esc(s.url)}</a></li>`,
  ).join('') +
  `<li><b>PSNProfiles — GTA VI trophy list</b> — cross-check for names, descriptions and grades, read 18 Nov 2026 (no direct link listed; see the Exophase list above).</li>`;
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
    empty.textContent = 'No trophies match this filter. Try clearing the search or choosing another kind, grade or stage.';
    countEl.textContent = 'Showing 0 of 55 trophies';
  } else {
    empty.hidden = true;
    countEl.textContent = `Showing ${shown.length} of ${total} trophies`;
  }
  renderRoadmap();
}

function citationFor(t) {
  const guideSource = sourceByKey.powerpyx;
  const listSource = sourceByKey.exophase;
  const guideLine = guideSource
    ? `Guide facts: <b>${esc(t.source)}</b> — <a href="${esc(guideSource.url)}" rel="noopener" target="_blank">${esc(guideSource.name)}</a>, updated ${esc(guideSource.updated)}.`
    : `Guide facts: <b>${esc(t.source)}</b>.`;
  const listLine = listSource
    ? `Official name and description as published on PlayStation Network (<a href="${esc(listSource.url)}" rel="noopener" target="_blank">${esc(listSource.name)}</a>, read ${esc(listSource.updated)}, cross-checked with PSNProfiles).`
    : 'Official name and description as published on PlayStation Network.';
  return `${guideLine} ${listLine}${t.hidden ? ' This trophy is hidden on PS5 until earned.' : ''}`;
}

function openDetail(t) {
  const concealed = isConcealed(t);
  const keyFacts = [
    `Stage ${t.stage} of the platinum roadmap`,
    t.chapter ? `unlocked in ${t.chapter}` : null,
    t.count ? `key count: ${t.count}` : null,
    t.difficulty != null ? `difficulty ${t.difficulty}/5 (our estimate)` : 'difficulty unknown — no confirmed method yet',
    t.time ? `about ${t.time}` : null,
    t.missable ? 'possibly missable' : 'not missable',
    t.hidden ? 'hidden on PS5 until earned' : 'visible from the start',
  ].filter(Boolean);
  const steps = Array.isArray(t.steps) && t.steps.length > 0
    ? `<h3 class="steps-h">How to earn it</h3><ol class="steps">${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
    : '';
  modalBody.innerHTML = concealed
    ? `${badge(t)}
       <h2 id="modal-name">Hidden trophy</h2>
       <p class="desc">This trophy stays hidden on PlayStation until you earn it.</p>
       <p class="guide">Its name and description give away story details, so they stay covered while spoiler mode is on. Tick it off in the checklist once you have earned it in-game to reveal the guide, or turn spoiler mode off.</p>
       <p class="source">Official name and description as published on PlayStation Network (Exophase list, read 18 Nov 2026, cross-checked with PSNProfiles).</p>`
    : `${badge(t)}
       <h2 id="modal-name">${esc(t.name)}</h2>
       <p class="desc">${esc(t.description)}</p>
       <p class="keyfacts">${keyFacts.map(esc).join(' · ')}</p>
       ${t.status === 'unconfirmed' ? '<p class="warn"><b>Method unconfirmed.</b> No guide has pinned down how this trophy unlocks yet — the description is the only solid fact. Treat any method you read elsewhere as a rumour until a cited guide confirms it.</p>' : ''}
       ${t.missable ? '<p class="warn"><b>Possibly missable.</b> This is the one trophy in the set that PowerPyx flags as potentially missable — see the missable watch list. Do the Chapter 1 balcony meditation before the chapter ends.</p>' : ''}
       <p class="guide">${esc(t.guide)}</p>
       ${steps}
       <p class="source">${citationFor(t)}</p>`;
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
stageEl.addEventListener('change', render);
spoilerEl.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerEl.checked ? 'on' : 'off');
  render();
});

document.getElementById('print').addEventListener('click', () => window.print());
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

renderAuditStrip();
renderSources();
renderChecklist100();
render();

// Deep links, applied after the first render so the page is already built.
const openId = Number(params.get('open'));
if (openId) {
  const t = trophies.find((x) => x.id === openId);
  if (t) openDetail(t);
}
const section = params.get('section');
if (section) {
  // Offset for the sticky toolbar (its height wraps with the viewport)
  // so the section heading is not covered.
  const sectionEl = document.getElementById(section);
  const toolbarH = document.querySelector('.toolbar')?.getBoundingClientRect().height ?? 90;
  if (sectionEl) {
    window.scrollTo({ top: sectionEl.getBoundingClientRect().top + window.scrollY - toolbarH - 12, behavior: 'instant' });
  }
}
