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
  const P = (globalThis.__tl = { rec: false, frames: [], calls: [] });
  let last = performance.now();
  const tick = (now) => { if (P.rec) P.frames.push([last, now - last]); last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  const time = (proto, names, tag) => { for (const n of names) { const o = proto[n]; if (!o) continue; proto[n] = function (...a) { const t = performance.now(); const r = o.apply(this, a); const d = performance.now() - t; if (P.rec && d > 0.5) P.calls.push([t, d, tag + "." + n + (a[0] && a[0].width ? "(" + a[0].width + "x" + a[0].height + ")" : a[8] && a[8].width ? "(" + a[8].width + "x" + a[8].height + ")" : "")]); return r; }; } };
  time(WebGL2RenderingContext.prototype, ["texImage2D", "texSubImage2D", "texStorage2D", "generateMipmap", "compileShader", "linkProgram", "getProgramParameter", "getShaderParameter", "bufferData", "drawElements", "drawArrays", "readPixels"], "gl");
  time(CanvasRenderingContext2D.prototype, ["drawImage", "fillRect", "getImageData"], "2d");
  time(HTMLCanvasElement.prototype, ["getContext"], "canvas");
}`;
await send("script.addPreloadScript", { functionDeclaration: probe });
const evaluate = async (expression) => { const r = await send("script.evaluate", { expression, target: { context }, awaitPromise: true, resultOwnership: "none" }); if (r.type === "exception") throw new Error(r.exceptionDetails.text); return r.result; };
const until = async (expr, timeout = 30000) => { const t = Date.now(); while (Date.now() - t < timeout) { if ((await evaluate(`!!(${expr})`)).value) return; await new Promise((r) => setTimeout(r, 50)); } throw new Error("timeout " + expr); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await send("browsingContext.navigate", { context, url: base, wait: "complete" });
await until(`document.querySelector('.helice-3d[aria-busy="false"]')`);
await sleep(3000);
const steps = Number(process.argv[3] ?? 6);
await evaluate(`(() => { const P = globalThis.__tl; P.frames = []; P.calls = []; P.rec = true; P.t0 = performance.now(); })()`);
for (let i = 0; i < steps; i++) {
  await evaluate(`scrollBy({ top: innerHeight, behavior: "smooth" })`);
  await sleep(1200);
  console.log("scrollY", (await evaluate("scrollY")).value);
}
const r = JSON.parse((await evaluate(`JSON.stringify(globalThis.__tl)`)).value);
const t = (x) => Math.round(x - r.t0);
const slow = r.frames.filter(([, d]) => d > 20);
console.log(`frames ${r.frames.length}, over 20 ms: ${slow.length}, longest ${Math.round(Math.max(...r.frames.map(([, d]) => d)))} ms`);
for (const [at, d] of slow) {
  const inside = r.calls.filter(([c]) => c >= at && c <= at + d);
  const sum = {};
  for (const [, cd, n] of inside) sum[n] = (sum[n] ?? 0) + cd;
  console.log(`  ${t(at)}ms +${Math.round(d)}: ` + Object.entries(sum).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n, v]) => `${n} ${v.toFixed(1)}`).join(", "));
}
const total = {};
for (const [, cd, n] of r.calls) { const k = n.replace(/\(.*/, ""); total[k] = total[k] ?? [0, 0, 0]; total[k][0]++; total[k][1] += cd; total[k][2] = Math.max(total[k][2], cd); }
console.log("calls over 0.5 ms (count, total, max):");
for (const [n, [c, s, m]] of Object.entries(total).sort((a, b) => b[1][1] - a[1][1])) console.log(`  ${n}: ${c}, ${s.toFixed(1)} ms, max ${m.toFixed(1)}`);
await send("browser.close").catch(() => {});
process.exit(0);
