import { PlaneGeometry } from "three";
import { CARPETA, DRAWER, DRAWER_FRONT, HANDLE, LABEL, ROUNDING, TRAY } from "./measures";
import { roundedBox } from "./parts";

/**
 * The shapes every drawer and every Carpeta repeat, created once and shared by all of them, like the materials:
 * the GPU then keeps one copy of each, not one per drawer or per Carpeta.
 */
export function createGeometries() {
  const trayWallHeight = TRAY.rimY - TRAY.floorY;
  const { width: boardWidth, boardThickness } = CARPETA;
  return {
    drawerFront: roundedBox(DRAWER_FRONT.width, DRAWER.height, DRAWER_FRONT.thickness, ROUNDING.front),
    handle: roundedBox(HANDLE.width, HANDLE.height, HANDLE.depth, ROUNDING.handle),
    trayFloor: roundedBox(TRAY.width, TRAY.floorThickness, TRAY.depth, ROUNDING.sheet),
    traySide: roundedBox(TRAY.wallThickness, trayWallHeight, TRAY.depth, ROUNDING.sheet),
    trayBack: roundedBox(TRAY.width, trayWallHeight, TRAY.wallThickness, ROUNDING.sheet),
    labelHolder: roundedBox(LABEL.width + 2 * LABEL.holderBorder, LABEL.height + 2 * LABEL.holderBorder, LABEL.holderDepth, ROUNDING.sheet),
    label: new PlaneGeometry(LABEL.width, LABEL.height),

    carpetaBoard: roundedBox(boardWidth, CARPETA.height, boardThickness, ROUNDING.board),
    carpetaTab: roundedBox(CARPETA.tab.width, CARPETA.tab.height, boardThickness, ROUNDING.board),
    tabLabel: new PlaneGeometry(CARPETA.tabLabel.width, CARPETA.tabLabel.height),
    sheet: new PlaneGeometry(CARPETA.sheetWidth, CARPETA.sheetHeight),
    carpetaFlap: roundedBox(boardWidth, CARPETA.flapHeight, boardThickness, ROUNDING.board),
  };
}

export type Geometries = ReturnType<typeof createGeometries>;
