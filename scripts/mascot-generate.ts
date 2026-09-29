/**
 * Draws one mascot image with the OpenAI image API. Every request carries the approved goose
 * (docs/mascot-art/reference/base.png) and the finished images as references, so the set stays one
 * character. It costs money, so nothing is sent without `--go`, and never more than one image a run.
 *
 *   npm run mascots:generate                                 what's left, and what's been spent
 *   npm run mascots:generate -- goose/celebrating            dry run: references, prompt, rough cost
 *   npm run mascots:generate -- goose/celebrating --go       generate one candidate
 *        [--quality low|medium|high] [--note "wings higher"]
 *   npm run mascots:generate -- goose/scanning --go --edit 1 --note "…"
 *                                                            touch up candidate 1: only the note changes
 *        (--edit also takes a file path, e.g. another target's candidate to derive a pose from)
 *   npm run mascots:generate -- accept goose/celebrating 2   use candidate 2 (or a file path) as the raw original
 *
 * Needs OPENAI_API_KEY in .env.local (never EXPO_PUBLIC_ — it must not end up in the app).
 * Candidates and the spending log live in docs/mascot-art/candidates/ (git-ignored).
 */
import fs from "node:fs";
import path from "node:path";

import { MOOD_FOLDER } from "../src/components/mascot/art.ts";

import { loadEnv } from "./env.ts";
import { root } from "./mascot-art.ts";
import { CONCEPTS, editPrompt, fullPrompt, TARGETS, type Target } from "./mascot-prompts.ts";

/** OpenAI's pick for precise edits; it keeps references closely by itself (it rejects `input_fidelity`). */
const MODEL = "gpt-image-2.5-sunburst";
/** USD per token for MODEL (OpenAI pricing page, checked 29 Sep 2026). */
const PRICE = { textIn: 5 / 1e6, imageIn: 8 / 1e6, imageOut: 30 / 1e6 };
const QUALITIES = ["low", "medium", "high"] as const;
type Quality = (typeof QUALITIES)[number];
/** Rough output tokens for a 1024×1024 image, only used for the estimate before the first real run. */
const OUTPUT_TOKENS_1024: Record<Quality, number> = { low: 272, medium: 1056, high: 4160 };
const MAX_REFERENCES = 4;

const env = loadEnv();
const BUDGET_USD = Number(env.MASCOT_BUDGET_USD ?? 4.5);
/** Optional cap on the total number of images in the spending log (e.g. MASCOT_IMAGE_LIMIT=36 for one session). */
const IMAGE_LIMIT = env.MASCOT_IMAGE_LIMIT ? Number(env.MASCOT_IMAGE_LIMIT) : Infinity;
const ALL_TARGETS = [...TARGETS, ...CONCEPTS];

const file = (relative: string) => new URL(relative, root).pathname;
const CHARACTER = "docs/mascot-art/reference/base.png";
const candidatesDir = "docs/mascot-art/candidates";
const spendLog = `${candidatesDir}/spend.json`;

type SpendEntry = { at: string; target: string; file: string; model: string; quality: Quality; costUsd: number };

const readLog = (): SpendEntry[] => (fs.existsSync(file(spendLog)) ? JSON.parse(fs.readFileSync(file(spendLog), "utf8")) : []);
const spent = (log: SpendEntry[]) => log.reduce((sum, entry) => sum + entry.costUsd, 0);
const usd = (n: number) => `$${n.toFixed(3)}`;

const rawPath = (t: Target) => `docs/mascot-art/raw/${t.folder}/${t.name}.png`;
const donePath = (t: Target) => `assets/mascots/${t.folder}/${t.name}.png`;
const candidates = (t: Target) => {
  const dir = file(`${candidatesDir}/${t.folder}`);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => name.match(new RegExp(`^${t.name}-(\\d+)\\.png$`)))
    .flatMap((m) => (m ? [Number(m[1])] : []))
    .sort((a, b) => a - b);
};

/** A candidate number of this target ("2"), or a repo-relative file path. */
const candidateFile = (target: Target, which: string) =>
  /^\d+$/.test(which) ? `${candidatesDir}/${target.folder}/${target.name}-${which}.png` : which;

/**
 * The approved character first, then finished images of the same kind (peek heads for a peek head), then the
 * finished full-body moods — up to MAX_REFERENCES.
 */
function references(target: Target): string[] {
  const finished = (list: Target[]) => list.map(donePath).filter((p) => fs.existsSync(file(p)));
  const sameKind = finished(TARGETS.filter((t) => t.folder === target.folder && t.id !== target.id));
  const moods = finished(TARGETS.filter((t) => t.folder === MOOD_FOLDER && t.id !== target.id));
  return [...new Set([CHARACTER, ...sameKind, ...moods])].slice(0, MAX_REFERENCES);
}

function estimate(quality: Quality, target: Target, refs: string[], log: SpendEntry[]): { usd: number; basis: string } {
  const same = log.filter((entry) => entry.quality === quality && entry.model === MODEL);
  if (same.length > 0) return { usd: spent(same) / same.length, basis: `average of ${same.length} earlier run(s)` };
  const [w, h] = target.size.split("x").map(Number);
  const output = OUTPUT_TOKENS_1024[quality] * ((w * h) / (1024 * 1024)) * PRICE.imageOut;
  const input = refs.length * 1500 * PRICE.imageIn + 600 * PRICE.textIn;
  return { usd: output + input, basis: "rough guess — the first real run replaces it with the actual cost" };
}

function findTarget(id: string | undefined): Target {
  const target = ALL_TARGETS.find((t) => t.id === id);
  if (!target) {
    console.error(`Unknown image "${id ?? ""}". Use one of:\n  ${ALL_TARGETS.map((t) => t.id).join("\n  ")}`);
    process.exit(1);
  }
  return target;
}

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ─── Commands ───────────────────────────────────────────────────────────────

function overview() {
  const log = readLog();
  console.log(`Model ${MODEL} · spent ${usd(spent(log))} of the ${usd(BUDGET_USD)} budget\n`);
  for (const t of ALL_TARGETS) {
    const status = t.exploratory ? "exploration" : fs.existsSync(file(donePath(t))) ? "done" : fs.existsSync(file(rawPath(t))) ? "raw, not processed" : "missing";
    const cands = candidates(t);
    console.log(`  ${t.id.padEnd(22)} ${status.padEnd(20)} ${cands.length ? `candidates: ${cands.join(", ")}` : ""}`);
  }
  console.log(`\nDry run one:  npm run mascots:generate -- goose/celebrating`);
}

function accept(target: Target, which: string) {
  if (target.exploratory) {
    console.error(`${target.id} is a design exploration — it isn't used in the app, so there's nothing to accept.`);
    process.exit(1);
  }
  const from = candidateFile(target, which);
  if (!fs.existsSync(file(from))) {
    console.error(`No candidate ${from}. Existing: ${candidates(target).join(", ") || "none"}.`);
    process.exit(1);
  }
  const to = rawPath(target);
  if (fs.existsSync(file(to)) && !process.argv.includes("--force")) {
    console.error(`${to} already exists — add --force to replace it.`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(file(to)), { recursive: true });
  fs.copyFileSync(file(from), file(to));
  console.log(`${from} → ${to}\nNext: npm run mascots:process`);
}

async function generate(target: Target) {
  const quality = (option("quality") ?? "medium") as Quality;
  if (!QUALITIES.includes(quality)) {
    console.error(`--quality must be one of ${QUALITIES.join(", ")}.`);
    process.exit(1);
  }
  const note = option("note");
  // --edit N: send only candidate N and ask for the one change in --note; otherwise draw from the references.
  const editOf = option("edit");
  const editFile = editOf ? candidateFile(target, editOf) : null;
  if (editFile && (!fs.existsSync(file(editFile)) || !note)) {
    console.error(editFile && !note ? `--edit needs --note "what to change".` : `No candidate ${editFile}.`);
    process.exit(1);
  }
  const refs = editFile ? [editFile] : references(target);
  const prompt = editFile && note ? editPrompt(note) : fullPrompt(target, { withReferences: true, note });
  const log = readLog();
  const guess = estimate(quality, target, refs, log);
  const go = process.argv.includes("--go");

  console.log(`${target.id}  ·  ${MODEL}, ${quality} quality, ${target.size}, transparent background`);
  if (fs.existsSync(file(donePath(target)))) console.log(`(already done — a new one only replaces it if you accept it)`);
  console.log(`\nReferences:\n${refs.map((r) => `  ${r}`).join("\n")}\n\nPrompt:\n${prompt}\n`);
  console.log(`Cost: about ${usd(guess.usd)} (${guess.basis}). Spent so far ${usd(spent(log))} of ${usd(BUDGET_USD)}.`);

  if (!go) {
    console.log(`\nDry run — nothing was sent. Add --go to generate one image.`);
    return;
  }
  if (log.length >= IMAGE_LIMIT) {
    console.error(`\nStopped: ${log.length} images generated, the limit is ${IMAGE_LIMIT} (MASCOT_IMAGE_LIMIT).`);
    process.exit(1);
  }
  if (spent(log) + guess.usd > BUDGET_USD) {
    console.error(`\nStopped: this could pass the ${usd(BUDGET_USD)} budget (MASCOT_BUDGET_USD in .env.local).`);
    process.exit(1);
  }
  const key = env.OPENAI_API_KEY;
  if (!key) {
    console.error(`\nNo OPENAI_API_KEY in .env.local.`);
    process.exit(1);
  }

  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", prompt);
  form.append("size", target.size);
  form.append("quality", quality);
  form.append("background", "transparent");
  form.append("output_format", "png");
  form.append("n", "1");
  for (const ref of refs) form.append("image[]", new Blob([fs.readFileSync(file(ref))], { type: "image/png" }), path.basename(ref));

  console.log(`\nGenerating… (this can take a minute)`);
  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
    signal: AbortSignal.timeout(5 * 60_000),
  });
  const body = (await response.json()) as {
    data?: { b64_json?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { text_tokens?: number; image_tokens?: number } };
    error?: { message?: string };
  };
  if (!response.ok || !body.data?.[0]?.b64_json) {
    console.error(`The API answered ${response.status}: ${body.error?.message ?? "no image in the response"}`);
    process.exit(1);
  }

  const usage = body.usage ?? {};
  const text = usage.input_tokens_details?.text_tokens ?? 0;
  const images = usage.input_tokens_details?.image_tokens ?? Math.max(0, (usage.input_tokens ?? 0) - text);
  const costUsd = text * PRICE.textIn + images * PRICE.imageIn + (usage.output_tokens ?? 0) * PRICE.imageOut;

  const n = (candidates(target).at(-1) ?? 0) + 1;
  const out = `${candidatesDir}/${target.folder}/${target.name}-${n}.png`;
  fs.mkdirSync(path.dirname(file(out)), { recursive: true });
  fs.writeFileSync(file(out), Buffer.from(body.data[0].b64_json, "base64"));
  const entry: SpendEntry = { at: new Date().toISOString(), target: target.id, file: out, model: MODEL, quality, costUsd };
  fs.writeFileSync(file(spendLog), JSON.stringify([...log, entry], null, 2));

  console.log(`Saved ${out}  ·  cost ${usd(costUsd)}  ·  spent ${usd(spent(log) + costUsd)} of ${usd(BUDGET_USD)}`);
  console.log(`Happy with it?  npm run mascots:generate -- accept ${target.id} ${n}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

const [first, second, third] = process.argv.slice(2).filter((arg, i, all) => !arg.startsWith("--") && !all[i - 1]?.match(/^--(quality|note|edit)$/));
if (!first) overview();
else if (first === "accept") accept(findTarget(second), third ?? "");
else await generate(findTarget(first));
