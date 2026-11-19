// Leonida Trophy Guide — make.fun program/v1 entrypoint (Node 22, standard library only).
//
// The entry is the static guide in app/ (index.html, app.js, style.css, data/trophies.json):
// plain files, no build step, nothing fetched over the network. This program stages it
// for the grader: it copies app/ and screenshots/ from beside this file into the output
// directory and writes dossier.json there with the vendored make.fun library, using the
// same caps the scorer enforces (at most 4 screenshots of at most 256 KiB each, at most
// 993 entries and 48 MiB inside app/).
//
// Leave vendor/makefun-frontend.ts untouched: the scorer requires dossier.json to be
// byte for byte what its own copy of that library writes.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

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
