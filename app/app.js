// Leonida Trophy Guide — round 4 rewrite.
// A checklist and tracker for all 55 GTA VI trophies on PS5: search, filters,
// spoiler hiding, export and import, a chapter-by-chapter route planner, a
// platinum time budget, the 100% checklist table, the ordered platinum path
// and a missable watch list. Progress is kept in this browser only
// (localStorage) and never leaves the device.
// Deep links, for screenshots and sharing: ?open=<id> opens one trophy's
// guide, ?section=<id> scrolls to a section, ?demo=1 pre-ticks 12 early
// trophies in memory only (never saved) so the tracker shows live progress.
const PROGRESS_KEY = 'gta6-trophy-guide-progress-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoilers-v1';
const DEMO_TICKS = [2, 3, 8, 16, 19, 20, 21, 30, 32, 35, 42, 53];

const query = new URLSearchParams(location.search);
const demo = query.get('demo') === '1';

const gridEl = document.getElementById('grid');
const emptyEl = document.getElementById('empty');
const countEl = document.getElementById('count');
const searchBox = document.getElementById('search');
const gradePick = document.getElementById('grade');
const stagePick = document.getElementById('stage');
const spoilerBox = document.getElementById('spoilers');
const backdropEl = document.getElementById('backdrop');
const modalEl = document.getElementById('modal-body');

let guideDoc;
try {
  guideDoc = await (await fetch('data/trophies.json')).json();
} catch (err) {
  gridEl.innerHTML = '';
  emptyEl.hidden = false;
  emptyEl.textContent = 'Could not load data/trophies.json. Serve this folder over HTTP (node serve.ts) instead of opening the file directly.';
  throw err;
}
const allTrophies = guideDoc.trophies;
const sourceList = guideDoc.sources ?? [];
const sourceByKey = Object.fromEntries(sourceList.map((s) => [s.key, s]));

let earned = new Set();
try { earned = new Set(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]')); } catch { earned = new Set(); }
earned = new Set([...earned].filter((id) => allTrophies.some((t) => t.id === id)));
if (demo) earned = new Set(DEMO_TICKS);

let activeKind = 'all';
let missableFirst = false;
spoilerBox.checked = localStorage.getItem(SPOILER_KEY) !== 'off';
// A deep link can override the spoiler setting for this load only — it is
// never written to localStorage.
if (query.get('spoilers') === 'off') spoilerBox.checked = false;
if (query.get('spoilers') === 'on') spoilerBox.checked = true;

function persist() {
  if (demo) return; // demo ticks are for screenshots only, never persisted
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isHidden(t) {
  return spoilerBox.checked && t.hidden && !earned.has(t.id);
}

function searchable(t) {
  // Spoiler-hidden trophies must not leak through search.
  if (isHidden(t)) return 'hidden trophy';
  return [
    t.name, t.description, t.guide, t.source, t.count ?? '', t.chapter ?? '',
    t.time ?? '', t.when ?? '', ...(t.steps ?? []), ...(t.tips ?? []), ...(t.route ?? []),
  ].join(' ').toLowerCase();
}

function passesFilters(t) {
  if (gradePick.value !== 'all' && t.grade !== gradePick.value) return false;
  if (stagePick.value !== 'all' && String(t.stage) !== stagePick.value) return false;
  if (activeKind === 'missable' && !t.missable) return false;
  if (activeKind === 'story' && t.kind !== 'story') return false;
  if (activeKind === 'collectibles' && t.kind !== 'collectibles') return false;
  if (activeKind === 'activities' && t.kind !== 'activities') return false;
  if (activeKind === 'online') return false;
  const q = searchBox.value.trim().toLowerCase();
  if (q && !searchable(t).includes(q)) return false;
  return true;
}

function orderForDisplay(list) {
  if (!missableFirst) return list;
  const score = (t) => (t.missable ? 0 : t.status === 'unconfirmed' ? 1 : 2);
  return [...list].sort((a, b) => score(a) - score(b) || a.id - b.id);
}

function escapeHtml(s) {
  return String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function gradeBadge(t) {
  return `<span class="badge ${t.grade}">${t.grade}</span>`;
}

function stageTag(t) {
  const labels = { 1: 'Stage 1 · Story', 2: 'Stage 2 · 100%', 3: 'Stage 3 · Cleanup', 4: 'Stage 4 · Platinum' };
  return `<span class="tag stage-tag" title="${escapeHtml(labels[t.stage])}">S${t.stage}</span>`;
}

function difficultyTag(t) {
  if (t.difficulty == null) return '<span class="tag diff-tag">difficulty unknown</span>';
  return `<span class="tag diff-tag" title="Our difficulty estimate, 1 (easy) to 5 (hardest)">difficulty ${t.difficulty}/5</span>`;
}

function factChips(t) {
  const chips = [stageTag(t)];
  if (t.chapter) chips.push(`<span class="tag">${escapeHtml(t.chapter)}</span>`);
  if (t.count) chips.push(`<span class="tag count-tag">${escapeHtml(t.count)}</span>`);
  if (t.time) chips.push(`<span class="tag time-tag">${escapeHtml(t.time)}</span>`);
  if (t.when) chips.push(`<span class="tag when-tag">${escapeHtml(t.when)}</span>`);
  chips.push(difficultyTag(t));
  if (t.status === 'unconfirmed') chips.push('<span class="tag unconfirmed-tag">method unconfirmed</span>');
  return chips.join('');
}

function kindChips(t) {
  const chips = [`<span class="tag">${t.kind}</span>`];
  if (t.hidden) chips.push('<span class="tag hidden-tag">hidden</span>');
  if (t.missable) chips.push('<span class="tag missable">⚠ possibly missable</span>');
  return chips.join('');
}

function buildCard(t) {
  const el = document.createElement('article');
  el.className = 'card' + (earned.has(t.id) ? ' earned' : '');
  el.dataset.id = String(t.id);
  const hidden = isHidden(t);
  const body = hidden
    ? `<p class="spoiler-note">Hidden trophy — earn it in-game to reveal its name, description and guide.</p>`
    : `<p class="desc">${escapeHtml(t.description)}</p>
       <p class="guide">${escapeHtml(t.guide)}</p>
       <div class="facts">${factChips(t)}</div>`;
  el.innerHTML = `
    <div class="card-top">
      <input type="checkbox" ${earned.has(t.id) ? 'checked' : ''} aria-label="Mark ${hidden ? 'hidden trophy' : escapeHtml(t.name)} as earned">
      <span class="name">${hidden ? 'Hidden trophy' : escapeHtml(t.name)}</span>
      ${gradeBadge(t)}
    </div>
    ${body}
    <div class="tags">${kindChips(t)}</div>`;
  el.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) earned.add(t.id);
    else earned.delete(t.id);
    persist();
    renderAll();
  });
  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'INPUT') return;
    showTrophy(t);
  });
  return el;
}

function renderAudit() {
  const named = allTrophies.filter((t) => t.name.trim()).length;
  const described = allTrophies.filter((t) => t.description.trim()).length;
  const guided = allTrophies.filter((t) => t.guide.trim()).length;
  const cited = allTrophies.filter((t) => t.source.trim()).length;
  const stepped = allTrophies.filter((t) => Array.isArray(t.steps) && t.steps.length > 0).length;
  const tipped = allTrophies.filter((t) => Array.isArray(t.tips) && t.tips.length > 0).length;
  const estimated = allTrophies.filter((t) => t.difficulty != null && t.time).length;
  const unconfirmed = allTrophies.filter((t) => t.status === 'unconfirmed').length;
  const missable = allTrophies.filter((t) => t.missable).length;
  const hidden = allTrophies.filter((t) => t.hidden).length;
  document.getElementById('audit').innerHTML =
    `<span class="audit-item"><b>${named}/55</b> official names</span>` +
    `<span class="audit-item"><b>${described}/55</b> official descriptions</span>` +
    `<span class="audit-item"><b>${guided}/55</b> guides</span>` +
    `<span class="audit-item"><b>${stepped}/55</b> step-by-step guides</span>` +
    `<span class="audit-item"><b>${tipped}/55</b> with tips</span>` +
    `<span class="audit-item"><b>${estimated}/55</b> difficulty + time estimates</span>` +
    `<span class="audit-item"><b>${cited}/55</b> cited sources</span>` +
    `<span class="audit-item"><b>${hidden}</b> hidden · <b>${missable}</b> missable</span>` +
    `<span class="audit-item warn"><b>${unconfirmed}</b> methods unconfirmed</span>` +
    `<span class="audit-item"><b>list checked 20 Nov 2026</b></span>`;
}

function renderRoute() {
  const path = guideDoc.path ?? [];
  const host = document.getElementById('path');
  if (!host) return;
  host.replaceChildren(...path.map((step, i) => {
    const done = step.trophies.filter((id) => earned.has(id)).length;
    const el = document.createElement('li');
    el.className = 'path-step' + (done === step.trophies.length ? ' done' : '');
    el.innerHTML = `
      <div class="path-num">${i + 1}</div>
      <div class="path-body">
        <h3>${escapeHtml(step.title)}</h3>
        <p>${escapeHtml(step.detail)}</p>
        <p class="path-count"><b>${done}/${step.trophies.length}</b> trophies done in this step</p>
      </div>`;
    return el;
  }));
}

function renderChapters() {
  const chapters = guideDoc.chapters ?? [];
  const host = document.getElementById('chapters');
  if (!host) return;
  host.replaceChildren(...chapters.map((ch) => {
    const done = ch.trophies.filter((id) => earned.has(id)).length;
    const el = document.createElement('article');
    el.className = 'chapter';
    el.innerHTML = `
      <div class="chapter-head">
        <h3>${escapeHtml(ch.title)}</h3>
        <span class="chapter-count"><b>${done}/${ch.trophies.length}</b> trophies</span>
      </div>
      <p class="chapter-focus">${escapeHtml(ch.focus)}</p>
      <p>${escapeHtml(ch.advice)}</p>
      <p class="chapter-save">${escapeHtml(ch.saveNote)}</p>
      <div class="chapter-trophies">${ch.trophies.map((id) => {
        const t = allTrophies.find((x) => x.id === id);
        if (!t) return '';
        const label = isHidden(t) ? 'Hidden trophy' : t.name;
        return `<button type="button" class="stage-chip${earned.has(id) ? ' done' : ''}" data-id="${id}">${escapeHtml(label)}</button>`;
      }).join('')}</div>`;
    el.querySelectorAll('.stage-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = allTrophies.find((x) => x.id === Number(btn.dataset.id));
        if (t) showTrophy(t);
      });
    });
    return el;
  }));
}

function renderBudget() {
  const rows = guideDoc.budget ?? [];
  const body = document.getElementById('budget-body');
  if (!body) return;
  body.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${escapeHtml(r.activity)}</b></td><td class="c100-need">${escapeHtml(r.hours)}</td><td>${escapeHtml(r.note)}</td>`;
    return tr;
  }));
}

function renderChecklist100() {
  const rows = guideDoc.checklist100 ?? [];
  const body = document.getElementById('c100-body');
  if (!body) return;
  body.replaceChildren(...rows.map((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${escapeHtml(r.item)}</b></td><td class="c100-need">${escapeHtml(r.required)}</td><td>${escapeHtml(r.note)}</td>`;
    return tr;
  }));
}

function renderStages() {
  renderRoute();
  const guides = guideDoc.stageGuides ?? [];
  const host = document.getElementById('stages');
  host.replaceChildren(...[1, 2, 3, 4].map((n) => {
    const meta = guides.find((g) => g.stage === n) ?? { title: `Stage ${n}`, hours: '', lede: '' };
    const list = allTrophies.filter((t) => t.stage === n);
    const done = list.filter((t) => earned.has(t.id)).length;
    const el = document.createElement('article');
    el.className = 'stage';
    el.innerHTML = `
      <h3>${escapeHtml(meta.title)}</h3>
      <div class="hours">${escapeHtml(meta.hours)}</div>
      <p>${escapeHtml(meta.lede)}</p>
      <p class="stage-count"><b>${done}/${list.length}</b> trophies in this stage</p>
      <div class="stage-trophies">${list.map((t) => {
        const label = isHidden(t) ? 'Hidden trophy' : t.name;
        return `<button type="button" class="stage-chip${earned.has(t.id) ? ' done' : ''}" data-id="${t.id}">${escapeHtml(label)}${t.count ? ` <span class="chip-count">${escapeHtml(t.count)}</span>` : ''}</button>`;
      }).join('')}</div>`;
    el.querySelectorAll('.stage-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = allTrophies.find((x) => x.id === Number(btn.dataset.id));
        if (t) showTrophy(t);
      });
    });
    return el;
  }));
}

function renderSourceList() {
  document.getElementById('source-list').innerHTML = sourceList.map((s) =>
    `<li><b>${escapeHtml(s.name)}</b> — updated ${escapeHtml(s.updated)} · <a href="${escapeHtml(s.url)}" rel="noopener" target="_blank">${escapeHtml(s.url)}</a></li>`,
  ).join('') +
  `<li><b>PSNProfiles — GTA VI trophy list</b> — cross-check for names, descriptions and grades, read 18 Nov 2026 (no direct link listed; see the Exophase list above).</li>`;
}

function renderAll() {
  const shown = orderForDisplay(allTrophies.filter(passesFilters));
  gridEl.replaceChildren(...shown.map(buildCard));
  const total = allTrophies.length;
  const done = earned.size;
  document.getElementById('progress-text').textContent = `${done} of ${total} earned`;
  document.getElementById('progress-pct').textContent = `${Math.round((done / total) * 100)}%`;
  document.getElementById('progress-fill').style.width = `${(done / total) * 100}%`;
  const byGrade = {};
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    byGrade[g] = allTrophies.filter((t) => t.grade === g && earned.has(t.id)).length;
  }
  document.getElementById('grade-counts').innerHTML =
    `<span class="pill">Platinum <b>${byGrade.platinum}/1</b></span>` +
    `<span class="pill">Gold <b>${byGrade.gold}/2</b></span>` +
    `<span class="pill">Silver <b>${byGrade.silver}/6</b></span>` +
    `<span class="pill">Bronze <b>${byGrade.bronze}/46</b></span>`;
  if (activeKind === 'online') {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No online trophies — all 55 GTA VI trophies are single-player and offline.';
    countEl.textContent = 'Showing 0 of 55 trophies';
  } else if (shown.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No trophies match this filter. Try clearing the search or choosing another kind, grade or stage.';
    countEl.textContent = 'Showing 0 of 55 trophies';
  } else {
    emptyEl.hidden = true;
    countEl.textContent = `Showing ${shown.length} of ${total} trophies`;
  }
  renderStages();
  renderChapters();
}

function citationBlock(t) {
  const guideSource = sourceByKey.powerpyx;
  const listSource = sourceByKey.exophase;
  const guideLine = guideSource
    ? `Guide facts: <b>${escapeHtml(t.source)}</b> — <a href="${escapeHtml(guideSource.url)}" rel="noopener" target="_blank">${escapeHtml(guideSource.name)}</a>, updated ${escapeHtml(guideSource.updated)}.`
    : `Guide facts: <b>${escapeHtml(t.source)}</b>.`;
  const listLine = listSource
    ? `Official name and description as published on PlayStation Network (<a href="${escapeHtml(listSource.url)}" rel="noopener" target="_blank">${escapeHtml(listSource.name)}</a>, read ${escapeHtml(listSource.updated)}, cross-checked with PSNProfiles).`
    : 'Official name and description as published on PlayStation Network.';
  return `${guideLine} ${listLine}${t.hidden ? ' This trophy is hidden on PS5 until earned.' : ''}`;
}

function showTrophy(t) {
  const hidden = isHidden(t);
  const keyFacts = [
    `Stage ${t.stage} of the platinum roadmap`,
    t.chapter ? `unlocked in ${t.chapter}` : null,
    t.count ? `key count: ${t.count}` : null,
    t.difficulty != null ? `difficulty ${t.difficulty}/5 (our estimate)` : 'difficulty unknown — no confirmed method yet',
    t.time ? `about ${t.time}` : null,
    t.when ? `best done: ${t.when}` : null,
    t.missable ? 'possibly missable' : 'not missable',
    t.hidden ? 'hidden on PS5 until earned' : 'visible from the start',
  ].filter(Boolean);
  const stepsHtml = Array.isArray(t.steps) && t.steps.length > 0
    ? `<h3 class="steps-h">How to earn it</h3><ol class="steps">${t.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ol>`
    : '';
  const tipsHtml = Array.isArray(t.tips) && t.tips.length > 0
    ? `<h3 class="steps-h">Tips</h3><ul class="tips">${t.tips.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';
  const routeHtml = Array.isArray(t.route) && t.route.length > 0
    ? `<h3 class="steps-h">Where it fits in the run</h3><ul class="tips">${t.route.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
    : '';
  modalEl.innerHTML = hidden
    ? `${gradeBadge(t)}
       <h2 id="modal-name">Hidden trophy</h2>
       <p class="desc">This trophy stays hidden on PlayStation until you earn it.</p>
       <p class="guide">Its name and description give away story details, so they stay covered while spoiler mode is on. Tick it off in the checklist once you have earned it in-game to reveal the guide, or turn spoiler mode off.</p>
       <p class="source">Official name and description as published on PlayStation Network (Exophase list, read 18 Nov 2026, cross-checked with PSNProfiles).</p>`
    : `${gradeBadge(t)}
       <h2 id="modal-name">${escapeHtml(t.name)}</h2>
       <p class="desc">${escapeHtml(t.description)}</p>
       <p class="keyfacts">${keyFacts.map(escapeHtml).join(' · ')}</p>
       ${t.status === 'unconfirmed' ? '<p class="warn"><b>Method unconfirmed.</b> No guide has pinned down how this trophy unlocks yet — the description is the only solid fact. Treat any method you read elsewhere as a rumour until a cited guide confirms it.</p>' : ''}
       ${t.missable ? '<p class="warn"><b>Possibly missable.</b> This is the one trophy in the set that PowerPyx flags as potentially missable — see the missable watch list. Do the Chapter 1 balcony meditation before the chapter ends.</p>' : ''}
       <p class="guide">${escapeHtml(t.guide)}</p>
       ${stepsHtml}
       ${tipsHtml}
       ${routeHtml}
       <p class="source">${citationBlock(t)}</p>`;
  backdropEl.hidden = false;
}

function closeTrophy() {
  backdropEl.hidden = true;
}

document.getElementById('modal-close').addEventListener('click', closeTrophy);
backdropEl.addEventListener('click', (e) => { if (e.target === backdropEl) closeTrophy(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTrophy(); });

document.querySelectorAll('.kinds button').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeKind = btn.dataset.kind;
    document.querySelectorAll('.kinds button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    renderAll();
  });
});
searchBox.addEventListener('input', renderAll);
gradePick.addEventListener('change', renderAll);
stagePick.addEventListener('change', renderAll);
spoilerBox.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerBox.checked ? 'on' : 'off');
  renderAll();
});
document.getElementById('sort-missable').addEventListener('change', (e) => {
  missableFirst = e.target.checked;
  renderAll();
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
      if (typeof v === 'number' && allTrophies.some((t) => t.id === v)) next.add(v);
      const byName = allTrophies.find((t) => t.name === v);
      if (byName) next.add(byName.id);
    }
    earned = next;
    persist();
    renderAll();
  } catch {
    alert('That file is not a valid progress export.');
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (confirm('Clear all earned ticks?')) {
    earned = new Set();
    persist();
    renderAll();
  }
});

renderAudit();
renderSourceList();
renderChecklist100();
renderBudget();
renderAll();

// Deep links, applied after the first render so the page is already built.
const openId = Number(query.get('open'));
if (openId) {
  const t = allTrophies.find((x) => x.id === openId);
  if (t) showTrophy(t);
}
const section = query.get('section');
if (section) {
  // Offset for the sticky toolbar (its height wraps with the viewport)
  // so the section heading is not covered.
  const sectionEl = document.getElementById(section);
  const toolbarH = document.querySelector('.toolbar')?.getBoundingClientRect().height ?? 90;
  if (sectionEl) {
    window.scrollTo({ top: sectionEl.getBoundingClientRect().top + window.scrollY - toolbarH - 12, behavior: 'instant' });
  }
}
