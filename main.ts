// Leonida Trophy Guide — make.fun program/v1 entrypoint (Node 22, standard library only).
//
// The entry is the static guide in app/ (index.html, app.js, style.css,
// data/trophies.json): plain files, no build step, nothing fetched over the
// network. Before staging it, this program checks the data the judge will
// look at: all 55 official trophies named exactly once, each with a
// non-blank guide, a valid grade and a roadmap stage, plus numbered steps,
// practical tips, a note on where it fits in the run and a when-to-do-it
// line, a difficulty estimate (1–5, or none for the 3 trophies with no
// confirmed method) and a time estimate on each, the 100% checklist table,
// the ordered platinum path covering all 55, one chapter plan per chapter
// and the platinum time budget, plus 3 or 4 screenshots inside the size
// cap. Then it copies app/ and screenshots/ from beside this file into the
// output directory and writes dossier.json there with the vendored make.fun
// library, using the same caps the scorer enforces (at most 4 screenshots
// of at most 256 KiB each, at most 993 entries and 48 MiB inside app/).
//
// Leave vendor/makefun-frontend.ts untouched: the scorer requires
// dossier.json to be byte for byte what its own copy of that library writes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const ALLOWED_GRADES = new Set(['platinum', 'gold', 'silver', 'bronze']);
const SCREENSHOT_CAP = 262144;

function abort(message) {
  throw new Error(`Leonida Trophy Guide: ${message}`);
}

function nonBlank(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value) {
  return Array.isArray(value) && value.length >= 1 && value.every((v) => nonBlank(v));
}

function checkGuideFile() {
  const raw = readFileSync(join(repoRoot, 'app', 'data', 'trophies.json'), 'utf8');
  const doc = JSON.parse(raw);
  const trophies = doc.trophies;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    abort(`expected 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'no array'}`);
  }
  const seen = new Set();
  let cited = 0;
  let unconfirmed = 0;
  let withSteps = 0;
  let withTips = 0;
  let withRoute = 0;
  let withWhen = 0;
  let estimated = 0;
  for (const t of trophies) {
    if (!nonBlank(t.name)) abort(`trophy ${t.id} has no name`);
    if (seen.has(t.name)) abort(`duplicate trophy name: ${t.name}`);
    seen.add(t.name);
    if (!nonBlank(t.description)) abort(`${t.name}: no official description`);
    if (!nonBlank(t.guide)) abort(`${t.name}: no guide`);
    if (!ALLOWED_GRADES.has(t.grade)) abort(`${t.name}: bad grade ${t.grade}`);
    if (![1, 2, 3, 4].includes(t.stage)) abort(`${t.name}: no roadmap stage`);
    if (nonBlank(t.source)) cited += 1;
    if (t.status === 'unconfirmed') unconfirmed += 1;
    // Round 4: every guide carries numbered steps, practical tips, a route
    // note and a when line, and every trophy with a confirmed method has
    // our difficulty (1–5) and time estimates.
    if (!stringList(t.steps)) abort(`${t.name}: no step-by-step guide`);
    withSteps += 1;
    if (!stringList(t.tips)) abort(`${t.name}: no tips`);
    withTips += 1;
    if (!stringList(t.route)) abort(`${t.name}: no route note`);
    withRoute += 1;
    if (!nonBlank(t.when)) abort(`${t.name}: no when-to-do-it line`);
    withWhen += 1;
    if (!nonBlank(t.time)) abort(`${t.name}: no time estimate`);
    if (t.status === 'unconfirmed') {
      if (t.difficulty != null) abort(`${t.name}: unconfirmed trophy must not carry a difficulty estimate`);
    } else if (!Number.isInteger(t.difficulty) || t.difficulty < 1 || t.difficulty > 5) {
      abort(`${t.name}: bad difficulty ${t.difficulty}`);
    } else {
      estimated += 1;
    }
  }
  const perStage = [1, 2, 3, 4].map((n) => trophies.filter((t) => t.stage === n).length);
  // The 100% checklist table.
  const hundred = doc.checklist100;
  if (!Array.isArray(hundred) || hundred.length < 8) abort('checklist100 table is missing or too short');
  for (const row of hundred) {
    if (!nonBlank(row.item) || !nonBlank(row.required) || !nonBlank(row.note)) {
      abort('checklist100 has an incomplete row');
    }
  }
  // The ordered platinum path, covering all 55.
  const path = doc.path;
  if (!Array.isArray(path) || path.length < 6) abort('platinum path is missing or too short');
  const ids = new Set(trophies.map((t) => t.id));
  const covered = new Set();
  for (const step of path) {
    if (!nonBlank(step.title) || !nonBlank(step.detail)) abort('platinum path has an incomplete step');
    if (!Array.isArray(step.trophies) || step.trophies.length < 1) abort(`path step "${step.title}" names no trophies`);
    for (const id of step.trophies) {
      if (!ids.has(id)) abort(`path step "${step.title}" names unknown trophy ${id}`);
      covered.add(id);
    }
  }
  if (covered.size !== 55) abort(`platinum path covers ${covered.size} of 55 trophies`);
  // The chapter route planner: one plan per chapter, naming real trophies.
  const chapters = doc.chapters;
  if (!Array.isArray(chapters) || chapters.length !== 5) abort('chapter planner is missing or incomplete');
  for (const ch of chapters) {
    if (!Number.isInteger(ch.n) || ch.n < 1 || ch.n > 5) abort('chapter planner has a bad chapter number');
    if (!nonBlank(ch.title) || !nonBlank(ch.focus) || !nonBlank(ch.advice) || !nonBlank(ch.saveNote)) {
      abort(`chapter ${ch.n} has an incomplete plan`);
    }
    if (!Array.isArray(ch.trophies) || ch.trophies.length < 1) abort(`chapter ${ch.n} names no trophies`);
    for (const id of ch.trophies) {
      if (!ids.has(id)) abort(`chapter ${ch.n} names unknown trophy ${id}`);
    }
  }
  // The platinum time budget.
  const budget = doc.budget;
  if (!Array.isArray(budget) || budget.length < 5) abort('time budget is missing or too short');
  for (const row of budget) {
    if (!nonBlank(row.activity) || !nonBlank(row.hours) || !nonBlank(row.note)) {
      abort('time budget has an incomplete row');
    }
  }
  // One stage guide per roadmap stage.
  const stageGuides = doc.stageGuides;
  if (!Array.isArray(stageGuides) || stageGuides.length !== 4) abort('stage guides are missing or incomplete');
  for (const g of stageGuides) {
    if (![1, 2, 3, 4].includes(g.stage) || !nonBlank(g.title) || !nonBlank(g.hours) || !nonBlank(g.lede)) {
      abort('stage guides have an incomplete entry');
    }
  }
  return {
    total: trophies.length, cited, unconfirmed, perStage,
    withSteps, withTips, withRoute, withWhen, estimated,
    hundred: hundred.length, pathSteps: path.length,
    chapters: chapters.length, budget: budget.length, stageGuides: stageGuides.length,
  };
}

function checkShots() {
  const dir = join(repoRoot, 'screenshots');
  if (!existsSync(dir)) abort('screenshots/ is missing');
  const files = readdirSync(dir).filter((f) => !f.startsWith('.') && /\.(png|jpe?g)$/i.test(f));
  if (files.length < 3 || files.length > 4) {
    abort(`expected 3 or 4 screenshots, found ${files.length}`);
  }
  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    if (size > SCREENSHOT_CAP) abort(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
  }
  return files;
}

const stats = checkGuideFile();
const shots = checkShots();

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(
  `Leonida Trophy Guide: ${stats.total} trophies, ${stats.cited} cited guides, ` +
  `${stats.withSteps} step-by-step guides, ${stats.withTips} with tips, ` +
  `${stats.withRoute} with route notes, ${stats.withWhen} with when lines, ` +
  `${stats.estimated} difficulty + time estimates, ` +
  `${stats.hundred} 100% checklist rows, ${stats.pathSteps} platinum-path steps, ` +
  `${stats.chapters} chapter plans, ${stats.budget} budget rows, ` +
  `${stats.stageGuides} stage guides, ` +
  `${stats.unconfirmed} unconfirmed methods, stages ${stats.perStage.join('/')}, ` +
  `${shots.length} screenshots — dossier written to ${outputDir}`,
);
