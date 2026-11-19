import { renderToStaticMarkup } from "react-dom/server";
import {
  CanvasTexture,
  DataTexture,
  EquirectangularReflectionMapping,
  FloatType,
  LinearSRGBColorSpace,
  LinearMipmapLinearFilter,
  LinearFilter,
  MathUtils,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import hankenFont from "@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2?inline";
import newsreaderFont from "@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?inline";

import type { Manual } from "../catalog/catalog";
import { Lomo, Tapa, TAPA_FIELD_SHARE, tapaColors } from "../tapa/tapa";
import {
  bookThickness,
  CASE_HEIGHT,
  PAGE_HEIGHT,
  type WrapLayout,
} from "./geometry";

// Every texture the book uses: the per-book cover wrap, and micro-detail shared by every book.
// shortcut: micro-detail is generated on the main thread (~100 ms); move it to a worker if it shows as a startup hitch.

export const PHONE =
  typeof matchMedia !== "undefined" && matchMedia("(max-width: 767px)").matches;
const DETAIL_SIZE = PHONE ? 512 : 1024;

// An SVG drawn as an image can't use the page's fonts, so each one carries its own.
const FONT_FACES = `<style>
@font-face{font-family:'Newsreader Variable';font-weight:200 800;src:url(${newsreaderFont}) format('woff2')}
@font-face{font-family:'Hanken Grotesk Variable';font-weight:100 900;src:url(${hankenFont}) format('woff2')}
</style>`;

async function svgImage(markup: string, width: number, height: number) {
  const svg = markup.replace(
    /^<svg([^>]*)>/,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"$1>${FONT_FACES}`,
  );
  // A Blob URL skips URL-encoding the embedded fonts for every image.
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  const image = new Image(width, height);
  image.src = url;
  try {
    await image.decode();
  } finally {
    URL.revokeObjectURL(url);
  }
  return image;
}

// The same goes for images: the Tapa's engraving is fetched and carried inline, as a data URI.
async function inlineImages(markup: string) {
  const href = /<image href="([^"]+)"/.exec(markup)?.[1];
  if (!href) return markup;
  const response = await fetch(href);
  if (!response.ok) throw new Error(`No engraving at ${href}`);
  const blob = await response.blob();
  const dataUri = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    // readAsDataURL always yields a string.
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Unreadable engraving"));
    };
    reader.readAsDataURL(blob);
  });
  return markup.replace(href, dataUri);
}

/** The printed cover, laid out flat as [back joint | spine | front joint | front board], at `pxPerUnit` px per world unit. */
export async function wrapTexture(
  manual: Manual,
  layout: WrapLayout,
  pxPerUnit: number,
  anisotropy: number,
): Promise<Texture> {
  const width = Math.round(
    (layout.board + 2 * layout.joint + layout.spine) * pxPerUnit,
  );
  const height = Math.round(CASE_HEIGHT * pxPerUnit);
  const page = PAGE_HEIGHT * pxPerUnit;
  const top = (height - page) / 2;
  const spineThickness = bookThickness(manual) * pxPerUnit;
  const board = layout.board * pxPerUnit;

  const [tapa, lomo] = await Promise.all([
    svgImage(
      await inlineImages(renderToStaticMarkup(<Tapa manual={manual} />)),
      Math.round(board),
      Math.round(page),
    ),
    svgImage(
      renderToStaticMarkup(<Lomo manual={manual} />),
      Math.round(page),
      Math.round(spineThickness),
    ),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas context for the cover");
  const { background, paper } = tapaColors(manual);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  // The cream field bleeds over the head turn-in and the front joint, as a printed cover would, so no band shows round it.
  const frontEdge = (layout.joint + layout.spine) * pxPerUnit;
  context.fillStyle = paper;
  context.fillRect(
    frontEdge,
    0,
    width - frontEdge,
    top + page * TAPA_FIELD_SHARE,
  );
  context.drawImage(tapa, width - board, top, board, page);
  // The Lomo runs head to tail with its letter tops toward the front cover, so it reads left to right when the book lies face up.
  const spineCentre = (layout.joint + layout.spine / 2) * pxPerUnit;
  context.save();
  context.translate(spineCentre + spineThickness / 2, top);
  context.rotate(Math.PI / 2);
  context.drawImage(lomo, 0, 0, page, spineThickness);
  context.restore();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

export interface MicroDetail {
  /** Paper tooth under the laminate: a normal map. */
  tooth: Texture;
  /** Scratches, dust and a faint orange peel on the laminate: a clearcoat normal map. */
  laminate: Texture;
  /** Gloss variation across the cover: a roughness map. */
  grain: Texture;
  /** The page block's edge: colour and normal maps of stacked leaves, lines varying along u. */
  pageColor: Texture;
  pageNormal: Texture;
  /** The same, turned a quarter, for the head and tail where the leaves run the other way. */
  pageColorAcross: Texture;
  pageNormalAcross: Texture;
}

let microDetail: MicroDetail | undefined;

/** Built once per session and shared by every book. */
export function getMicroDetail(anisotropy: number): MicroDetail {
  microDetail ??= buildMicroDetail(anisotropy);
  return microDetail;
}

function buildMicroDetail(anisotropy: number): MicroDetail {
  const size = DETAIL_SIZE;
  MathUtils.seededRandom(7);
  const random = () => MathUtils.seededRandom();

  const tooth = fbm(size, [size / 8, size / 32], [0.6, 0.4], 11);

  const laminate = fbm(size, [4, 16], [0.7, 0.3], 23).map((h) => h * 0.25);
  for (let i = 0; i < 8; i++) {
    const length = (0.02 + random() * 0.15) * size;
    const angle = random() * Math.PI;
    let x = random() * size;
    let y = random() * size;
    const depth = 0.1 + random() * 0.2;
    for (let t = 0; t < length; t += 0.5) {
      stamp(laminate, size, x, y, 0.8, -depth);
      x += Math.cos(angle) * 0.5;
      y += Math.sin(angle) * 0.5;
    }
  }
  for (let i = 0; i < 120; i++) {
    stamp(
      laminate,
      size,
      random() * size,
      random() * size,
      0.6 + random() * 0.8,
      0.2 + random() * 0.3,
    );
  }

  const grain = fbm(size, [size / 64, size / 16], [0.5, 0.5], 37);
  const grainPixels = new Uint8Array(size * size * 4);
  grain.forEach((g, i) => {
    // Multiplies the material's roughness by 0.7–1.
    const value = Math.round(255 * (0.7 + 0.3 * g));
    grey(grainPixels, i, value);
  });

  // Leaves: 1D stripes of random width; the gaps between them sink and darken.
  const pageSize = 512;
  const profile = new Float32Array(pageSize);
  for (let x = 0; x < pageSize;) {
    const leaf = 5 + Math.floor(random() * 5);
    for (let k = 0; k < leaf && x < pageSize; k++, x++) {
      const across = k / (leaf - 1);
      profile[x] = Math.sin(Math.PI * across) ** 0.4;
    }
  }
  const pageHeight = new Float32Array(pageSize * pageSize);
  const pageColor = new Uint8Array(pageSize * pageSize * 4);
  const along = fbm(pageSize, [8, 64], [0.6, 0.4], 51);
  for (let y = 0; y < pageSize; y++) {
    for (let x = 0; x < pageSize; x++) {
      const i = y * pageSize + x;
      const h = (profile[x] ?? 0) * (0.9 + 0.1 * (along[i] ?? 0));
      pageHeight[i] = h;
      // Neutral shade: the page material's colour supplies the paper tone.
      const shade = Math.round(255 * (0.9 + 0.1 * h));
      grey(pageColor, i, shade);
    }
  }

  const repeating = (texture: Texture, tile: number) => {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    // Phones get half-size maps over half the area, so the detail keeps its physical size.
    const scaled = (tile * size) / 1024;
    texture.repeat.set(1 / scaled, 1 / scaled);
    texture.channel = 1; // world-unit UVs
    return texture;
  };

  const across = (texture: Texture) => {
    const turned = texture.clone();
    turned.center.set(0.5, 0.5);
    turned.rotation = Math.PI / 2;
    return turned;
  };
  const pageColorMap = dataTexture(pageColor, pageSize, anisotropy);
  pageColorMap.colorSpace = SRGBColorSpace;
  const pageNormalMap = normalTexture(pageHeight, pageSize, 3, anisotropy);

  return {
    tooth: repeating(normalTexture(tooth, size, 1.5, anisotropy), 0.5),
    laminate: repeating(normalTexture(laminate, size, 2.5, anisotropy), 2),
    grain: repeating(dataTexture(grainPixels, size, anisotropy), 0.7),
    pageColor: pageColorMap,
    pageNormal: pageNormalMap,
    pageColorAcross: across(pageColorMap),
    pageNormalAcross: across(pageNormalMap),
  };
}

/** Writes an opaque grey pixel without allocating. */
function grey(pixels: Uint8Array, i: number, value: number) {
  pixels.fill(value, i * 4, i * 4 + 3);
  pixels[i * 4 + 3] = 255;
}

/**
 * A studio drawn in code (book-3d Light): a dark gradient with soft softboxes, for the laminate to reflect.
 * HDR (float), because a clearcoat reflects only ~4 % head-on: a softbox capped at white would not show.
 */
export function environmentTexture(): Texture {
  const width = 512;
  const height = 256;
  // Linear radiance at the top, horizon and bottom: A24's #25282f → #0e0f13 → #020203.
  const sky = [
    [0.018, 0.021, 0.028],
    [0.0044, 0.0048, 0.0065],
    [0.0006, 0.0006, 0.001],
  ] as const;
  // Softboxes as [azimuth°, elevation°, width°, height°, radiance]. Azimuth 90° is +z, the viewer's side.
  // A cover turned by `yaw` reflects azimuth ≈ 90° − 2·yaw; that places the strips.
  const softboxes = [
    [20, 4, 3.5, 40, 12], // strip: a soft band across the cover at three-quarter (yaw 37°)
    [52, 4, 3, 40, 10], // strip: the same at the hero pose (yaw 24°), so the band travels as the book turns
    [130, 12, 10, 30, 2], // narrow strip, front right: a stripe down the spine
    [-90, 18, 50, 16, 2], // behind and above: the cover wraps and every head bevel
    [0, 58, 360, 8, 2], // overhead ring: a line along the board edges seen from above
  ] as const;
  const data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const elevation = 90 - (y / (height - 1)) * 180;
    const t = y / (height - 1);
    const [a, b] = t < 0.5 ? [sky[0], sky[1]] : [sky[1], sky[2]];
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    for (let x = 0; x < width; x++) {
      const azimuth = (x / width) * 360 - 180;
      let light = 0;
      for (const [az, el, w, h, radiance] of softboxes) {
        const dAz = Math.abs(
          MathUtils.euclideanModulo(azimuth - az + 180, 360) - 180,
        );
        // Soft edges: a plateau at the centre easing to nothing well past the nominal edge.
        const fall = (d: number, half: number) =>
          1 - MathUtils.smoothstep(d, half * 0.4, half * 1.6);
        light +=
          radiance * fall(dAz, w / 2) * fall(Math.abs(elevation - el), h / 2);
      }
      // Three's equirect lookup puts u = atan2(z, x) / 2π + 0.5; this row is drawn top-down, so flipY stays false.
      const i = ((height - 1 - y) * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        data[i + c] = (a[c] ?? 0) + ((b[c] ?? 0) - (a[c] ?? 0)) * k + light;
      }
      data[i + 3] = 1;
    }
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Height field → tangent-space normal map, by central differences, wrapping at the edges so it tiles. */
function normalTexture(
  height: Float32Array,
  size: number,
  strength: number,
  anisotropy: number,
) {
  const pixels = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) =>
    height[((y + size) % size) * size + ((x + size) % size)] ?? 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      pixels[o] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      pixels[o + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      pixels[o + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      pixels[o + 3] = 255;
    }
  }
  return dataTexture(pixels, size, anisotropy);
}

function dataTexture(pixels: Uint8Array, size: number, anisotropy: number) {
  const texture = new DataTexture(pixels, size, size);
  texture.colorSpace = NoColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  return texture;
}

/** Tileable value-noise octaves in 0..1; `cells` is the lattice count per side for each octave. */
function fbm(size: number, cells: number[], weights: number[], seed: number) {
  const out = new Float32Array(size * size);
  cells.forEach((count, octave) => {
    const weight = weights[octave] ?? 0;
    const lattice = Math.max(1, Math.round(count));
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * lattice;
      const y0 = Math.floor(fy);
      const ty = MathUtils.smoothstep(fy - y0, 0, 1);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * lattice;
        const x0 = Math.floor(fx);
        const tx = MathUtils.smoothstep(fx - x0, 0, 1);
        const corner = (i: number, j: number) =>
          hash((x0 + i) % lattice, (y0 + j) % lattice, seed + octave);
        const top = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * tx;
        const bottom = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * tx;
        const index = y * size + x;
        out[index] = (out[index] ?? 0) + weight * (top + (bottom - top) * ty);
      }
    }
  });
  return out;
}

/** Adds a soft round bump (or dent, for negative `amount`) to a wrapping height field. */
function stamp(
  field: Float32Array,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  amount: number,
) {
  const reach = Math.ceil(radius * 2);
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const x = Math.floor(cx) + dx;
      const y = Math.floor(cy) + dy;
      const falloff = Math.exp(
        -((x - cx) ** 2 + (y - cy) ** 2) / (radius * radius),
      );
      const index = ((y + size) % size) * size + ((x + size) % size);
      const current = field[index] ?? 0;
      field[index] =
        amount < 0
          ? Math.min(current, current + amount * falloff)
          : current + amount * falloff;
    }
  }
}

function hash(x: number, y: number, seed: number) {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(seed, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
