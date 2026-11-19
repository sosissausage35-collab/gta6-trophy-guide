# gta6-trophy-guide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/sosissausage35-collab/gta6-trophy-guide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/sosissausage35-collab/gta6-trophy-guide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

Leonida Trophy Guide — a complete, offline trophy guide for Grand Theft Auto VI on PS5: all 55 trophies (1 platinum, 2 gold, 6 silver, 46 bronze) with a guide written for each one, a four-stage platinum roadmap, a missable watch list and a checklist tracker that saves your progress in the browser. Search, filter by kind, grade and roadmap stage, hide story spoilers until you earn them, and export or import your progress. No accounts, no network, no official artwork.

## What is in it

- **Every trophy, audited.** The header shows a live audit strip computed from the data: 55/55 official names, 55/55 official descriptions, 55/55 guides, 55/55 cited sources, 28 hidden, 1 missable, 3 methods unconfirmed. The list was checked against the Exophase PSN list on 18–19 Nov 2026.
- **A guide for each trophy, with its source named.** Every card and detail view cites where its facts come from — PowerPyx's GTA 6 Trophy Guide & Roadmap (updated 18 Nov 2026) for the methods, the Exophase PSN list (read 18 Nov 2026, cross-checked with PSNProfiles) for names and descriptions. Each guide is written in our own words; nothing is copied from another guide.
- **Three trophies with no confirmed method.** In The Beginning…, Bad Luck, I Guess and Ten Pin have no published unlock method yet — their guides say so plainly instead of inventing one.
- **A platinum roadmap that covers all 55.** Four stages (19 story, 10 on the 100% checklist, 25 in cleanup, then the platinum), each listing its trophies with their key counts. Click a trophy chip to open its guide.
- **A missable watch list.** The one possibly missable trophy (Positive Mental Attitude, Chapter 1 balcony meditation) with the exact step, plus the five things players worry about most that are confirmed safe to leave for free-roam.
- **A tracker that remembers.** Ticks save in localStorage, with export/import. Deep links: `?open=<id>` opens a trophy's guide, `?section=<id>` scrolls to a section, `?demo=1` pre-ticks 12 early trophies in memory only (used for the screenshots; never saved).

## Sources

- PowerPyx — GTA 6 Trophy Guide & Roadmap, updated 18 Nov 2026: https://www.powerpyx.com/gta-6-grand-theft-auto-vi-trophy-guide-roadmap/
- Exophase — GTA VI trophy list (PSN, as reported by Push Square / GTABase), read 18 Nov 2026: https://www.planetgta6.com/en/gta-6-trophies/
- GGRecon — GTA 6's trophy list is out, and the Platinum needs 100%, 19 Nov 2026: https://www.ggrecon.com/articles/gta-6-trophies-achievements-list-platinum/
- PSNProfiles — GTA VI trophy list, cross-check, read 18 Nov 2026.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080

`main.ts` (Node 22) is the make.fun entrypoint: it first validates the data — 55 unique trophy names, a non-blank guide and a valid grade for each, a roadmap stage for each, 3–4 screenshots within the size cap — then copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## Screenshots

The four screenshots under `screenshots/` are real renders of this app in headless Chromium at 1280×800: the checklist with demo progress, the guide for Positive Mental Attitude with its citations open, the missable watch list, and the platinum roadmap. They were taken after the rebuild and checked to render (non-blank, correct size).

---

<sub>Entered on [make.fun](https://make.fun/?ref=f4pc3mbd&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
