/** What the Sala is showing right now. Drawer and Carpeta indices are -1 for none. */
export interface SalaState {
  /** The drawer clicked open. */
  open: number;
  /** The drawer under the pointer, or whose DOM link has focus. */
  hover: number;
  /** The open drawer's Carpeta under the pointer. */
  carpeta: number;
  /** The DOM element the scene is drawn into: the Archivador's place on the Sala page. Null while detached. */
  slot: HTMLElement | null;
  /** The tall element whose scroll walks the camera down the drawers. */
  track: HTMLElement | null;
  /** Jump the camera to its target on the next frame instead of easing (just attached: nothing to ease from). */
  snapCamera: boolean;
}

export function createState(): SalaState {
  return { open: -1, hover: -1, carpeta: -1, slot: null, track: null, snapCamera: false };
}
