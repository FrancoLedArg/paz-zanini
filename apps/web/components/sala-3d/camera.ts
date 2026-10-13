import { MathUtils, PerspectiveCamera, Vector3 } from "three";

// Three-quarters from above and the right; steeper over an open drawer, to see into it.
const VIEW_DIR = new Vector3(0.62, 0.5, 1).normalize();
const VIEW_DIR_OPEN = new Vector3(0.4, 1.1, 1).normalize();
/** Reused on every frame, rather than creating a new vector each time. */
const direction = new Vector3();

export function createCamera() {
  return new PerspectiveCamera(30, 1, 0.1, 20);
}

/**
 * Places `camera` for a `width` × `height` px view: aimed at `target`, back far enough to frame the cabinet,
 * leaning over an open drawer as `tilt` goes from 0 to 1.
 */
export function placeCamera(camera: PerspectiveCamera, target: Vector3, tilt: number, width: number, height: number) {
  const aspect = width / height;
  // Three quarters of a meter of cabinet top to bottom; on a narrow screen, at least 0.8 m across.
  const span = Math.max(0.75, 0.8 / aspect);
  const distance = span / 2 / Math.tan(MathUtils.degToRad(camera.fov / 2));
  direction.copy(VIEW_DIR).lerp(VIEW_DIR_OPEN, tilt).normalize();
  camera.position.copy(target).addScaledVector(direction, distance);
  camera.lookAt(target);

  // Shift the picture: wide, right of center (the text is top left); narrow, centered and below the text.
  // setViewOffset also sets the camera's aspect and updates its projection.
  if (aspect > 1) {
    camera.setViewOffset(width, height, -width * 0.22, 0, width, height);
  } else {
    camera.setViewOffset(width, height, 0, -height * 0.2, width, height);
  }
}
