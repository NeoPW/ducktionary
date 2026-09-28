/**
 * Builds docs/mascot-gallery.html: every mascot, mood, goose visit and app asset, rendered from
 * the same shape code the app uses. Open the file in any browser; it is fully self-contained.
 *
 *   npm run mascots
 */
import fs from "node:fs";

import { PEEK_FALLBACK, PEEK_POSES, type PeekPose } from "../src/components/mascot/art.ts";
import { goosePeekShapes, mascotShapes, MOODS, SPECIES, toSvg, type Mood } from "../src/components/mascot/shapes.ts";
import { isUsable, pngDataUri, root, scanArt, type ArtFile } from "./mascot-art.ts";

const art = scanArt();
const out = new URL("docs/mascot-gallery.html", root);
const png = (file: string) =>
  `data:image/png;base64,${fs.readFileSync(new URL(`assets/images/${file}`, root)).toString("base64")}`;
const props = { primary: "#E8833A", secondary: "#4F7C6B", muted: "#7A6F64", star: "#F4B400" };
const labelled = (svg: string, label: string) => svg.replace("<svg ", `<svg role="img" aria-label="${label}" `);
/** A drawn PNG when there is one, otherwise the vector drawing with an "SVG" tag. */
const artOrSvg = (file: ArtFile | undefined, svg: string, label: string, className = "art") =>
  file
    ? `<span class="fallback"><img class="${className}" src="${pngDataUri(file)}" alt="${label}">${
        isUsable(file) ? "" : `<span class="tag warn-tag" title="Background not removed — the app keeps the vector version">Fix background</span>`
      }</span>`
    : `<span class="fallback">${labelled(svg, label)}<span class="tag" title="Not drawn yet — showing the vector fallback">SVG</span></span>`;
const title = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

const MOOD_NOTES: Record<Mood, string> = {
  reading: "Holding an open book",
  sleepy: "Geese flop on their back, feet up",
  celebrating: "Wings up, happy eyes, sparkle marks",
  confused: "Head tilt, a question mark, sweat drop",
  scanning: "Peering through a magnifier",
};

const weightTotal = SPECIES.reduce((sum, s) => sum + s.weight, 0);
const rows = SPECIES.map(
  (sp) => `
  <tr>
    <th scope="row"><span class="name">${title(sp.label)}</span><span class="share">${Math.round((sp.weight / weightTotal) * 100)}% of appearances</span></th>
    ${MOODS.map((mood) => `<td>${artOrSvg(art.mascots[sp.value]?.[mood], toSvg(mascotShapes(sp.value, mood, props, `${sp.value}-${mood}`)), `${sp.label}, ${mood}`)}</td>`).join("")}
  </tr>`,
).join("");

const POSE_NOTES: Record<PeekPose, [bubble: string, note: string]> = {
  rest: ["", "Default look; also used while it looks around"],
  honk: ["HONK!", "Bill wide open, eyes wide"],
  blink: ["", "Eyes closed for a blink"],
  suspicious: ["…", "Narrowed eyes; only half emerges"],
  wink: ["♥", "A wink and a heart"],
  steal: ["mine now", "Runs off with a tiny book"],
};
const peek = (pose: PeekPose, mirrored: boolean) => {
  const label = `Goose peeking in from the ${mirrored ? "left" : "right"}: ${pose}`;
  const svg = toSvg(goosePeekShapes(PEEK_FALLBACK[pose], props.secondary, `${pose}${mirrored ? "l" : "r"}`), 150, 120);
  return `<div class="peek${mirrored ? " mirrored" : ""}">${artOrSvg(art.peek[pose], svg, label, "art peek-img")}</div>`;
};
const poseCards = PEEK_POSES.map((pose) => {
  const [bubble, note] = POSE_NOTES[pose];
  return `
  <figure class="pose">
    <div class="pose-art">${bubble ? `<span class="bubble">${bubble}</span>` : ""}${peek(pose, false)}</div>
    <div class="pose-art from-left">${peek(pose, true)}</div>
    <figcaption><strong>${title(pose)}</strong><span>${note}</span><code>goose-peek/${pose}.png</code></figcaption>
  </figure>`;
}).join("");

const drawnCount = MOODS.filter((m) => art.mascots.goose?.[m]).length + PEEK_POSES.filter((p) => art.peek[p]).length;
const totalCount = MOODS.length + PEEK_POSES.length;
const progress = `
  <section aria-labelledby="progress" class="progress">
    <div class="head"><h2 id="progress">Art progress</h2><p class="lede">${drawnCount} of ${totalCount} goose images drawn. Drop PNGs into <code>assets/mascots/</code> and run <code>npm run mascots</code>; the brief with all prompts is in <code>docs/mascot-art-brief.md</code>.</p></div>
    <div class="meter" role="img" aria-label="${drawnCount} of ${totalCount} drawn"><span style="width:${(drawnCount / totalCount) * 100}%"></span></div>
    ${art.missing.length ? `<div><h3>Still to draw</h3><ul class="todo">${art.missing.map((m) => `<li><code>${m}</code></li>`).join("")}</ul></div>` : `<p><strong>Every goose image is drawn.</strong></p>`}
    ${art.warnings.length ? `<div><h3>Check these files</h3><ul class="warn">${art.warnings.map((w) => `<li>${w}</li>`).join("")}</ul></div>` : ""}
  </section>`;

const PALETTE = [
  ["#6B5344", "Goose line", "Warm brown outline"],
  ["#5A3B1A", "Duckling line", "Heavier, darker outline"],
  ["#FFFCF6", "Goose white", "Airbrushed to #E6D8C4 underneath"],
  ["#FFF0A0", "Duckling", "Butter yellow, shaded #F1D36A"],
  ["#F59A3E", "Bill & feet", "Light #FFB866, shade #DD7C2A"],
  ["#F49A9E", "Blush", "Soft-edged"],
  ["#F2C343", "Marks", "Little emphasis strokes"],
];
const swatches = PALETTE.map(
  ([hex, name, note]) => `<li><span class="chip" style="background:${hex}"></span><span class="sw-name">${name}</span><code>${hex}</code><span class="sw-note">${note}</span></li>`,
).join("");

const honk = art.peek.honk
  ? `<img class="art" src="${pngDataUri(art.peek.honk)}" alt="Goose honking">`
  : labelled(toSvg(goosePeekShapes(PEEK_FALLBACK.honk, props.secondary, "stage"), 150, 120), "Goose honking");
const generated = new Date().toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Ducktionary Flock</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Nunito:wght@400;600;700;800&display=swap">
<style>
:root {
  color-scheme: light;
  --paper: #FBF6EC; --surface: #FFFDF8; --ink: #2B2622; --muted: #6F645A; --border: #E8DFD0;
  --accent: #E8833A; --stage: #F4ECDD; --bubble: #FFFDF8;
  --serif: "Lora", Georgia, "Times New Roman", serif;
  --sans: "Nunito", "Segoe UI", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --paper: #1E1A17; --surface: #2A2521; --ink: #F3ECE2; --muted: #B3A698; --border: #3A332D;
    --accent: #EB9459; --stage: #2A2521; --bubble: #2A2521;
  }
}
:root[data-theme="dark"] {
  color-scheme: dark;
  --paper: #1E1A17; --surface: #2A2521; --ink: #F3ECE2; --muted: #B3A698; --border: #3A332D;
  --accent: #EB9459; --stage: #2A2521; --bubble: #2A2521;
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
.theme button { font: 700 0.9rem var(--sans); color: var(--muted); background: none; border: 0; border-radius: 999px; padding: 8px 14px; cursor: pointer; }
.theme button[aria-pressed="true"] { background: var(--accent); color: #2B2622; }
section { display: grid; gap: 20px; }
.head { display: grid; gap: 6px; }
.scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 18px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; min-width: 780px; }
th, td { padding: 10px 8px; text-align: center; vertical-align: middle; }
thead th { font-weight: 700; font-size: 0.9rem; padding-top: 16px; }
thead th span { display: block; font-weight: 400; font-size: 0.78rem; color: var(--muted); max-width: 16ch; margin: 2px auto 0; }
tbody tr + tr { border-top: 1px solid var(--border); }
tbody th { text-align: left; padding-left: 20px; width: 150px; }
tbody th .name { display: block; font-family: var(--serif); font-weight: 600; font-size: 1.05rem; }
tbody th .share { display: block; font-size: 0.8rem; color: var(--muted); font-variant-numeric: tabular-nums; }
td svg, td .art { width: 124px; height: 124px; display: block; margin: 0 auto; object-fit: contain; }
.fallback { position: relative; display: block; }
.warn-tag { color: #9B3B2F; border-color: #E8B4AC; }
.tag { position: absolute; top: 2px; right: 6px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.06em; color: var(--muted); border: 1px solid var(--border); background: var(--surface); border-radius: 999px; padding: 1px 7px; }
.peek .art { width: 150px; height: 120px; display: block; object-fit: contain; }
.mirrored .art { transform: scaleX(-1); }
.visitor .art { width: 150px; height: 120px; object-fit: contain; }
h3 { font-size: 1rem; margin: 0 0 6px; }
.meter { height: 10px; border-radius: 999px; background: var(--border); overflow: hidden; }
.meter span { display: block; height: 100%; background: var(--accent); }
.todo, .warn { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
.warn li { color: var(--ink); }
figcaption code { font-size: 0.75rem; }
.poses { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 16px; }
.pose { margin: 0; display: grid; gap: 6px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 12px; }
.pose-art { position: relative; height: 104px; background: var(--stage); border-radius: 12px; overflow: hidden; }
.peek { position: absolute; right: 0; top: 0; width: 150px; height: 120px; }
.peek svg { width: 150px; height: 120px; display: block; }
.from-left .peek { right: auto; left: 0; }
.mirrored svg { transform: scaleX(-1); }
.bubble { position: absolute; left: 10px; top: 8px; z-index: 1; background: var(--bubble); color: var(--ink); border: 2px solid var(--ink); border-radius: 14px; padding: 2px 10px; font-weight: 800; font-size: 0.85rem; }
figcaption { display: grid; gap: 2px; padding: 4px 4px 2px; font-size: 0.9rem; }
figcaption span { color: var(--muted); }
.stage { position: relative; height: 200px; border-radius: 18px; background: var(--stage); border: 1px solid var(--border); overflow: hidden; display: grid; place-items: center; }
.stage p { color: var(--muted); text-align: center; padding-inline: 24px; }
.visitor { position: absolute; right: 0; top: 46px; width: 150px; height: 120px; transform: translateX(160px); }
.visitor svg { width: 150px; height: 120px; display: block; }
.visitor .bubble { left: -58px; top: -6px; opacity: 0; }
.stage.go .visitor { animation: peek 2.6s cubic-bezier(.3,1.3,.5,1) both; }
.stage.go .visitor .bubble { animation: say 2.6s ease both; }
@keyframes peek { 0% { transform: translateX(160px); } 18%, 76% { transform: translateX(0); } 30% { transform: translateX(0) rotate(-6deg); } 36% { transform: translateX(0) rotate(6deg); } 42% { transform: translateX(0) rotate(0); } 100% { transform: translateX(160px); } }
@keyframes say { 0%, 24% { opacity: 0; } 28%, 62% { opacity: 1; } 70%, 100% { opacity: 0; } }
.summon { justify-self: start; font: 700 1rem var(--sans); color: #2B2622; background: var(--accent); border: 0; border-radius: 999px; padding: 12px 22px; cursor: pointer; }
button:focus-visible { outline: 3px solid var(--ink); outline-offset: 2px; }
.rules { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.rules li { border-left: 3px solid var(--accent); padding: 4px 0 4px 12px; }
.rules strong { display: block; }
.rules span { color: var(--muted); font-size: 0.92rem; }
.swatches { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.swatches li { display: grid; grid-template-columns: 36px 1fr auto; column-gap: 12px; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 10px 12px; }
.chip { width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgb(0 0 0 / 0.12); grid-row: span 2; }
.sw-name { font-weight: 700; }
.sw-note { grid-column: 2 / 4; color: var(--muted); font-size: 0.85rem; }
code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; font-size: 0.8rem; color: var(--muted); }
.assets { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
.asset { margin: 0; display: grid; gap: 8px; background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 16px; }
.asset .frame { display: grid; place-items: center; aspect-ratio: 1; max-width: 100%; border-radius: 14px; background: var(--stage); }
.asset img { width: 70%; }
.frame.adaptive img { width: 100%; border-radius: 50%; background: #FBF6EC; }
.frame.mono { background: #3A4A3F; } .frame.mono img { width: 100%; filter: brightness(0) invert(0.9); }
.frame.fav img { width: 48px; }
.asset figcaption code { display: block; }
footer { color: var(--muted); font-size: 0.85rem; }
@media (max-width: 640px) { .top { grid-template-columns: 1fr; } .top img { width: 84px; height: 84px; } }
@media (prefers-reduced-motion: reduce) { .stage.go .visitor, .stage.go .visitor .bubble { animation: none; transform: none; opacity: 1; } }
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <img src="${png("icon.png")}" alt="Ducktionary app icon">
    <div class="text">
      <span class="eyebrow">Ducktionary · mascots</span>
      <h1>The flock</h1>
      <p class="lede">Every character, mood and goose visit in the app, drawn by the same shape code the app renders. Chubby and soft: one warm-brown line, airbrushed volume, dot eyes and plenty of blush.</p>
    </div>
    <div class="theme" role="group" aria-label="Backdrop">
      <button type="button" data-set="light" aria-pressed="false">Light</button>
      <button type="button" data-set="dark" aria-pressed="false">Dark</button>
    </div>
  </div>

${progress}

  <section aria-labelledby="flock">
    <div class="head"><h2 id="flock">Characters and moods</h2><p class="lede">Each mascot picks a character at random when it appears. The goose is the star; ducklings drop by.</p></div>
    <div class="scroll">
      <table>
        <thead><tr><th scope="col">Character</th>${MOODS.map((m) => `<th scope="col">${title(m)}<span>${MOOD_NOTES[m]}</span></th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </section>

  <section aria-labelledby="visits">
    <div class="head"><h2 id="visits">Goose visits</h2><p class="lede">Every few minutes a goose may poke its head in from either edge and do one of these. Poke it and it honks and runs.</p></div>
    <div class="stage" id="stage">
      <p>Press the button and watch the right edge.</p>
      <div class="visitor"><span class="bubble">HONK!</span>${honk}</div>
    </div>
    <button class="summon" id="summon" type="button">Summon the goose</button>
    <div class="poses">${poseCards}</div>
  </section>

  <section aria-labelledby="style">
    <div class="head"><h2 id="style">Style rules</h2></div>
    <ul class="rules">
      <li><strong>Chubby, never perfectly round</strong><span>Bottom-heavy, a little lopsided. Ducklings lean and waddle.</span></li>
      <li><strong>Geese read as geese</strong><span>A real neck, a big flat bill with a knob, a short upturned tail.</span></li>
      <li><strong>Soft volume, no gloss</strong><span>Airbrushed light from the upper left and a warm underside.</span></li>
      <li><strong>One warm line</strong><span>Round-capped brown outline; lighter brown for inner contours.</span></li>
      <li><strong>Dot eyes, soft blush</strong><span>Feelings come from pose and the little yellow marks.</span></li>
      <li><strong>Sticker halo</strong><span>A thin white edge keeps every bird readable on dark screens.</span></li>
    </ul>
    <ul class="swatches">${swatches}</ul>
  </section>

  <section aria-labelledby="assets">
    <div class="head"><h2 id="assets">App assets</h2><p class="lede">Stored in <code>assets/images/</code>; regenerate them with <code>npm run mascots:icons</code>. They show up in a real build, not in Expo Go.</p></div>
    <div class="assets">
      <figure class="asset"><div class="frame"><img src="${png("icon.png")}" alt="App icon"></div><figcaption><strong>App icon</strong><code>icon.png · 1024 px</code></figcaption></figure>
      <figure class="asset"><div class="frame adaptive"><img src="${png("android-icon-foreground.png")}" alt="Android adaptive icon with a round mask"></div><figcaption><strong>Android adaptive</strong><code>android-icon-foreground.png</code></figcaption></figure>
      <figure class="asset"><div class="frame mono"><img src="${png("android-icon-monochrome.png")}" alt="Android themed icon silhouette"></div><figcaption><strong>Android themed</strong><code>android-icon-monochrome.png</code></figcaption></figure>
      <figure class="asset"><div class="frame"><img src="${png("splash-icon.png")}" alt="Splash screen image"></div><figcaption><strong>Splash</strong><code>splash-icon.png · on #FBF6EC</code></figcaption></figure>
      <figure class="asset"><div class="frame fav"><img src="${png("favicon.png")}" alt="Favicon at actual size"></div><figcaption><strong>Favicon</strong><code>favicon.png · 48 px</code></figcaption></figure>
    </div>
  </section>

  <footer>Generated ${generated} by <code>npm run mascots</code> from <code>src/components/mascot/shapes.ts</code>.</footer>
</div>
<script>
  const root = document.documentElement;
  const buttons = document.querySelectorAll(".theme button");
  const current = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.set === current())));
  buttons.forEach((b) => b.addEventListener("click", () => { root.dataset.theme = b.dataset.set; sync(); }));
  sync();
  const stage = document.getElementById("stage");
  document.getElementById("summon").addEventListener("click", () => {
    stage.classList.remove("go");
    void stage.offsetWidth; // restart the animation
    stage.classList.add("go");
  });
</script>
</body>
</html>
`;

fs.mkdirSync(new URL("docs/", root), { recursive: true });
fs.writeFileSync(out, html);
console.log(`Wrote ${out.pathname} (${Math.round(html.length / 1024)} KB)`);
