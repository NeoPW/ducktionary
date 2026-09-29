/**
 * Builds docs/mascot-gallery.html: every drawn image for both characters (moods, pop-up poses, waddle frames)
 * and the app icons, with a small live demo of the visits. Self-contained — open it in any browser.
 *
 *   npm run mascots
 */
import fs from "node:fs";

import {
  ART_SETS,
  MOODS,
  OPTIONAL_PEEK_POSES,
  PEEK_POSES,
  WALK_FRAMES,
  type ArtKind,
  type Mood,
  type PeekPose,
  type Species,
} from "../src/components/mascot/art.ts";
import { isUsable, pngDataUri, root, scanArt, type ArtFile } from "./mascot-art.ts";

const art = scanArt();
const out = new URL("docs/mascot-gallery.html", root);
const icon = (file: string) =>
  `data:image/png;base64,${fs.readFileSync(new URL(`assets/images/${file}`, root)).toString("base64")}`;
const title = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

/** A drawn image, or a dashed placeholder while it isn't drawn (or can't be used yet). */
const picture = (file: ArtFile | undefined, alt: string) => {
  if (!file) return `<span class="missing">Not drawn yet</span>`;
  const img = `<img src="${pngDataUri(file)}" alt="${alt}">`;
  return isUsable(file) ? img : `${img}<span class="flag">Background not removed</span>`;
};

const MOOD_NOTES: Record<Mood, string> = {
  reading: "Library, stats, app icon",
  sleepy: "Empty library, quiet stats",
  celebrating: "Saved, backed up, restored",
  confused: "Errors and warnings",
  scanning: "Add and scan screens",
};
const POSE_NOTES: Record<PeekPose, string> = {
  rest: "Between acts; looks around by flipping",
  honk: "HONK! — also the peck",
  blink: "A blink after looking around",
  suspicious: "Rises only to eye level",
  wink: "A wink and a heart",
  steal: "Pops up with a book: “mine now”",
  wave: "Waves hello (only sets that have it)",
};

const SOUND: Record<Species, string> = { goose: "HONK!", duckling: "QUACK!" };

/** One card per image name, with every set of that kind side by side (two characters, or three pop-up looks). */
const card = (kind: ArtKind, name: string, label: string, note: string, edge = false) => {
  const sets = ART_SETS.filter((set) => set.kind.kind === kind);
  const pictures = sets
    .map((set) => `<div class="stage${edge ? " edge" : ""}">${picture(art.art[kind][set.look]?.[name], `${title(set.look)}, ${label}`)}</div>`)
    .join("");
  const paths = sets.map((set) => `${set.folder}/${name}.png`).join(" · ");
  return `
  <figure class="card">
    <div class="pair" style="grid-template-columns: repeat(${sets.length}, 1fr)">${pictures}</div>
    <figcaption><strong>${title(label)}</strong><span>${note}</span><code>${paths}</code></figcaption>
  </figure>`;
};

const moodCards = MOODS.map((m) => card("moods", m, m, MOOD_NOTES[m])).join("");
const poseCards = [...PEEK_POSES, ...OPTIONAL_PEEK_POSES]
  .map((p) => card("peek", p, `popping up, ${p}`, POSE_NOTES[p], true))
  .join("");
const walkCards = WALK_FRAMES.map((f) => card("walk", f, `waddle, ${f}`, "Alternates with the other step")).join("");

const total = ART_SETS.reduce((n, set) => n + set.kind.names.length, 0);
const drawn = total - art.missing.length;
const progress = `
  <section aria-labelledby="progress">
    <div class="head"><h2 id="progress">Art progress</h2><p class="lede">${drawn} of ${total} images drawn. Generate or add originals as described in <code>docs/mascot-art-brief.md</code>, then run <code>npm run mascots:process</code>.</p></div>
    <div class="meter" role="img" aria-label="${drawn} of ${total} drawn"><span style="width:${(drawn / total) * 100}%"></span></div>
    ${art.missing.length ? `<details><summary>${art.missing.length} still to draw</summary><ul class="list">${art.missing.map((m) => `<li><code>${m}</code></li>`).join("")}</ul></details>` : ""}
    ${art.warnings.length ? `<ul class="list warn">${art.warnings.map((w) => `<li>${w}</li>`).join("")}</ul>` : ""}
  </section>`;

// The live demo uses the real images: each pop-up look honking, and its character waddling when it can.
const demos = ART_SETS.filter((set) => set.kind.kind === "peek").flatMap((set) => {
  const peek = art.art.peek[set.look];
  const walk = art.art.walk[set.species];
  if (!peek?.rest || !peek.honk) return [];
  const walks = walk?.["step-1"] && walk["step-2"];
  return [
    `
    <div class="demo-block">
      <div class="demo" data-play="">
        <div class="popup"><span class="bubble">${SOUND[set.species]}</span>
          <img class="rest" src="${pngDataUri(peek.rest)}" alt=""><img class="honk" src="${pngDataUri(peek.honk)}" alt="">
        </div>
        ${walks ? `<div class="walker"><img class="s1" src="${pngDataUri(walk["step-1"]!)}" alt=""><img class="s2" src="${pngDataUri(walk["step-2"]!)}" alt=""></div>` : ""}
      </div>
      <div class="buttons"><button type="button" data-play="popup">${title(set.look)} pops up</button>${walks ? `<button type="button" data-play="waddle">${title(set.species)} waddles</button>` : ""}</div>
    </div>`,
  ];
});
const demo = demos.length
  ? demos.join("")
  : `<p class="lede">The demo appears once a character's pop-up poses and both waddle frames are drawn.</p>`;

const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ducktionary Mascots</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Nunito:wght@400;600;700;800&display=swap">
<style>
:root {
  color-scheme: light;
  --paper: #FBF6EC; --surface: #FFFDF8; --ink: #2B2622; --muted: #6F645A; --border: #E8DFD0;
  --accent: #E8833A; --stage: #F4ECDD; --danger: #9B3B2F;
  --serif: "Lora", Georgia, "Times New Roman", serif;
  --sans: "Nunito", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #1E1A17; --surface: #2A2521; --ink: #F3ECE2; --muted: #B3A698; --border: #3A332D;
    --accent: #EB9459; --stage: #332D28; --danger: #E0736A;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #1E1A17; --surface: #2A2521; --ink: #F3ECE2; --muted: #B3A698; --border: #3A332D;
  --accent: #EB9459; --stage: #332D28; --danger: #E0736A;
}
* { box-sizing: border-box; }
html { padding-block: env(safe-area-inset-top, 0px) env(safe-area-inset-bottom, 0px); background: var(--paper); }
body { margin: 0; background: var(--paper); color: var(--ink); font: 400 16px/1.55 var(--sans); padding-inline: 16px; }
.wrap { max-width: 1120px; margin: 0 auto; padding-block: 32px 64px; display: grid; gap: 56px; }
h1, h2 { font-family: var(--serif); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.1; }
h2 { font-size: 1.5rem; line-height: 1.25; }
p { margin: 0; max-width: 65ch; }
.lede { color: var(--muted); font-size: 1.04rem; }
.top { display: grid; grid-template-columns: auto 1fr auto; gap: 24px; align-items: center; }
.top img { width: 104px; height: 104px; border-radius: 24px; box-shadow: 0 6px 20px rgb(43 38 34 / 0.12); }
.top .text { display: grid; gap: 8px; }
.eyebrow { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent); }
.theme { display: inline-flex; border: 1px solid var(--border); border-radius: 999px; padding: 3px; background: var(--surface); }
.theme button, .buttons button { font: 700 0.9rem var(--sans); border: 0; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
.theme button { color: var(--muted); background: none; }
.theme button[aria-pressed="true"], .buttons button { background: var(--accent); color: #2B2622; }
button:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
section { display: grid; gap: 20px; }
.head { display: grid; gap: 6px; }
code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.8rem; color: var(--muted); }
.meter { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--accent); }
.list { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
.warn li { color: var(--danger); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.card { margin: 0; display: grid; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 12px; }
.card .stage { position: relative; display: grid; place-items: center; aspect-ratio: 1; border-radius: 12px; background: var(--stage); overflow: hidden; }
.card .stage img { width: 100%; height: 100%; object-fit: contain; }
.card .stage.edge { border-bottom: 3px solid var(--border); }
.pair { display: grid; gap: 8px; }
.demo-block { display: grid; gap: 12px; }
details summary { cursor: pointer; color: var(--muted); }
.missing { color: var(--muted); font-size: 0.85rem; border: 2px dashed var(--border); border-radius: 10px; padding: 18px 12px; }
.flag { position: absolute; top: 6px; left: 6px; font-size: 0.7rem; font-weight: 800; color: var(--danger); background: var(--surface); border-radius: 999px; padding: 1px 8px; }
figcaption { display: grid; gap: 2px; padding: 0 4px 2px; font-size: 0.9rem; }
figcaption span { color: var(--muted); }
figcaption code { display: block; }
.demo { position: relative; height: 260px; border-radius: 18px; background: var(--stage); border: 1px solid var(--border); overflow: hidden; }
.popup { position: absolute; left: 50%; bottom: 0; width: 170px; height: 170px; translate: -50% 100%; }
.popup img, .walker img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.popup .honk, .walker .s2 { opacity: 0; }
.bubble { position: absolute; left: 8px; bottom: 150px; z-index: 1; background: var(--surface); color: var(--ink); border: 2px solid var(--ink); border-radius: 14px; padding: 2px 10px; font-weight: 800; font-size: 0.85rem; opacity: 0; }
.walker { position: absolute; bottom: 12px; left: 0; width: 130px; height: 130px; translate: -140px 0; }
.demo[data-play="popup"] .popup { animation: rise 2.8s cubic-bezier(.3,1.3,.5,1) both; }
.demo[data-play="popup"] .honk, .demo[data-play="popup"] .bubble { animation: honk 2.8s steps(1) both; }
.demo[data-play="waddle"] .walker { animation: walk 5s linear both; }
.demo[data-play="waddle"] .walker .s2 { animation: step 0.34s steps(1) infinite; }
@keyframes rise { 0% { translate: -50% 100%; } 18%, 78% { translate: -50% 0; } 100% { translate: -50% 100%; } }
@keyframes honk { 0%, 30% { opacity: 0; } 31%, 62% { opacity: 1; } 63%, 100% { opacity: 0; } }
@keyframes walk { from { translate: -140px 0; } to { translate: calc(100cqw + 10px) 0; } }
@keyframes step { 0% { opacity: 0; } 50% { opacity: 1; } }
.demo { container-type: inline-size; }
.walker img { transform: scaleX(-1); }
.buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.asset { margin: 0; display: grid; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; }
.asset .frame { display: grid; place-items: center; aspect-ratio: 1; max-width: 100%; border-radius: 14px; background: var(--stage); }
.asset img { width: 70%; }
.frame.adaptive img { width: 100%; border-radius: 50%; background: #FBF6EC; }
.frame.mono { background: #3A4A3F; } .frame.mono img { width: 100%; filter: brightness(0) invert(0.9); }
.frame.fav img { width: 48px; }
footer { color: var(--muted); font-size: 0.85rem; }
@media (max-width: 640px) { .top { grid-template-columns: 1fr; } .top img { width: 84px; height: 84px; } }
@media (prefers-reduced-motion: reduce) { .demo * { animation: none !important; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <img src="${icon("icon.png")}" alt="Ducktionary app icon">
    <div class="text">
      <span class="eyebrow">Ducktionary · mascots</span>
      <h1>Goose &amp; duckling</h1>
      <p class="lede">Every drawn image in the app, for both characters: the five moods, the pop-up poses and the waddle — plus the app icons. Each app start casts one of them for every part.</p>
    </div>
    <div class="theme" role="group" aria-label="Backdrop">
      <button type="button" data-set="light" aria-pressed="false">Light</button>
      <button type="button" data-set="dark" aria-pressed="false">Dark</button>
    </div>
  </div>
${progress}
  <section aria-labelledby="moods">
    <div class="head"><h2 id="moods">Moods</h2><p class="lede">The mascot on screens, toasts and dialogs.</p></div>
    <div class="grid">${moodCards}</div>
  </section>

  <section aria-labelledby="visits">
    <div class="head"><h2 id="visits">Goose visits</h2><p class="lede">Every few minutes a goose or duckling pops up from a screen edge (turned for the top and sides) or waddles across. Poke it and it runs.</p></div>
    ${demo}
    <div class="grid">${poseCards}${walkCards}</div>
  </section>

  <section aria-labelledby="assets">
    <div class="head"><h2 id="assets">App icons</h2><p class="lede">Stored in <code>assets/images/</code>, made from the reading goose by <code>npm run mascots:icons</code>. They show in a real build, not in Expo Go.</p></div>
    <div class="assets">
      <figure class="asset"><div class="frame"><img src="${icon("icon.png")}" alt="App icon"></div><figcaption><strong>App icon</strong><code>icon.png · 1024 px</code></figcaption></figure>
      <figure class="asset"><div class="frame adaptive"><img src="${icon("android-icon-foreground.png")}" alt="Android adaptive icon with a round mask"></div><figcaption><strong>Android adaptive</strong><code>android-icon-foreground.png</code></figcaption></figure>
      <figure class="asset"><div class="frame mono"><img src="${icon("android-icon-monochrome.png")}" alt="Android themed icon silhouette"></div><figcaption><strong>Android themed</strong><code>android-icon-monochrome.png</code></figcaption></figure>
      <figure class="asset"><div class="frame"><img src="${icon("splash-icon.png")}" alt="Splash screen image"></div><figcaption><strong>Splash</strong><code>splash-icon.png · on #FBF6EC</code></figcaption></figure>
      <figure class="asset"><div class="frame fav"><img src="${icon("favicon.png")}" alt="Favicon at actual size"></div><figcaption><strong>Favicon</strong><code>favicon.png · 48 px</code></figcaption></figure>
    </div>
  </section>

  <footer>Generated ${generated} by <code>npm run mascots</code> from <code>assets/mascots/</code>.</footer>
</div>
<script>
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme button");
  const current = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === current())));
  buttons.forEach((b) => b.addEventListener("click", () => { root.dataset.theme = b.dataset.set; sync(); }));
  sync();
  document.querySelectorAll(".buttons button").forEach((b) => b.addEventListener("click", () => {
    const demo = b.closest(".demo-block").querySelector(".demo");
    demo.dataset.play = "";
    void demo.offsetWidth; // restart the animation
    demo.dataset.play = b.dataset.play;
  }));
</script>
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log(`Wrote ${out.pathname} (${Math.round(html.length / 1024)} KB)`);
