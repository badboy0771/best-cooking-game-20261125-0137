// DAPUR KILAT — Sizzle & Serve, the entrypoint for best-cooking-game-20261125-0137
// (Node 22, standard library only). The game is this directory's game/ folder:
// plain static files a desktop browser loads offline (game/index.html and its ES
// modules, no library and no network request). This program hands it in: it copies
// game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. It takes no arguments and makes no network requests. Outside the
// grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory is emptied by removing its contents, never the directory itself:
// the grader mounts /output, and removing a mount point fails.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-game.ts';

// The scorer's caps, from the bounty's gate (RULES.txt, "The gate"): the dossier text
// holds at most 160 KiB; screenshots/ holds at most 4 images of at most 256 KiB each;
// game/ holds at most 993 files and directories, at most 48 MiB, and no path longer than
// 1000 UTF-8 bytes.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The repository root is the directory this file sits in, so the program finds game/ and
// screenshots/ wherever it is run from.
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));

// The output directory: the grader's /output, or MAKEFUN_OUTPUT_DIR when the run is
// local. An empty value counts as unset.
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The folders this program hands in.
const GAME_DIR = join(REPO_ROOT, 'game');
const SHOTS_DIR = join(REPO_ROOT, 'screenshots');

/** Start from an empty output directory, so a rerun never keeps stale files. Only the
 * directory's contents are removed, never the directory itself: the grader mounts
 * /output, and removing a mount point fails. */
function freshOutputDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

/** Copy one folder of the repository into the output directory, whole. */
function handIn(from: string, to: string): void {
  cpSync(from, to, { recursive: true });
}

function main(): void {
  if (!existsSync(GAME_DIR)) {
    throw new Error(`no game/ beside main.ts (${GAME_DIR}): a game is a directory of static files`);
  }
  // Fail loudly here, with the file's name, instead of letting buildDossier be
  // the one to complain: screenshots are real renders of the game's own code,
  // taken by shots.mjs, and the entry is not shippable without them.
  if (!existsSync(SHOTS_DIR)) {
    throw new Error(`no screenshots/ beside main.ts (${SHOTS_DIR}): run node shots.mjs first`);
  }
  const shots = readdirSync(SHOTS_DIR).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > CAPS.screenshots.max) {
    throw new Error(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  }
  for (const name of shots) {
    const bytes = statSync(join(SHOTS_DIR, name)).size;
    if (bytes > CAPS.screenshots.max_bytes) {
      throw new Error(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
    }
  }
  freshOutputDir(OUTPUT_DIR);
  handIn(GAME_DIR, join(OUTPUT_DIR, 'game'));
  // screenshots/ is copied only when it is there: buildDossier itself refuses an entry
  // with no images, so a missing folder still fails, loudly, one step later.
  if (existsSync(SHOTS_DIR)) {
    handIn(SHOTS_DIR, join(OUTPUT_DIR, 'screenshots'));
  }
  const dossier = buildDossier(OUTPUT_DIR, CAPS);
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
  // The grader runs this program twice and both runs must write the same bytes, so the
  // log names the one file whose size it compares: the dossier.
  console.log(`handed in game/ and screenshots/ to ${OUTPUT_DIR}; dossier.json is ${dossier.length} bytes`);
}

main();

