// Firefox Developer Edition (headed, real GPU) over WebDriver BiDi: the timeline of each Colección change.
// Usage: node timeline.mjs <base-url>
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2];
const dir = mkdtempSync(join(tmpdir(), "fftl-"));
writeFileSync(join(dir, "user.js"), ['user_pref("browser.shell.checkDefaultBrowser", false);', 'user_pref("datareporting.policy.dataSubmissionEnabled", false);', 'user_pref("browser.aboutwelcome.enabled", false);'].join("\n"));
const port = 9300 + Math.floor(Math.random() * 500);
const ff = spawn("/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox", ["-no-remote", "-profile", dir, "--remote-debugging-port", String(port), "-width", "1320", "-height", "920"], { env: { ...process.env, MOZ_REMOTE_ALLOW_SYSTEM_ACCESS: "1" }, stdio: ["ignore", "ignore", "pipe"] });
await new Promise((r) => ff.stderr.on("data", (d) => /WebDriver BiDi listening/.test(String(d)) && r()));
const ws = new WebSocket(`ws://127.0.0.1:${port}/session`);
await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pending = new Map();
ws.addEventListener("message", (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.type === "error" ? reject(new Error(msg.error + ": " + msg.message)) : resolve(msg.result); } });
const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
await send("session.new", { capabilities: {} });
const { context } = await send("browsingContext.create", { type: "tab" });
await send("browsingContext.setViewport", { context, viewport: { width: 1280, height: 720 }, devicePixelRatio: 2 });
const probe = `() => {
  try { sessionStorage.setItem("loader-seen", "1"); } catch {}
  const P = (globalThis.__tl = { rec: false, frames: [], events: [], draws: 0 });
  const proto = WebGL2RenderingContext.prototype;
  for (const n of ["drawElements", "drawArrays"]) { const o = proto[n]; proto[n] = function (...a) { P.draws++; return o.apply(this, a); }; }
  let last = 0;
  const tick = (now) => { if (P.rec) { P.frames.push([now, P.draws - last]); } last = P.draws; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  let path = location.pathname, step = "-";
  // Polled: a preload script runs before <html> exists, so an observer can't be attached yet.
  setInterval(() => {
    const now = document.documentElement?.dataset.helice ?? "-";
    if (now !== step) { step = now; if (P.rec) P.events.push([performance.now(), "helice=" + now]); }
    if (location.pathname !== path) { path = location.pathname; if (P.rec) P.events.push([performance.now(), "url=" + path]); }
  }, 4);
}`;
await send("script.addPreloadScript", { functionDeclaration: probe });
const evaluate = async (expression) => { const r = await send("script.evaluate", { expression, target: { context }, awaitPromise: true, resultOwnership: "none" }); if (r.type === "exception") throw new Error(r.exceptionDetails.text); return r.result; };
const until = async (expr, timeout = 30000) => { const t = Date.now(); while (Date.now() - t < timeout) { if ((await evaluate(`!!(${expr})`)).value) return; await new Promise((r) => setTimeout(r, 50)); } throw new Error("timeout " + expr); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("browsingContext.navigate", { context, url: base, wait: "complete" });
await until(`document.querySelector('.helice-3d[aria-busy="false"]')`);
await sleep(2500);
for (const name of ["Ciencia de datos desde cero", "Estadística desde cero", "Ciencia de datos desde cero", "Estadística aplicada"]) {
  await evaluate(`(() => { const P = globalThis.__tl; P.frames = []; P.events = []; P.rec = true; P.t0 = performance.now(); document.querySelector('nav[aria-label="Colecciones"] a[aria-label="${name}"]').click(); })()`);
  await sleep(150);
  await until(`document.documentElement.dataset.helice === undefined`, 15000);
  await sleep(300);
  const r = JSON.parse((await evaluate(`JSON.stringify(globalThis.__tl)`)).value);
  const t = (x) => Math.round(x - r.t0);
  const shown = r.frames.map(([at, d]) => [t(at), d]);
  // The blank: the longest run of frames that drew no book, between the first and last frame that did.
  const lit = shown.map(([, d]) => d > 3);
  const first = lit.indexOf(true), last = lit.lastIndexOf(true);
  let blank = [0, 0];
  for (let i = first, start = -1; i <= last; i++) {
    if (!lit[i] && start < 0) start = i;
    if (lit[i] && start >= 0) { if (shown[i][0] - shown[start][0] > blank[1] - blank[0]) blank = [shown[start][0], shown[i][0]]; start = -1; }
  }
  const gaps = r.frames.slice(1).map(([at], i) => [t(r.frames[i][0]), at - r.frames[i][0]]).filter(([, g]) => g > 20);
  console.log(`\n→ ${name}`);
  console.log("  events:", r.events.map(([at, e]) => `${t(at)}ms ${e}`).join(" | "));
  console.log(`  blank paper ${blank[0]}–${blank[1]}ms (${blank[1] - blank[0]} ms)`);
  console.log(`  settled at ~${t(r.events.at(-1)?.[0] ?? r.t0)}ms; longest frame ${Math.round(Math.max(...r.frames.slice(1).map(([at], i) => at - r.frames[i][0])))}ms`);
  console.log("  slow frames (start+duration):", gaps.map(([a, g]) => `${a}+${Math.round(g)}`).join(" ") || "none");
  await evaluate(`globalThis.__tl.rec = false`);
  await sleep(1500);
}
await send("browser.close").catch(() => {});
process.exit(0);
