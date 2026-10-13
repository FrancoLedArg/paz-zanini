// Applies the page's theme to the scene: material colors, room light, and every canvas.
import type { Scene } from "three";
import { cssVar, isDark } from "@/lib/theme";
import type { CajonMesh } from "./archivador/cajon";
import type { Materials } from "./archivador/materials";
import { drawCover, drawRotulo, drawTab, type CanvasTex } from "./textures";
import type { CajonData } from "./types";

/** Waits for the site's fonts: a canvas drawn before they load would keep the fallback font for good. */
export async function waitForSiteFonts() {
  const families = [cssVar("--f-type"), cssVar("--f-body")];
  const loads = families.flatMap((family) => [document.fonts.load(`400 20px ${family}`), document.fonts.load(`700 20px ${family}`)]);
  await Promise.all(loads).catch(() => {});
  await document.fonts.ready;
}

export function applyThemeColors(materials: Materials, scene: Scene) {
  materials.steel.color.setStyle(cssVar("--steel"));
  materials.steelMatte.color.setStyle(cssVar("--steel-lo"));
  materials.chrome.color.setStyle(cssVar("--frame"));
  materials.holder.color.setStyle(cssVar("--frame"));
  materials.manila.color.setStyle(cssVar("--manila"));
  // La sala de noche: the lamp stays on, the room around it goes dim.
  scene.environmentIntensity = isDark() ? 0.35 : 0.6;
}

/**
 * Draws every Rótulo, tab and cover. Covers finish later (their Motivo loads as an image):
 * `onCoverDrawn` runs for each one when it's ready.
 */
export function paintTextures(cajones: CajonMesh[], cajonesData: CajonData[], onCoverDrawn: (cover: CanvasTex) => void) {
  cajones.forEach((cajon, i) => {
    const data = cajonesData[i];
    if (data) drawRotulo(cajon.rotulo.canvas, data);
    cajon.rotulo.texture.needsUpdate = true;
  });
  for (const carpeta of cajones.flatMap((c) => c.carpetas)) {
    drawTab(carpeta.tab.canvas, carpeta.data);
    carpeta.tab.texture.needsUpdate = true;
    drawCover(carpeta.cover.canvas, carpeta.data, () => onCoverDrawn(carpeta.cover));
  }
}
