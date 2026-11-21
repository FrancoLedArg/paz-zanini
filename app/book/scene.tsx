import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, invalidate, useFrame, useThree } from "@react-three/fiber";
import {
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  createContext,
  memo,
  Suspense,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavigationType, useNavigationType } from "react-router";
import {
  type BufferGeometry,
  type Fog,
  type Group,
  type Material,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  ShaderMaterial,
  Texture,
  Vector2,
  type WebGLRenderer,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import { type ColeccionId, type Manual, manualesIn } from "../catalog/catalog";
import {
  bookThickness,
  CASE_HEIGHT,
  type WrapLayout,
  caseGeometry,
  footprint,
  pageBlockGeometry,
} from "./geometry";
import {
  wrapTexture,
  environmentTexture,
  getMicroDetail,
  inItsOwnFrame,
  type MicroDetail,
  PHONE,
} from "./textures";
import { reportProgress } from "../shared/progress";
import { reducedMotion } from "../shared/motion";
import {
  attachScene,
  booksMounted,
  arrive,
  changingTo,
  fogClosed,
  park,
  reset,
  stepMovement,
  takeSnap,
  TRAVEL,
} from "../shared/movement";
import { stepInView } from "../shared/track";
import { oklchFromCss } from "../tapa/tapa";

// The 3D stage, the book, and the two scenes built from it: one turnable book and the Hélice.

RectAreaLightUniformsLib.init();

const TIERS = [1, 0.85, 0.7, 0.55];
const PIXEL_BUDGET = PHONE ? 2.6e6 : 4e6;
const FOV = 30;
const HALF_FOV_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** A24's tuning: quick, with a little overshoot, for a book the visitor turns by hand. */
const A24 = { stiffness: 90, damping: 12 };
/** Softer and nearly critically damped, for the Hélice's focus following the slower scroll (book-3d Tuned values). */
const FOCUS_SPRING = { stiffness: 50, damping: 13 };

/** A damped spring. Returns whether it is still moving. */
function spring(state: Spring, target: number, dt: number, tuning: typeof A24) {
  state.v +=
    (tuning.stiffness * (target - state.x) - tuning.damping * state.v) * dt;
  state.x += state.v * dt;
  return Math.abs(target - state.x) > 1e-4 || Math.abs(state.v) > 1e-4;
}

let webgl2: boolean | undefined;

/** Probed once per session. */
function supportsWebGL2() {
  if (webgl2 === undefined) {
    // The home page's first-visit script probes the same way (app/loader/loader.tsx): keep them alike.
    const probe = document.createElement("canvas").getContext("webgl2");
    // Browsers cap live contexts, so the probe gives its own back at once.
    probe?.getExtension("WEBGL_lose_context")?.loseContext();
    webgl2 = probe !== null;
  }
  return webgl2;
}

/** True once the canvas has finished fading in over whatever stood in for it. */
const Shown = createContext(false);

interface StageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** A pose is set: time stands still, so adaptive resolution stays off and the reveal is instant. */
  frozen: boolean;
  /** Shown instead of the canvas when 3D can't run: no WebGL2, a lost context, or a shader that fails to compile. */
  fallback: ReactNode;
}

/** The canvas, revealed once its shaders are compiled, or the fallback when 3D fails (book-3d Fallback). */
export function Stage({
  children,
  frozen,
  fallback,
  className = "",
  ...props
}: StageProps) {
  const [failed, setFailed] = useState(() => !supportsWebGL2());
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  const onReady = useCallback(() => {
    setReady(true);
    // Without a fade (a frozen pose, reduced motion) there is no transitionend to wait for.
    if (frozen || reducedMotion()) setShown(true);
  }, [frozen]);
  const [tier, setTier] = useState(0);
  const [baseDpr] = useState(() =>
    Math.min(
      devicePixelRatio,
      PHONE ? 1.5 : 2,
      Math.sqrt(PIXEL_BUDGET / (innerWidth * innerHeight)),
    ),
  );
  if (failed) return fallback;
  return (
    <div
      aria-busy={!shown}
      // Until it has faded in, taps reach whatever stands in for it.
      className={`${className} ${frozen ? "" : "motion-safe:transition-opacity motion-safe:duration-700"} ${ready ? "opacity-100" : "opacity-0"} ${shown ? "" : "pointer-events-none"}`}
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget) setShown(true);
      }}
      {...props}
    >
      <Canvas
        // R3F sets its own pointer-events inline; inherit the stage's instead.
        style={{ pointerEvents: "inherit" }}
        frameloop="demand"
        dpr={baseDpr * (TIERS[tier] ?? 1)}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        camera={{ fov: FOV, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          // Neutral, not A24's ACES: ACES greys the Tapa's cream type and shifts its colours (book-3d Tuned values).
          gl.toneMapping = NeutralToneMapping;
          // At 1 the cover's cream rendered 179 against the flat Tapa's 248, so covers read grey; 1.7 washes the band (#77).
          gl.toneMappingExposure = 1.4;
          gl.domElement.addEventListener("webglcontextlost", () => {
            setFailed(true);
          });
          gl.debug.onShaderError = (context, program) => {
            console.error(context.getProgramInfoLog(program));
            setFailed(true);
          };
        }}
      >
        {!frozen && (
          <PerformanceMonitor
            onDecline={() => {
              setTier((t) => Math.min(t + 1, TIERS.length - 1));
            }}
            onIncline={() => {
              setTier((t) => Math.max(t - 1, 0));
            }}
          />
        )}
        <Studio />
        <Suspense fallback={null}>
          <Shown value={shown}>{children}</Shown>
          <Reveal onReady={onReady} />
        </Suspense>
      </Canvas>
    </div>
  );
}

/** Procedural environment for the laminate to reflect, plus A24's light rig. */
function Studio() {
  // three turns an equirect `scene.environment` into a PMREM itself, and frees it with the texture.
  const environment = useMemo(() => environmentTexture(), []);
  useEffect(
    () => () => {
      environment.dispose();
    },
    [environment],
  );
  return (
    <>
      <primitive object={environment} attach="environment" />
      {/* Sky and floor fill instead of a flat ambient, so the page edges stay paper-white. */}
      <hemisphereLight args={["#ffffff", "#b8b2a6", 0.6]} />
      <directionalLight position={[-3, 4, 5]} color="#fff9e8" intensity={0.4} />
      <directionalLight position={[4, 1, 3]} intensity={0.3} />
      <directionalLight
        position={[2, 3, -5]}
        color="#499ff5"
        intensity={0.75}
      />
      <rectAreaLight
        args={["#ffffff", 1.9, 6, 0.4]}
        position={[0, 6, 2]}
        onUpdate={(light) => {
          light.lookAt(0, 0, 0);
        }}
      />
    </>
  );
}

/** Compiles every shader before the canvas is revealed, so nothing pops in. */
interface RevealProps {
  onReady: () => void;
}

function Reveal({ onReady }: RevealProps) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  useEffect(() => {
    let cancelled = false;
    void gl.compileAsync(scene, camera).then(() => {
      invalidate();
      // Two frames: the first rendered frame is on screen before the reveal.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (cancelled) return;
          reportProgress(1);
          onReady();
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, onReady]);
  return null;
}

// Geometry is built once per distinct thickness and kept for the session; a cover wrap lives as long as its book.
const cases = new Map<
  number,
  { geometry: BufferGeometry; layout: WrapLayout; pages: BufferGeometry }
>();
const wraps = new Map<string, Promise<Texture>>();
// Covers asked for and drawn, for the first-visit count (app/shared/progress.ts).
let wrapsAsked = 0;
let wrapsDrawn = 0;

function bookParts(thickness: number) {
  let parts = cases.get(thickness);
  if (!parts) {
    parts = { ...caseGeometry(thickness), pages: pageBlockGeometry(thickness) };
    cases.set(thickness, parts);
  }
  return parts;
}

// Phones sample several maps per pixel; 4× anisotropy keeps grazing angles sharp for less bandwidth.
const anisotropyOf = (gl: WebGLRenderer) =>
  Math.min(gl.capabilities.getMaxAnisotropy(), PHONE ? 4 : 16);

const wrapKey = (manual: Manual, pxPerUnit: number) =>
  `${manual.slug}@${pxPerUnit}`;

function wrap(
  manual: Manual,
  layout: WrapLayout,
  pxPerUnit: number,
  gl: WebGLRenderer,
) {
  const key = wrapKey(manual, pxPerUnit);
  let texture = wraps.get(key);
  if (!texture) {
    // Uploaded in a frame of its own too, so the frame that first shows it doesn't (#82); not if freed meanwhile.
    const cover = wrapTexture(manual, layout, pxPerUnit, anisotropyOf(gl)).then(
      (drawn) =>
        inItsOwnFrame(() => {
          if (wraps.get(key) === cover) gl.initTexture(drawn);
          return drawn;
        }),
    );
    texture = cover;
    wraps.set(key, texture);
    wrapsAsked++;
    // Drawing the covers is most of the work before the first frame; compiling the shaders is the rest (Reveal). A
    // failed cover is the book's own error to raise, not this counter's.
    const settled: Promise<Texture> & { status?: string; value?: Texture } =
      texture;
    texture.then(
      (value) => {
        // Marked as React marks a promise it has read, so `use` takes a drawn cover at once instead of suspending for
        // a retry that React throttles by 300 ms: that pause would show at a Colección change's swap.
        // shortcut: relies on React's thenable fields (status, value), stable since 19; recheck on a React major.
        settled.status = "fulfilled";
        settled.value = value;
        wrapsDrawn++;
        reportProgress(0.9 * (wrapsDrawn / wrapsAsked));
      },
      () => undefined,
    );
  }
  return texture;
}

// A book's materials outlive it, kept for the next book: disposing every one at a Colección change frees the shader, and
// the next set relinks it (6–14 ms, #82). A set holds no per-book state but its cover, which a spare lets go of.
// shortcut: spares are never disposed, at most one set per book ever mounted at once (18 across a swap); free them with
// the scene if a page other than the Hélice ever mounts many books.
const spareMaterials = new Set<MeshPhysicalMaterial[]>();
// Not null: a map present or absent compiles a different shader.
const NO_COVER = new Texture();

/** Takes a set out of the spares, carrying `map` as its cover. */
function lend(materials: MeshPhysicalMaterial[], map: Texture) {
  spareMaterials.delete(materials);
  for (const material of materials) material.map = map;
  return materials;
}

function bookMaterials(map: Texture, detail: MicroDetail) {
  const spare = spareMaterials.values().next().value;
  if (spare) return lend(spare, map);
  const wrapMaterial = new MeshPhysicalMaterial({
    map,
    roughness: 0.6,
    roughnessMap: detail.grain,
    normalMap: detail.tooth,
    normalScale: new Vector2(0.15, 0.15),
    clearcoat: 0.75,
    clearcoatRoughness: 0.2,
    clearcoatNormalMap: detail.laminate,
    clearcoatNormalScale: new Vector2(0.15, 0.15),
  });
  // A24's rim: glossier than the face and reflecting the studio harder, so every board edge catches a thin line of light.
  const rimMaterial = wrapMaterial.clone();
  rimMaterial.roughness = 0.35;
  rimMaterial.clearcoat = 1;
  rimMaterial.clearcoatRoughness = 0.05;
  rimMaterial.envMapIntensity = 2;
  // Case geometry groups: 0 the faces, 1 the board edges.
  return [wrapMaterial, rimMaterial];
}

let pageMaterials: Material[] | undefined;

/** The page block's materials, the same for every book: built once per session. */
function getPageMaterials(detail: MicroDetail): Material[] {
  if (pageMaterials) return pageMaterials;
  // The page tone is a design token; three parses the hex it holds.
  const leaf = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-leaf")
    .trim();
  const edge = (color: Texture, normal: Texture) =>
    new MeshPhysicalMaterial({
      color: leaf,
      map: color,
      normalMap: normal,
      normalScale: new Vector2(0.6, 0.6),
      roughness: 0.8,
    });
  const headTail = edge(detail.pageColorAcross, detail.pageNormalAcross);
  // The spine side and the faces under the boards are never seen: skipped, not drawn.
  const hidden = new MeshBasicMaterial({ visible: false });
  // Box face order: +x fore-edge, -x spine side, +y head, -y tail, +z, -z.
  pageMaterials = [
    edge(detail.pageColor, detail.pageNormal),
    hidden,
    headTail,
    headTail,
    hidden,
    hidden,
  ];
  return pageMaterials;
}

interface BookProps {
  manual: Manual;
  /** Cover-art resolution; the Lomo needs at least 2× its on-screen size. */
  pxPerUnit: number;
}

/** One hardcover, centred on its footprint, in book space (spine at -x, front cover at +z). */
function Book({ manual, pxPerUnit }: BookProps) {
  const gl = useThree((state) => state.gl);
  const anisotropy = anisotropyOf(gl);
  const thickness = bookThickness(manual);
  const { geometry, layout, pages } = bookParts(thickness);
  const key = wrapKey(manual, pxPerUnit);
  const map = use(wrap(manual, layout, pxPerUnit, gl));
  // Taken once per mount: parents key a Book by its Manual, so a new Manual remounts it.
  const [materials] = useState(() =>
    bookMaterials(map, getMicroDetail(anisotropy)),
  );
  useEffect(() => {
    // Lent again even when already its own: the book can outlive a cleanup (StrictMode runs one in development).
    lend(materials, map);
    return () => {
      for (const material of materials) material.map = NO_COVER;
      spareMaterials.add(materials);
      // The cover wrap is the one per-Manual texture: freed with its book, so switching Manuales doesn't pile up GPU memory.
      map.dispose();
      wraps.delete(key);
    };
  }, [materials, map, key]);
  return (
    <group position-x={-footprint(thickness).centerX}>
      <mesh geometry={geometry} material={materials} dispose={null} />
      <mesh
        geometry={pages}
        material={getPageMaterials(getMicroDetail(anisotropy))}
        dispose={null}
      />
    </group>
  );
}

interface ContactShadowProps {
  width: number;
  depth: number;
}

const SHADOW_REACH = 0.6;

/**
 * A soft shadow on the plane below, drawn analytically from the footprint: a tight contact core plus a wide falloff.
 * Rendered with the scene, but it costs one quad, so it needs no separate static pass.
 */
function ContactShadow({ width, depth }: ContactShadowProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uHalf: { value: new Vector2(width / 2, depth / 2) },
          uContact: { value: 0.6 },
          uAmbient: { value: 0.28 },
          uSoft: { value: 0.09 },
        },
        vertexShader: /* glsl */ `
        varying vec2 vPos;
        void main() {
          vPos = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
        fragmentShader: /* glsl */ `
        uniform vec2 uHalf;
        uniform float uContact, uAmbient, uSoft;
        varying vec2 vPos;
        void main() {
          vec2 q = abs(vPos) - uHalf;
          float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
          float contact = uContact * (1.0 - smoothstep(-0.01, 0.03, d));
          float ambient = uAmbient * exp(-max(d, 0.0) / uSoft) * (1.0 - smoothstep(${SHADOW_REACH * 0.6}, ${SHADOW_REACH}, d));
          gl_FragColor = vec4(0.07, 0.06, 0.05, max(contact, ambient));
        }`,
      }),
    [width, depth],
  );
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.0015} material={material}>
      <planeGeometry
        args={[width + 2 * SHADOW_REACH, depth + 2 * SHADOW_REACH]}
      />
    </mesh>
  );
}

// ---- The turnable book ----

export const BOOK_POSES = {
  front: { yaw: 0, elevation: 0.1 },
  "three-quarter": { yaw: 0.65, elevation: 0.18 },
  spine: { yaw: Math.PI / 2, elevation: 0.1 },
  top: { yaw: 0.5, elevation: 1 },
  "fore-edge": { yaw: -Math.PI / 2, elevation: 0.1 },
  back: { yaw: Math.PI, elevation: 0.1 },
  grazing: { yaw: -1.35, elevation: 0.1 },
} as const;
export type BookPose = keyof typeof BOOK_POSES;
const HERO = { yaw: 0.42, elevation: 0.14 };

export interface PointerInput {
  dragging: boolean;
  /** Pointer x where the drag began, and where it is now. */
  startX: number;
  dragX: number;
  /** Pointer position over the canvas, -1..1, for the hover tilt. */
  hoverX: number;
  hoverY: number;
}

interface Spring {
  x: number;
  v: number;
}

interface Turn {
  yaw: Spring;
  hoverYaw: Spring;
  hoverPitch: Spring;
  /** The turn a drag started from; null while no drag is under way. */
  dragFrom: number | null;
}

interface TurnableBookProps {
  manual: Manual;
  pose: BookPose | undefined;
  input: RefObject<PointerInput>;
  /** Reduced motion: the book rests at its hero pose. */
  still: boolean;
}

export function TurnableBook({
  manual,
  pose,
  input,
  still,
}: TurnableBookProps) {
  const group = useRef<Group>(null);
  const springs = useRef<Turn>({
    // It enters facing the visitor, lined up with the flat Tapa it fades in over, then turns to its hero pose.
    yaw: { x: still ? HERO.yaw : 0, v: 0 },
    hoverYaw: { x: 0, v: 0 },
    hoverPitch: { x: 0, v: 0 },
    dragFrom: null,
  });
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);
  const thickness = bookThickness(manual);
  const elevation = pose ? BOOK_POSES[pose].elevation : HERO.elevation;
  // It turns to its hero pose only once the fade is over, so the dissolve never shows two books.
  const shown = use(Shown);
  useEffect(() => {
    invalidate();
  }, [shown]);
  // The idle sway, desktop only and the one continuous animation, pauses while the book is off-screen (book-3d Performance).
  const swaying = !still && !PHONE;
  const canvas = useThree((state) => state.gl.domElement);
  const onScreen = useRef(true);
  useEffect(() => {
    if (!swaying) return;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry?.isIntersecting ?? true;
      if (onScreen.current) invalidate();
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [canvas, swaying]);

  useLayoutEffect(() => {
    // Fit the book's height and its turning width into the frame.
    const fit = Math.max(CASE_HEIGHT / 0.7, 2.5 / (0.8 * aspect)) / 2;
    const distance = fit / HALF_FOV_TAN;
    const targetY = CASE_HEIGHT * 0.48;
    camera.position.set(
      0,
      targetY + distance * Math.sin(elevation),
      distance * Math.cos(elevation),
    );
    camera.lookAt(0, targetY, 0);
    invalidate();
  }, [camera, aspect, elevation]);

  useFrame((state, delta) => {
    const book = group.current;
    if (!book) return;
    if (pose) return; // the JSX rotation already holds the pose
    const s = springs.current;
    const i = input.current;
    const dt = Math.min(delta, 1 / 30);
    // Released, it settles on the nearest whole turn of its rest pose.
    const turns = Math.round((s.yaw.x - HERO.yaw) / (2 * Math.PI));
    s.dragFrom = i.dragging ? (s.dragFrom ?? s.yaw.x) : null;
    const rest = shown || still ? HERO.yaw : 0;
    const yawTarget =
      s.dragFrom === null
        ? rest + turns * 2 * Math.PI
        : s.dragFrom + (i.dragX - i.startX) * 0.01;
    let moving = spring(s.yaw, yawTarget, dt, A24);
    moving = spring(s.hoverYaw, i.hoverX * 0.2, dt, A24) || moving;
    moving = spring(s.hoverPitch, i.hoverY * 0.08, dt, A24) || moving;
    const sway = swaying ? 0.06 * Math.sin(state.clock.elapsedTime * 0.6) : 0;
    book.rotation.set(s.hoverPitch.x, s.yaw.x + s.hoverYaw.x + sway, 0);
    if (moving || (swaying && onScreen.current)) invalidate();
  });

  const { width, depth } = footprint(thickness);
  return (
    <group ref={group} rotation-y={pose ? BOOK_POSES[pose].yaw : HERO.yaw}>
      <ContactShadow width={width} depth={depth} />
      <group position-y={CASE_HEIGHT / 2}>
        <Book key={manual.slug} manual={manual} pxPerUnit={PHONE ? 676 : 800} />
      </group>
    </group>
  );
}

// ---- The Hélice ----

/** The focus each pose freezes, in steps, from the index of the Colección's last book. */
export const HELICE_POSES = {
  "helice-top": () => 0,
  // Halfway between the two middle books, to judge the movement mid-turn.
  "helice-middle": (last: number) => Math.floor(last / 2) + 0.5,
  "helice-bottom": (last: number) => last,
};
export type HelicePose = keyof typeof HELICE_POSES;
const TURN = 0.78; // radians round the axis from one book to the next
const RADIUS = 4.6;
const RISE = 1.7; // world units down from one book to the next
// Cover-art resolution in the Hélice (the prewarm must ask for the same, or it misses the cover cache).
const HELICE_PX = PHONE ? 420 : 676;
const CAMERA_Y = 1.4;

/**
 * Places a book `d` steps from the focus (positive: still to come) on the helix, its cover facing out from the axis.
 * The entrance and exit move the whole helix by `o` (+1 gone up, -1 waiting below), turning it as a scroll would.
 */
function placeOnHelix(book: Group, d: number, o: number) {
  const angle = d * TURN - o * 1.3;
  book.position.set(
    RADIUS * Math.sin(angle),
    -d * RISE + o * TRAVEL,
    RADIUS * (Math.cos(angle) - 1),
  );
  book.rotation.set(0, angle, 0);
  // A fully dissolved book isn't drawn, so none lingers as a faint patch on the paper.
  book.visible = fogClosed(o) < 0.98;
}

/**
 * Where the flat track shows a Tapa within its step, read from the first step: the 3D book in focus takes that size and
 * that offset from the screen's centre, so it lines up with its link and the CSS stays the one source of the framing.
 */
function tapaFrame(track: HTMLElement) {
  const step = track.children[0];
  const tapa = step?.querySelector("a > span")?.getBoundingClientRect();
  const box = step?.getBoundingClientRect();
  if (!tapa || !box) return null;
  return {
    height: tapa.height,
    x: tapa.left + tapa.width / 2 - (box.left + box.width / 2),
    y: tapa.top + tapa.height / 2 - (box.top + box.height / 2),
  };
}

/** The paper token, as a colour three parses (three can't read oklch). */
const paperColor = () =>
  oklchFromCss(
    getComputedStyle(document.documentElement).getPropertyValue(
      "--color-paper",
    ),
  );

interface HeliceSceneProps {
  /** The flat track: one step per Manual, in catalog order. The step in view is the book in focus. */
  track: RefObject<HTMLElement | null>;
  /** The Colección on the track, so the scene holds the same books. */
  coleccion: ColeccionId;
  pose: HelicePose | undefined;
  /** A tap or click on a book; `newTab` when a modifier key or the middle button asks for one, as on a link. */
  onOpen: (manual: Manual, newTab: boolean) => void;
}

/**
 * Every Manual floating along a helix. Scroll position alone drives it (ADR 0003): each book is placed by its distance
 * from the step in view, so it comes round from behind, faces the visitor in focus, and swings away up the spiral.
 */
export function HeliceScene({
  track,
  coleccion,
  pose,
  onOpen,
}: HeliceSceneProps) {
  // The same books as the flat track, in the same order, so step i is book i.
  const manuales = useMemo(() => manualesIn(coleccion), [coleccion]);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const posed =
    pose === undefined ? undefined : HELICE_POSES[pose](manuales.length - 1);
  const books = useRef<(Group | null)[]>([]);
  const focus = useRef<Spring | null>(null);
  // The entrance and exit's offset, as last drawn.
  const offset = useRef(0);
  // Placed as it mounts, so a book never shows, or takes a tap, where it doesn't belong.
  const register = useCallback((index: number, book: Group | null) => {
    books.current[index] = book;
    if (book) booksMounted();
    if (book && focus.current) {
      placeOnHelix(book, index - focus.current.x, offset.current);
      invalidate();
    }
  }, []);
  const fog = useRef<Fog>(null);
  const [fogColor] = useState(paperColor);
  // A new Colección swaps the books in place: books in both sets keep their covers, and the focus jumps to the new step
  // in view instead of turning across the old Colección.
  const shownColeccion = useRef(coleccion);
  const shown = use(Shown);
  const gl = useThree((state) => state.gl);
  // On a first visit the books wait, dissolved, under the cover, and arrive as it lifts (the cover lifts once shown).
  const [firstVisit] = useState(
    () => "loader" in document.documentElement.dataset && posed === undefined,
  );
  useLayoutEffect(() => {
    if (!firstVisit) return;
    park();
    // Gone before it was shown (a Manual opened under a slow cover, a lost context): leave nothing parked.
    return reset;
  }, [firstVisit]);
  const lastColeccion = useRef(coleccion);
  const navigationType = useNavigationType();
  useEffect(() => {
    if (!shown || posed !== undefined) return;
    const detach = attachScene({
      coleccion: () => lastColeccion.current,
      wake: invalidate,
      // A change waits for these before it moves, so the swap finds every cover on the GPU.
      prewarm: async (id) => {
        for (const manual of manualesIn(id)) {
          await wrap(
            manual,
            bookParts(bookThickness(manual)).layout,
            HELICE_PX,
            gl,
          ).catch(() => undefined);
          // A change picked over this one (or dropped) stops it, so its covers don't hold up the next change's.
          if (changingTo() !== id) return;
        }
      },
    });
    if (firstVisit) void arrive();
    return detach;
  }, [shown, posed, gl, firstVisit]);
  useLayoutEffect(() => {
    if (lastColeccion.current === coleccion) return;
    lastColeccion.current = coleccion;
    // Back, Forward, or a plain link (the Índice, the Autor's name): the books arrive, without an exit first. A page a
    // change asked for while a newer change builds is neither, and leaves that change to go on.
    if (
      shown &&
      posed === undefined &&
      (navigationType === NavigationType.Pop || changingTo() === null)
    )
      void arrive();
    // Draw the new set.
    invalidate();
  }, [coleccion, shown, posed, navigationType]);

  useEffect(() => {
    const onScroll = () => {
      invalidate();
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      document.body.style.cursor = "";
    };
  }, []);

  useFrame((_, delta) => {
    const target = posed ?? (track.current ? stepInView(track.current) : 0);
    let moving = false;
    if (
      posed !== undefined ||
      !focus.current ||
      shownColeccion.current !== coleccion ||
      takeSnap()
    ) {
      focus.current = { x: target, v: 0 };
      shownColeccion.current = coleccion;
    } else
      moving = spring(
        focus.current,
        target,
        Math.min(delta, 1 / 30),
        FOCUS_SPRING,
      );
    const f = focus.current.x;

    // Aimed at the book in focus, at its flat Tapa's size, and shifted to where the track shows that Tapa.
    const frame = track.current && tapaFrame(track.current);
    const share = (frame?.height ?? 0.56 * size.height) / size.height;
    const distance = CASE_HEIGHT / (share * 2 * HALF_FOV_TAN);
    camera.position.set(0, CAMERA_Y, distance);
    camera.lookAt(0, 0, 0);
    if ("setViewOffset" in camera) {
      camera.setViewOffset(
        size.width,
        size.height,
        -(frame?.x ?? 0),
        -(frame?.y ?? 0),
        size.width,
        size.height,
      );
    }
    const movement = stepMovement(Math.min(delta, 1 / 30));
    offset.current = movement.o;
    if (movement.moving) moving = true;
    // The far books fade into the paper, from 3 to 13 units beyond the book in focus. The fog closes in as the helix
    // leaves (near by 9, far by 16), so the swap happens with every book the paper's colour.
    if (fog.current) {
      const closed = fogClosed(movement.o);
      fog.current.near = distance + 3 - 9 * closed;
      fog.current.far = distance + 13 - 16 * closed;
    }

    for (let i = 0; i < manuales.length; i++) {
      const book = books.current[i];
      if (book) placeOnHelix(book, i - f, movement.o);
    }
    if (moving) invalidate();
  });

  return (
    <>
      <fog ref={fog} attach="fog" args={[fogColor]} />
      {/* Every book of the Colección: a book that mounts mid-movement drops a frame, so a scroll only asks for one (#92).
          shortcut: holds while a Colección stays small (9 at most today); bring back a window round the focus if one
          grows past about 13. */}
      {manuales.map((manual, i) => (
        <HeliceBook
          key={manual.slug}
          manual={manual}
          index={i}
          register={register}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}

interface HeliceBookProps {
  manual: Manual;
  index: number;
  /** Hands the scene this book's group to place, or null once unmounted. */
  register: (index: number, book: Group | null) => void;
  onOpen: (manual: Manual, newTab: boolean) => void;
}

/** One book of the Hélice. Memoised: a scene re-render (a new Colección) leaves the books it keeps as they are. */
const HeliceBook = memo(function HeliceBook({
  manual,
  index,
  register,
  onOpen,
}: HeliceBookProps) {
  return (
    <group
      ref={(node) => {
        register(index, node);
      }}
      onClick={(event) => {
        event.stopPropagation();
        const { metaKey, ctrlKey, shiftKey } = event.nativeEvent;
        onOpen(manual, metaKey || ctrlKey || shiftKey);
      }}
      // A middle click opens a new tab, as it would on a link.
      onPointerUp={(event) => {
        if (event.button !== 1) return;
        event.stopPropagation();
        onOpen(manual, true);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Book manual={manual} pxPerUnit={HELICE_PX} />
    </group>
  );
});
