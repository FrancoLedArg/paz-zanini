// Extracted verbatim from the prototype (_private/archivo-paz-zanini.html); only types and field names changed.
import type { Documento } from "./index.ts";

function rng(seed: number){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hsh(s: string){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h;}
const f1 = (n: number) => n.toFixed(1);

/**
 * The Motivos' styles, inside every SVG motif() returns, so the figure looks the same wherever it's drawn:
 * inline in a page, or as an image on a canvas (which can't see the page's CSS, so it must set --ink, --stamp
 * and --paper itself; see apps/web/components/sala-3d/textures.ts).
 */
export const MOTIF_CSS =
  `.m-ink{fill:none;stroke:var(--ink);stroke-width:1.2}.m-fill{fill:var(--ink);opacity:.14}` +
  `.m-acc{fill:none;stroke:var(--stamp);stroke-width:1.5}.m-accf{fill:var(--stamp);opacity:.4}` +
  `.m-dot{fill:var(--ink)}.m-hol{fill:var(--paper);stroke:var(--ink);stroke-width:1.2}` +
  `.m-txt{fill:var(--ink);font-family:var(--f-type,"Courier New",monospace);font-size:9px}.m-dash{stroke-dasharray:3 3}` +
  `.m-f1{fill:var(--ink);opacity:.62}.m-f2{fill:var(--ink);opacity:.3}.m-f3{fill:var(--ink);opacity:.1}`;

export function motif(it: Pick<Documento, "signatura" | "motivo" | "faltante">){
  const r = rng(hsh(it.signatura)); const g = () => (r()+r()+r()+r()-2)*1.732;
  const L = (pts: number[][]) => pts.map((p,i)=>(i?"L":"M")+f1(p[0])+" "+f1(p[1])).join("");
  let s = "";
  switch(it.motivo){
    case "hist": {
      s += `<line class="m-ink" x1="8" y1="124" x2="232" y2="124"/>`;
      for (let i=0;i<12;i++){ const h=8+92*Math.exp(-Math.pow((i-5.5)/3,2))+r()*10, x=13+i*18;
        s += `<rect class="m-fill" x="${x}" y="${f1(124-h)}" width="16" height="${f1(h)}"/><rect class="m-ink" x="${x}" y="${f1(124-h)}" width="16" height="${f1(h)}"/>`; }
      break; }
    case "normal": {
      const y = (x: number) => { const z=(x-120)/30; return 112-92*Math.exp(-z*z/2); };
      const pts: number[][]=[]; for(let x=8;x<=232;x+=2) pts.push([x,y(x)]);
      const tail = (a: number, b: number) => { const p=[[a,112]]; for(let x=a;x<=b;x+=1) p.push([x,y(x)]); p.push([b,112]); return L(p)+"Z"; };
      s += `<path class="m-accf" d="${tail(8,61.2)}"/><path class="m-accf" d="${tail(178.8,232)}"/>`;
      s += `<path class="m-ink" d="${L(pts)}"/><line class="m-ink" x1="8" y1="112" x2="232" y2="112"/>`;
      s += `<line class="m-ink m-dash" x1="61.2" y1="112" x2="61.2" y2="${f1(y(61.2))}"/><line class="m-ink m-dash" x1="178.8" y1="112" x2="178.8" y2="${f1(y(178.8))}"/>`;
      s += `<text class="m-txt" x="61.2" y="126" text-anchor="middle">−1,96</text><text class="m-txt" x="178.8" y="126" text-anchor="middle">1,96</text><text class="m-txt" x="120" y="126" text-anchor="middle">0</text>`;
      break; }
    case "ci": {
      s += `<line class="m-acc m-dash" x1="8" y1="68" x2="232" y2="68"/><text class="m-txt" x="228" y="62" text-anchor="end">μ</text>`;
      for (let i=0;i<14;i++){ const x=18+i*15; let c=68+g()*7, h=17+r()*6, cls="m-ink";
        if (i===9){ c=103; h=15; cls="m-acc"; }
        s += `<line class="${cls}" x1="${x}" y1="${f1(c-h)}" x2="${x}" y2="${f1(c+h)}"/><line class="${cls}" x1="${x-3}" y1="${f1(c-h)}" x2="${x+3}" y2="${f1(c-h)}"/><line class="${cls}" x1="${x-3}" y1="${f1(c+h)}" x2="${x+3}" y2="${f1(c+h)}"/><circle class="m-dot" cx="${x}" cy="${f1(c)}" r="2"/>`; }
      s += `<text class="m-txt" x="8" y="134">IC 95 %: 13 de 14 cubren μ</text>`;
      break; }
    case "ranks": {
      s += `<line class="m-ink" x1="10" y1="72" x2="230" y2="72"/>`;
      const xs: number[]=[]; for(let i=0;i<10;i++) xs.push(18+r()*204); xs.sort((a,b)=>a-b);
      xs.forEach((x,i)=>{ const A = (i*7+3)%3!==0;
        s += `<circle class="${A?"m-dot":"m-hol"}" cx="${f1(x)}" cy="72" r="4.5"/><text class="m-txt" x="${f1(x)}" y="${i%2?96:90}" text-anchor="middle">${i+1}</text>`; });
      s += `<circle class="m-dot" cx="20" cy="122" r="4"/><text class="m-txt" x="30" y="125">grupo A</text><circle class="m-hol" cx="96" cy="122" r="4"/><text class="m-txt" x="106" y="125">grupo B · rangos</text>`;
      break; }
    case "scatter": {
      [[70,50],[166,44],[128,104]].forEach(([cx,cy]: number[])=>{
        s += `<ellipse class="m-ink m-dash" cx="${cx}" cy="${cy}" rx="36" ry="25"/>`;
        for(let i=0;i<13;i++) s += `<circle class="m-dot" cx="${f1(cx+g()*12)}" cy="${f1(cy+g()*8)}" r="2.3"/>`; });
      break; }
    case "ts": {
      const pts: number[][]=[]; for(let i=0;i<50;i++) pts.push([12+i*4.3, 104-i*1.05-15*Math.sin(i/2.6)+g()*2.4]);
      s += `<line class="m-ink" x1="10" y1="128" x2="232" y2="128"/><path class="m-ink" d="${L(pts)}"/><line class="m-acc m-dash" x1="12" y1="104" x2="223" y2="52"/>`;
      break; }
    case "grid": {
      const cols=["id","edad","peso","grupo","nota"];
      for(let rr=0;rr<6;rr++) for(let c=0;c<5;c++){ const x=20+c*40, y=10+rr*20;
        s += `${rr===0?`<rect class="m-fill" x="${x}" y="${y}" width="40" height="20"/>`:""}<rect class="m-ink" x="${x}" y="${y}" width="40" height="20"/>`;
        let t: string | number | undefined = rr===0 ? cols[c] : (c===0 ? rr : (c===3 ? (rr%2?"A":"B") : Math.round(10+r()*80)));
        if (rr===4 && c===2) t = it.faltante;
        s += `<text class="${rr===4&&c===2?"m-txt":"m-txt"}" x="${x+20}" y="${y+13.5}" text-anchor="middle"${rr===4&&c===2?' style="fill:var(--stamp);font-weight:700"':""}>${t}</text>`; }
      s += `<rect class="m-acc" x="100" y="10" width="40" height="120"/>`;
      break; }
    case "steps": {
      const w=["Pregunta","Datos","Explorar","Modelo","Informe"];
      s += `<line class="m-ink" x1="28" y1="60" x2="212" y2="60"/>`;
      w.forEach((t,i)=>{ const x=28+i*46; s += `<circle class="${i===2?"m-accf":"m-hol"}" cx="${x}" cy="60" r="14"/><circle class="m-ink" cx="${x}" cy="60" r="14"/><text class="m-txt" x="${x}" y="63.5" text-anchor="middle">${i+1}</text><text class="m-txt" x="${x}" y="92" text-anchor="middle">${t}</text>`; });
      break; }
    case "box": {
      s += `<line class="m-ink" x1="8" y1="128" x2="232" y2="128"/>`;
      for(let i=0;i<4;i++){ const x=44+i*52, m=70+g()*10, q1=m+10+r()*8, q3=m-12-r()*8, lo=q1+16+r()*10, hi=q3-16-r()*12;
        s += `<line class="m-ink" x1="${x}" y1="${f1(hi)}" x2="${x}" y2="${f1(q3)}"/><line class="m-ink" x1="${x}" y1="${f1(q1)}" x2="${x}" y2="${f1(lo)}"/><line class="m-ink" x1="${x-7}" y1="${f1(hi)}" x2="${x+7}" y2="${f1(hi)}"/><line class="m-ink" x1="${x-7}" y1="${f1(lo)}" x2="${x+7}" y2="${f1(lo)}"/><rect class="m-fill" x="${x-14}" y="${f1(q3)}" width="28" height="${f1(q1-q3)}"/><rect class="m-ink" x="${x-14}" y="${f1(q3)}" width="28" height="${f1(q1-q3)}"/><line class="m-acc" x1="${x-14}" y1="${f1(m)}" x2="${x+14}" y2="${f1(m)}"/>`;
        if (i===2) s += `<circle class="m-hol" cx="${x}" cy="${f1(hi-14)}" r="3"/>`; }
      break; }
    case "venn": {
      s += `<circle class="m-ink" cx="96" cy="56" r="40"/><circle class="m-ink" cx="144" cy="56" r="40"/><circle class="m-ink" cx="120" cy="94" r="40"/><circle class="m-accf" cx="120" cy="70" r="7"/>`;
      s += `<text class="m-txt" x="44" y="22" text-anchor="middle">Estadística</text><text class="m-txt" x="196" y="22" text-anchor="middle">Programación</text><text class="m-txt" x="120" y="136" text-anchor="middle">Dominio</text>`;
      break; }
    case "dash": {
      s += `<rect class="m-ink" x="8" y="8" width="110" height="60"/><rect class="m-ink" x="122" y="8" width="110" height="60"/><rect class="m-ink" x="8" y="72" width="224" height="60"/>`;
      for(let i=0;i<6;i++){ const h=10+r()*40; s += `<rect class="m-fill" x="${16+i*16}" y="${f1(62-h)}" width="11" height="${f1(h)}"/>`; }
      s += `<text class="m-txt" x="177" y="38" text-anchor="middle" style="font-size:20px;font-weight:700">0,87</text><text class="m-txt" x="177" y="54" text-anchor="middle">r de Pearson</text>`;
      const pts: number[][]=[]; for(let i=0;i<24;i++) pts.push([16+i*9, 112-i*0.9-8*Math.sin(i/2)+g()*3]); s += `<path class="m-acc" d="${L(pts)}"/>`;
      break; }
    case "tree": {
      const n=(x: number,y: number,t: string)=>`<rect class="m-hol" x="${x-26}" y="${y-9}" width="52" height="18"/><text class="m-txt" x="${x}" y="${y+3}" text-anchor="middle">${t}</text>`;
      const e=(a: number,b: number,c: number,d: number)=>`<line class="m-ink" x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`;
      s += e(120,26,70,62)+e(120,26,170,62)+e(70,62,40,104)+e(70,62,100,104)+e(170,62,148,104)+e(170,62,204,104);
      s += n(120,22,"x₁ ≤ 3,5")+n(70,62,"x₂ ≤ 1,2")+n(170,62,"x₂ ≤ 4,0");
      ([["A",40],["B",100],["B",148],["A",204]] as const).forEach(([t,x])=>{ s += `<circle class="${t==="A"?"m-dot":"m-hol"}" cx="${x}" cy="108" r="9"/><text class="m-txt" x="${x}" y="${t==="A"?"111.5":"111.5"}" text-anchor="middle"${t==="A"?' style="fill:var(--paper)"':""}>${t}</text>`; });
      break; }
    case "newton": {
      const y = (x: number) => 126-0.003*(x-10)*(x-10), d = (x: number) => -0.006*(x-10);
      const pts: number[][]=[]; for(let x=10;x<=226;x+=2) pts.push([x,y(x)]);
      s += `<line class="m-ink" x1="8" y1="80" x2="232" y2="80"/><path class="m-ink" d="${L(pts)}"/>`;
      let x=214;
      for(let k=0;k<3;k++){ const yx=y(x), nx=x+(80-yx)/d(x);
        s += `<line class="m-acc" x1="${f1(x)}" y1="${f1(yx)}" x2="${f1(nx)}" y2="80"/><line class="m-ink m-dash" x1="${f1(x)}" y1="80" x2="${f1(x)}" y2="${f1(yx)}"/><text class="m-txt" x="${f1(x)}" y="94" text-anchor="middle">x${"₀₁₂"[k]}</text>`;
        x=nx; }
      s += `<text class="m-txt" x="12" y="134">xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)</text>`;
      break; }
    case "reg": {
      s += `<line class="m-ink" x1="14" y1="128" x2="230" y2="128"/><line class="m-ink" x1="14" y1="128" x2="14" y2="8"/>`;
      for(let i=0;i<22;i++){ const x=24+r()*196, yh=118-0.4*(x-20), y=yh+g()*9;
        if (i%5===0) s += `<line class="m-acc" x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x)}" y2="${f1(yh)}"/>`;
        s += `<circle class="m-dot" cx="${f1(x)}" cy="${f1(y)}" r="2.4"/>`; }
      s += `<line class="m-ink" x1="20" y1="118" x2="226" y2="35.6"/><text class="m-txt" x="226" y="134" text-anchor="end">ŷ = β₀ + β₁x</text>`;
      break; }
    case "wave": {
      const y = (x: number) => 64+36*Math.sin((x-10)/15);
      const pts: number[][]=[]; for(let x=10;x<=230;x+=2) pts.push([x,y(x)]);
      s += `<line class="m-ink" x1="8" y1="64" x2="232" y2="64"/><path class="m-ink" d="${L(pts)}"/>`;
      for(let x=14;x<=230;x+=12) s += `<line class="m-acc" x1="${x}" y1="64" x2="${x}" y2="${f1(y(x))}"/><circle class="m-dot" cx="${x}" cy="${f1(y(x))}" r="2"/>`;
      s += `<text class="m-txt" x="10" y="130">muestreo de una señal</text>`;
      break; }
    case "stack": {
      for(let i=0;i<5;i++){ const y=10+i*24, a=40+r()*70, b=30+r()*60, c=204-a-b;
        s += `<rect class="m-f1" x="18" y="${y}" width="${f1(a)}" height="15"/><rect class="m-f2" x="${f1(18+a)}" y="${y}" width="${f1(b)}" height="15"/><rect class="m-f3" x="${f1(18+a+b)}" y="${y}" width="${f1(c)}" height="15"/><rect class="m-ink" x="18" y="${y}" width="204" height="15"/>`; }
      s += `<text class="m-txt" x="18" y="136">0 %</text><text class="m-txt" x="222" y="136" text-anchor="end">100 %</text>`;
      break; }
    case "mask": {
      for(let rr=0;rr<6;rr++) for(let c=0;c<6;c++){ const x=12+c*36, y=8+rr*20;
        s += `<rect class="m-ink" x="${x}" y="${y}" width="36" height="20"/>`;
        if (rr===0) s += `<rect class="m-fill" x="${x}" y="${y}" width="36" height="20"/><text class="m-txt" x="${x+18}" y="${y+13.5}" text-anchor="middle">${["id","nombre","dni","edad","barrio","dx"][c]}</text>`;
        else if (c===1||c===2||(c===4&&r()>.4)) s += `<rect class="m-f1" x="${x+5}" y="${y+6}" width="26" height="8"/>`;
        else s += `<text class="m-txt" x="${x+18}" y="${y+13.5}" text-anchor="middle">${c===0?"#"+(100+rr):Math.round(18+r()*60)}</text>`; }
      break; }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 140" role="img" aria-label="Figura de portada"><style>${MOTIF_CSS}</style>${s}</svg>`;
}

