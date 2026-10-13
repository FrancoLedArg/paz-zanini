// Everything the scene shows as an image is drawn here, on a 2D canvas that three.js uses as a texture:
// the drawers' Rótulos, the Carpetas' tabs and covers, the shadow under the Archivador.
// Colors and fonts come from the page's CSS variables, so the canvases match the HTML and follow the theme.
import { CanvasTexture, SRGBColorSpace } from "three";
import { motif } from "@paz/content/motif";
import { cssVar } from "@/lib/theme";
import type { CarpetaData, RotuloData } from "./types";

/** A canvas and the texture that shows it. After drawing on the canvas again, set `texture.needsUpdate = true`. */
export type CanvasTex = { canvas: HTMLCanvasElement; texture: CanvasTexture };

export function canvasTexture(width: number, height: number): CanvasTex {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace; // the canvas holds sRGB colors, like the CSS they come from
  texture.anisotropy = 4; // keeps the text sharp when seen at an angle
  return { canvas, texture };
}

/** The baked floor shadow: a soft dark ellipse, drawn once. */
export function floorShadowTexture() {
  const { canvas, texture } = canvasTexture(128, 128);
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(0,0,0,.55)");
  gradient.addColorStop(0.55, "rgba(0,0,0,.3)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return texture;
}

/** Sets the largest font, from `maxPx` down to 9 px, at which `text` fits in `maxWidth`. */
function setFittingFont(ctx: CanvasRenderingContext2D, font: (px: number) => string, maxPx: number, text: string, maxWidth: number) {
  for (let px = maxPx; px > 8; px--) {
    ctx.font = font(px);
    if (ctx.measureText(text).width <= maxWidth) return;
  }
}

/** A Rótulo like the HTML one (components/rotulo.tsx): numeral in red, name, range. */
export function drawRotulo(canvas: HTMLCanvasElement, rotulo: RotuloData) {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const typewriter = cssVar("--f-type");
  const body = cssVar("--f-body");
  ctx.fillStyle = cssVar("--paper");
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";

  // Measured as it's drawn, uppercase and spaced out, so it never overflows.
  const numeral = rotulo.numeral.toUpperCase();
  ctx.fillStyle = cssVar("--stamp");
  ctx.letterSpacing = `${h * 0.025}px`;
  setFittingFont(ctx, (px) => `700 ${px}px ${typewriter}`, h * 0.19, numeral, w * 0.9);
  ctx.fillText(numeral, w * 0.06, h * 0.3);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = cssVar("--ink");
  setFittingFont(ctx, (px) => `700 ${px}px ${body}`, h * 0.3, rotulo.nombre, w * 0.88);
  ctx.fillText(rotulo.nombre, w * 0.06, h * 0.64);

  ctx.fillStyle = cssVar("--ink-soft");
  setFittingFont(ctx, (px) => `400 ${px}px ${typewriter}`, h * 0.19, rotulo.rango, w * 0.88);
  ctx.fillText(rotulo.rango, w * 0.06, h * 0.88);
}

/** The Signatura on a Carpeta's tab. */
export function drawTab(canvas: HTMLCanvasElement, carpeta: CarpetaData) {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = cssVar("--manila");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = cssVar("--ink");
  ctx.font = `700 ${canvas.height * 0.62}px ${cssVar("--f-type")}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(carpeta.rotulo, canvas.width / 2, canvas.height * 0.55);
}

// The SVG from motif() brings its own styles (MOTIF_CSS), written with --ink, --stamp and --paper. Drawn as an
// image it can't see the page's CSS variables, so it gets the current theme's values here.
const themeColors = () => `svg{--ink:${cssVar("--ink")};--stamp:${cssVar("--stamp")};--paper:${cssVar("--paper")}}`;

/**
 * The sheet inside a Carpeta, lying landscape: Signatura and title on the left, the Motivo (or typed lines) on the right.
 * The Motivo loads as an image, so this finishes later: `onDone` runs once the canvas is complete.
 */
export function drawCover(canvas: HTMLCanvasElement, carpeta: CarpetaData, onDone: () => void) {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  ctx.fillStyle = cssVar("--paper");
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = "alphabetic";

  // Header: "EST-03 · MANUAL" and a red rule under it.
  const tipo = carpeta.tipo.split(" ·")[0].toUpperCase();
  ctx.fillStyle = cssVar("--stamp");
  ctx.font = `700 ${h * 0.085}px ${cssVar("--f-type")}`;
  ctx.fillText(`${carpeta.rotulo} · ${tipo}`, w * 0.04, h * 0.16);
  ctx.fillRect(w * 0.04, h * 0.21, w * 0.44, 2);

  // The title, word-wrapped into the left half, four lines at most.
  ctx.fillStyle = cssVar("--ink");
  ctx.font = `400 ${h * 0.12}px ${cssVar("--f-body")}`;
  const lines: string[] = [];
  for (const word of carpeta.titulo.split(" ")) {
    const last = lines.at(-1);
    if (last && ctx.measureText(`${last} ${word}`).width <= w * 0.44) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  lines.slice(0, 4).forEach((line, i) => {
    const cutShort = i === 3 && lines.length > 4;
    ctx.fillText(cutShort ? `${line}…` : line, w * 0.04, h * (0.38 + i * 0.15));
  });

  // The figure box on the right half, with the Motivo's own 240 × 140 proportions.
  const fig = { x: w * 0.52, y: h * 0.12, w: w * 0.44, h: w * 0.44 * (140 / 240) };
  if (!carpeta.motivo) {
    // No Motivo: a few typed lines instead.
    ctx.fillStyle = cssVar("--rule");
    for (let i = 0; i < 6; i++) ctx.fillRect(fig.x, fig.y + 8 + i * (fig.h / 6), fig.w * (i % 3 === 2 ? 0.6 : 1), 2);
    onDone();
    return;
  }
  // A size, so the image is drawn at the box's resolution; and the theme's colors, ahead of the motif's own styles.
  const svg = motif({ signatura: carpeta.rotulo, motivo: carpeta.motivo, faltante: carpeta.faltante })
    .replace("<svg ", `<svg width="${fig.w}" height="${fig.h}" `)
    .replace("<style>", `<style>${themeColors()}`);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, fig.x, fig.y, fig.w, fig.h);
    onDone();
  };
  img.onerror = onDone; // without its Motivo, the cover still shows its title
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
