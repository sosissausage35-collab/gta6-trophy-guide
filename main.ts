// Leonida Trophy Guide — make.fun program/v1 entrypoint (Node 22, standard library only).
//
// The entry is the static guide in app/ (index.html, app.js, style.css, data/trophies.json):
// plain files, no build step, nothing fetched over the network. Before staging it,
// this program validates the data the judge will check: all 55 official trophies
// named exactly once, each with a non-blank guide, a valid grade and a roadmap
// stage, plus 3 or 4 screenshots inside the size cap. Then it copies app/ and
// screenshots/ from beside this file into the output directory and writes
// dossier.json there with the vendored make.fun library, using the same caps the
// scorer enforces (at most 4 screenshots of at most 256 KiB each, at most
// 993 entries and 48 MiB inside app/).
//
// Leave vendor/makefun-frontend.ts untouched: the scorer requires dossier.json to be
// byte for byte what its own copy of that library writes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const GRADES = new Set(['platinum', 'gold', 'silver', 'bronze']);
const MAX_SCREENSHOT_BYTES = 262144;

function fail(message) {
  throw new Error(`Leonida Trophy Guide: ${message}`);
}

function validateGuideData() {
  const raw = readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8');
  const doc = JSON.parse(raw);
  const trophies = doc.trophies;
  if (!Array.isArray(trophies) || trophies.length !== 55) {
    fail(`expected 55 trophies, found ${Array.isArray(trophies) ? trophies.length : 'no array'}`);
  }
  const names = new Set();
  let cited = 0;
  let unconfirmed = 0;
  for (const t of trophies) {
    if (typeof t.name !== 'string' || !t.name.trim()) fail(`trophy ${t.id} has no name`);
    if (names.has(t.name)) fail(`duplicate trophy name: ${t.name}`);
    names.add(t.name);
    if (typeof t.description !== 'string' || !t.description.trim()) fail(`${t.name}: no official description`);
    if (typeof t.guide !== 'string' || !t.guide.trim()) fail(`${t.name}: no guide`);
    if (!GRADES.has(t.grade)) fail(`${t.name}: bad grade ${t.grade}`);
    if (![1, 2, 3, 4].includes(t.stage)) fail(`${t.name}: no roadmap stage`);
    if (typeof t.source === 'string' && t.source.trim()) cited += 1;
    if (t.status === 'unconfirmed') unconfirmed += 1;
  }
  const byStage = [1, 2, 3, 4].map((n) => trophies.filter((t) => t.stage === n).length);
  return { total: trophies.length, cited, unconfirmed, byStage };
}

function validateScreenshots() {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const files = readdirSync(dir).filter((f) => !f.startsWith('.') && /\.(png|jpe?g)$/i.test(f));
  if (files.length < 3 || files.length > 4) {
    fail(`expected 3 or 4 screenshots, found ${files.length}`);
  }
  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
  }
  return files;
}

const data = validateGuideData();
const shots = validateScreenshots();

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(
  `Leonida Trophy Guide: ${data.total} trophies, ${data.cited} cited guides, ` +
  `${data.unconfirmed} unconfirmed methods, stages ${data.byStage.join('/')}, ` +
  `${shots.length} screenshots — dossier written to ${outDir}`,
);
