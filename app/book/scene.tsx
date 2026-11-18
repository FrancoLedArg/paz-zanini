import { PerformanceMonitor } from "@react-three/drei";
import {
  Canvas,
  events,
  invalidate,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  createContext,
  memo,
  Suspense,
  startTransition,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BufferGeometry,
  type Group,
  type Material,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  type Object3D,
  ShaderMaterial,
  type Texture,
  Vector2,
} from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import { type Manual, MANUALES } from "../catalog/catalog";
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
  type MicroDetail,
  PHONE,
} from "./textures";

// The 3D stage, the book, and the two scenes built from it: one turnable book and the Hélice.

RectAreaLightUniformsLib.init();

const TIERS = [1, 0.85, 0.7, 0.55];
const PIXEL_BUDGET = PHONE ? 2.6e6 : 4e6;
const FOV = 30;
const HALF_FOV_TAN = Math.tan(((FOV / 2) * Math.PI) / 180);

/** A damped spring, A24's tuning (frequency 9.5, damping 12). Returns whether it is still moving. */
function spring(state: Spring, target: number, dt: number) {
  state.v += (90 * (target - state.x) - 12 * state.v) * dt;
  state.x += state.v * dt;
  return Math.abs(target - state.x) > 1e-4 || Math.abs(state.v) > 1e-4;
}

let webgl2: boolean | undefined;

/** Probed once per session. */
function supportsWebGL2() {
  if (webgl2 === undefined) {
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
    if (frozen || matchMedia("(prefers-reduced-motion: reduce)").matches)
      setShown(true);
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
        // three's raycaster also hits hidden objects; a book not yet placed must not take a tap.
        events={(store) => ({
          ...events(store),
          filter: (hits) => hits.filter(({ object }) => shownChain(object)),
        })}
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
          gl.toneMappingExposure = 1;
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

function shownChain(object: Object3D | null): boolean {
  for (let node = object; node; node = node.parent)
    if (!node.visible) return false;
  return true;
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
          if (!cancelled) onReady();
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

function bookParts(thickness: number) {
  let parts = cases.get(thickness);
  if (!parts) {
    parts = { ...caseGeometry(thickness), pages: pageBlockGeometry(thickness) };
    cases.set(thickness, parts);
  }
  return parts;
}

const wrapKey = (manual: Manual, pxPerUnit: number) =>
  `${manual.slug}@${pxPerUnit}`;

function wrap(
  manual: Manual,
  layout: WrapLayout,
  pxPerUnit: number,
  anisotropy: number,
) {
  const key = wrapKey(manual, pxPerUnit);
  let texture = wraps.get(key);
  if (!texture) {
    texture = wrapTexture(manual, layout, pxPerUnit, anisotropy);
    wraps.set(key, texture);
  }
  return texture;
}

function bookMaterials(map: Texture, detail: MicroDetail) {
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
  // Phones sample several maps per pixel; 4× anisotropy keeps grazing angles sharp for less bandwidth.
  const anisotropy = Math.min(
    gl.capabilities.getMaxAnisotropy(),
    PHONE ? 4 : 16,
  );
  const thickness = bookThickness(manual);
  const { geometry, layout, pages } = bookParts(thickness);
  const key = wrapKey(manual, pxPerUnit);
  const map = use(wrap(manual, layout, pxPerUnit, anisotropy));
  // Built once per mount: parents key a Book by its Manual, so a new Manual remounts it.
  const [materials] = useState(() =>
    bookMaterials(map, getMicroDetail(anisotropy)),
  );
  useEffect(
    () => () => {
      for (const material of materials) material.dispose();
      // The cover wrap is the one per-Manual texture: freed with its book, so switching Manuales doesn't pile up GPU memory.
      map.dispose();
      wraps.delete(key);
    },
    [materials, map, key],
  );
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
    let moving = spring(s.yaw, yawTarget, dt);
    moving = spring(s.hoverYaw, i.hoverX * 0.2, dt) || moving;
    moving = spring(s.hoverPitch, i.hoverY * 0.08, dt) || moving;
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

export const HELICE_POSES = {
  "helice-top": 0,
  // Halfway between two books, to judge the movement mid-turn.
  "helice-middle": 0.5,
  "helice-bottom": 1,
} as const;
export type HelicePose = keyof typeof HELICE_POSES;

const LAST = MANUALES.length - 1;
const TURN = 0.78; // radians round the axis from one book to the next
const RADIUS = 4.6;
const RISE = 1.7; // world units down from one book to the next
const REACH = 6; // books mounted either side of the focus
const CAMERA_Y = 1.4;
const BOOK_WIDTH = footprint(0).width;
/** Below this aspect the book in focus sits above its words; above it, right of the left column. */
const NARROW = 0.8;

/** Places a book `d` steps from the focus (positive: still to come) on the helix, its cover facing out from the axis. */
function placeOnHelix(book: Group, d: number) {
  const angle = d * TURN;
  book.position.set(
    RADIUS * Math.sin(angle),
    -d * RISE,
    RADIUS * (Math.cos(angle) - 1),
  );
  book.rotation.set(0, angle, 0);
}

/** How far down the track the screen's centre is, in steps: 0 at the first Manual's step, LAST at the last one's. */
function stepInView(track: HTMLElement): number {
  const [first, second] = Array.from(track.children, (step) =>
    step.getBoundingClientRect(),
  );
  if (!first) return 0;
  const step = second ? second.top - first.top : first.height;
  const centre = first.top + first.height / 2;
  return MathUtils.clamp((innerHeight / 2 - centre) / step, 0, LAST);
}

/** The paper token as a colour three parses: a 2D canvas resolves CSS colour syntax three can't (oklch). */
function paperColor() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas context for the fog");
  context.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-paper")
    .trim();
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

interface HeliceSceneProps {
  /** The flat track: one step per Manual, in catalog order. The step in view is the book in focus. */
  track: RefObject<HTMLElement | null>;
  pose: HelicePose | undefined;
  /** A tap or click on a book; `newTab` when a modifier key or the middle button asks for one, as on a link. */
  onOpen: (manual: Manual, newTab: boolean) => void;
}

/**
 * Every Manual floating along a helix. Scroll position alone drives it (ADR 0003): each book is placed by its distance
 * from the step in view, so it comes round from behind, faces the visitor in focus, and swings away up the spiral.
 */
export function HeliceScene({ track, pose, onOpen }: HeliceSceneProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const posed = pose === undefined ? undefined : HELICE_POSES[pose] * LAST;
  const [near, setNear] = useState(() =>
    Math.round(posed ?? (track.current ? stepInView(track.current) : 0)),
  );
  const books = useRef<(Group | null)[]>([]);
  const register = useCallback((index: number, book: Group | null) => {
    books.current[index] = book;
  }, []);
  const focus = useRef<Spring | null>(null);
  const [fogColor] = useState(paperColor);

  useEffect(() => {
    const onScroll = () => {
      invalidate();
      if (posed !== undefined || !track.current) return;
      const step = Math.round(stepInView(track.current));
      // A transition keeps the books on screen while a newly mounted neighbour's cover loads, instead of blanking the scene.
      startTransition(() => {
        setNear(step);
      });
    };
    addEventListener("scroll", onScroll, { passive: true });
    return () => {
      removeEventListener("scroll", onScroll);
      document.body.style.cursor = "";
    };
  }, [track, posed]);

  // Newly mounted books are placed on the next frame.
  useEffect(() => {
    invalidate();
  }, [near]);

  // The book in focus fills 56% of the height, as its flat Tapa does (40lvh wide), or 72% of a narrow screen's width.
  const aspect = size.width / size.height;
  const distance = Math.max(
    CASE_HEIGHT / (0.56 * 2 * HALF_FOV_TAN),
    BOOK_WIDTH / (0.72 * 2 * HALF_FOV_TAN * aspect),
  );

  useFrame((_, delta) => {
    const target = posed ?? (track.current ? stepInView(track.current) : near);
    let moving = false;
    if (posed !== undefined || !focus.current)
      focus.current = { x: target, v: 0 };
    else moving = spring(focus.current, target, Math.min(delta, 1 / 30));
    const f = focus.current.x;

    // Aimed at the book in focus, then shifted the way the flat track shifts its Tapa, so the two line up.
    camera.position.set(0, CAMERA_Y, distance);
    camera.lookAt(0, 0, 0);
    if ("setViewOffset" in camera) {
      const narrow = aspect <= NARROW;
      camera.setViewOffset(
        size.width,
        size.height,
        narrow ? 0 : -0.1 * size.width,
        narrow ? 0.13 * size.height : 0,
        size.width,
        size.height,
      );
    }

    for (let i = near - REACH; i <= near + REACH; i++) {
      const book = books.current[i];
      if (!book) continue;
      placeOnHelix(book, i - f);
      book.visible = true;
    }
    if (moving) invalidate();
  });

  return (
    <>
      {/* The far books fade into the paper. */}
      <fog attach="fog" args={[fogColor, distance + 3, distance + 13]} />
      {MANUALES.map(
        (manual, i) =>
          Math.abs(i - near) <= REACH && (
            <HeliceBook
              key={manual.slug}
              manual={manual}
              index={i}
              register={register}
              onOpen={onOpen}
            />
          ),
      )}
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

/** One book of the Hélice. Memoised: the scene re-renders as the focus moves, and its mounted books stay as they are. */
const HeliceBook = memo(function HeliceBook({
  manual,
  index,
  register,
  onOpen,
}: HeliceBookProps) {
  return (
    <group
      // Hidden until a frame has placed it. R3F applies an unchanged prop once, on mount, so a re-render never hides
      // it again.
      visible={false}
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
      <Book manual={manual} pxPerUnit={PHONE ? 420 : 676} />
    </group>
  );
});
