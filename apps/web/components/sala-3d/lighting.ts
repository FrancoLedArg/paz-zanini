import { DirectionalLight, PMREMGenerator, type WebGLRenderer } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Soft light from every side, baked from a generic room, so the steel has something to reflect. */
export function createEnvironment(renderer: WebGLRenderer) {
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  // Only the baked texture is kept: the room's meshes and the generator's buffers can go.
  room.dispose();
  pmrem.dispose();
  return texture;
}

/** The lamp: one warm light, upper left, its soft shadow map framed on the Archivador. Add it with its target. */
export function createLamp() {
  const lamp = new DirectionalLight(0xffdcb0, 2.6);
  lamp.position.set(-1.2, 3.4, 2.6);
  lamp.target.position.set(0, 0.6, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.radius = 6;
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.01;
  // The shadow only needs to cover the cabinet and the floor around it: the tighter, the sharper.
  Object.assign(lamp.shadow.camera, { left: -1, right: 1, top: 1.2, bottom: -1.2, near: 0.5, far: 7 });
  return lamp;
}
