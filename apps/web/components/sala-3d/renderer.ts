import { ACESFilmicToneMapping, PCFShadowMap, WebGLRenderer } from "three";

/** A WebGL renderer on `canvas`: transparent around the cabinet, with soft shadows. */
export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // sharper than 2× costs a lot and shows little
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.setClearColor(0, 0); // transparent: the page shows through
  renderer.autoClear = false; // scene.ts clears by hand, then draws only inside the slot
  return renderer;
}
