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
  type Ref,
  type RefObject,
  createContext,
  Suspense,
  use,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BufferGeometry,
  type Group,
  type IUniform,
  type Material,
  type Object3D,
  MathUtils,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
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
import { trackList } from "./track";

// The 3D stage, the book, and the two scenes built from it: one turnable book and the Pila.

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
        // three's raycaster also hits hidden objects; a culled book must not take a tap.
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

interface ShadowUniforms {
  [name: string]: IUniform;
  uHalf: IUniform<Vector2>;
  uContact: IUniform<number>;
  uAmbient: IUniform<number>;
  uSoft: IUniform<number>;
  uInner: IUniform<boolean>;
}

interface ContactShadowProps {
  width: number;
  depth: number;
  /** On another book rather than the ground: kept inside the footprint, so no shadow hangs over the edge in mid-air. */
  inner?: boolean;
  /** Its uniforms, for a parent that animates the shadow. */
  ref?: Ref<ShadowUniforms>;
}

const SHADOW_REACH = 0.6;

/**
 * A soft shadow on the plane below, drawn analytically from the footprint: a tight contact core plus a wide falloff.
 * Rendered with the scene, but it costs one quad, so it needs no separate static pass.
 */
function ContactShadow({
  width,
  depth,
  inner = false,
  ref,
}: ContactShadowProps) {
  const { material, uniforms } = useMemo(() => {
    const uniforms: ShadowUniforms = {
      uHalf: { value: new Vector2(width / 2, depth / 2) },
      uContact: { value: 0.6 },
      uAmbient: { value: 0.28 },
      uSoft: { value: 0.09 },
      uInner: { value: inner },
    };
    return {
      uniforms,
      material: new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms,
        vertexShader: /* glsl */ `
          varying vec2 vPos;
          void main() {
            vPos = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec2 uHalf;
          uniform float uContact, uAmbient, uSoft;
          uniform bool uInner;
          varying vec2 vPos;
          void main() {
            vec2 q = abs(vPos) - uHalf;
            float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
            float contact = uContact * (1.0 - smoothstep(-0.01, 0.03, d));
            float ambient = uAmbient * exp(-max(d, 0.0) / uSoft) * (1.0 - smoothstep(${SHADOW_REACH * 0.6}, ${SHADOW_REACH}, d));
            float within = uAmbient * smoothstep(0.0, uSoft, -d);
            gl_FragColor = vec4(0.07, 0.06, 0.05, uInner ? within : max(contact, ambient));
          }`,
      }),
    };
  }, [width, depth, inner]);
  useImperativeHandle(ref, () => uniforms, [uniforms]);
  const reach = inner ? 0 : SHADOW_REACH;
  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.0015} material={material}>
      {/* An inner shadow is transparent past the footprint, so it needs no margin. */}
      <planeGeometry args={[width + 2 * reach, depth + 2 * reach]} />
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

// ---- The Pila ----

export const PILA_POSES = {
  "pila-top": 0,
  "pila-middle": 0.5,
  "pila-bottom": 1,
} as const;
export type PilaPose = keyof typeof PILA_POSES;

const GAP = 0.45; // how far the stack opens above the book in focus
const SLIDE = 0.35; // how far that book slides out toward the visitor
const TILT = 0.2; // and how far it turns its cover toward them
const ELEVATION = 0.32;
const SPINE_Z = footprint(0).width / 2; // lying down, a book's spine faces the visitor this far out

const TOTAL = MANUALES.reduce((sum, manual) => sum + bookThickness(manual), 0);
let below = TOTAL;
/** Every Manual, top to bottom, resting on the one below it. */
const BOOKS = MANUALES.map((manual, index) => {
  // Deterministic jitter so the stack looks set down by hand.
  const wobble = Math.sin(index * 12.9898) * 43758.5453;
  const jitter = wobble - Math.floor(wobble) - 0.5;
  const thickness = bookThickness(manual);
  below -= thickness;
  return {
    manual,
    thickness,
    x: jitter * 0.1,
    yaw: jitter * 0.06,
    restY: below + thickness / 2,
  };
});
const LAST = BOOKS.length - 1;

interface PilaProps {
  /** The flat Pila: one child per Manual, top to bottom. The stack lines up with it and follows it as the page scrolls. */
  list: RefObject<HTMLElement | null>;
  pose: PilaPose | undefined;
  /** A tap or click on a book; `newTab` when a modifier key or the middle button asks for one, as on a link. */
  onOpen: (manual: Manual, newTab: boolean) => void;
}

/**
 * Books lying flat, spines to the visitor, first Manual on top. Scroll position alone drives it (ADR 0001): the book
 * whose flat Lomo crosses the canvas centre is in focus.
 */
export function Pila({ list, pose, onOpen }: PilaProps) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const canvas = useThree((state) => state.gl.domElement);
  // Indexed like BOOKS, top to bottom.
  const placements = useRef<(Group | null)[]>([]);
  const tilts = useRef<(Group | null)[]>([]);
  const shadowGroups = useRef<(Group | null)[]>([]);
  const shadows = useRef<(ShadowUniforms | null)[]>([]);
  const focus = useRef({ x: 0, v: 0 });

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
    const box = canvas.getBoundingClientRect();
    const probe = box.top + box.height / 2;
    const centres = Array.from(list.current?.children ?? [], (item) => {
      const rect = item.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
    let { index: target, offset } = trackList(centres, probe);
    let moving = false;
    if (pose) {
      // A pose freezes the focus, and the stack stays lined up with the flat Lomos as the page scrolls.
      target = PILA_POSES[pose] * LAST;
      const above = centres[Math.floor(target)] ?? probe;
      offset =
        MathUtils.lerp(above, centres[Math.ceil(target)] ?? above, target % 1) -
        probe;
      focus.current = { x: target, v: 0 };
    } else moving = spring(focus.current, target, Math.min(delta, 1 / 30));
    const f = focus.current.x;

    // Unsprung, so the stack moves with the page; at 88% of the list's width the nearer books stay inside it.
    const aspect = size.width / size.height;
    const share =
      (0.88 * (list.current?.clientWidth ?? size.width)) / size.width;
    const fit = CASE_HEIGHT / (share * 2 * HALF_FOV_TAN * aspect);
    const index = MathUtils.clamp(Math.floor(target), 0, LAST);
    const between = target - index;
    const a = BOOKS[index]?.restY ?? 0;
    const b = BOOKS[Math.min(index + 1, LAST)]?.restY ?? a;
    const lookY = a + (b - a) * between + GAP / 2;
    // Aimed at the spines, not the books' centres, so each Lomo lines up with its flat one.
    camera.position.set(
      0,
      lookY + fit * Math.sin(ELEVATION),
      SPINE_Z + fit * Math.cos(ELEVATION),
    );
    camera.lookAt(0, lookY, SPINE_Z);
    // Past either end of the list the stack shifts on screen by the same px, so it stays lined up with the flat Lomos.
    if ("setViewOffset" in camera) {
      camera.setViewOffset(
        size.width,
        size.height,
        0,
        -offset,
        size.width,
        size.height,
      );
    }
    // Culling: the frame's half-height, half again for lift and tilt, any shift past the list's ends, and ~1 unit of depth.
    const reach =
      fit * HALF_FOV_TAN * (1.5 + (2 * Math.abs(offset)) / size.height) + 1;

    // From the bottom up: every book above the one in focus rises to open a gap for it.
    let liftBelow = 0;
    let opened = 0;
    for (let i = LAST; i >= 0; i--) {
      const book = BOOKS[i];
      if (!book) continue;
      const weight = MathUtils.smoothstep(1 - Math.abs(i - f), 0, 1);
      const lift = opened + (GAP / 2) * weight;
      const slide = SLIDE * weight;
      const placement = placements.current[i];
      const shadowGroup = shadowGroups.current[i];
      const visible = Math.abs(book.restY + lift - lookY) < reach;
      if (placement) {
        placement.visible = visible;
        placement.position.set(book.x, book.restY + lift, slide);
      }
      tilts.current[i]?.rotation.set(TILT * weight, 0, 0);
      if (shadowGroup) {
        shadowGroup.visible = visible;
        shadowGroup.position.set(
          book.x,
          book.restY - book.thickness / 2 + liftBelow,
          // On the book below, the shadow stays over it rather than following the slide out past its spine.
          i === LAST ? slide : 0,
        );
      }
      const uniforms = shadows.current[i];
      if (uniforms) {
        const gap = lift - liftBelow;
        uniforms.uContact.value = 0.6 * Math.max(0, 1 - gap / 0.12);
        uniforms.uSoft.value = i === LAST ? 0.06 + gap * 0.5 : 0.05 + gap * 0.6;
        uniforms.uAmbient.value =
          i === LAST
            ? 0.28 * Math.max(0.35, 1 - gap)
            : 0.45 * Math.max(0.4, 1 - gap);
      }
      liftBelow = lift;
      opened += GAP * weight;
    }

    if (moving) invalidate();
  });

  return (
    <>
      {BOOKS.map((book, i) => {
        const { width } = footprint(book.thickness);
        return (
          <group key={book.manual.slug}>
            <group
              ref={(node) => {
                shadowGroups.current[i] = node;
              }}
              rotation-y={book.yaw}
            >
              <ContactShadow
                width={CASE_HEIGHT}
                depth={width}
                inner={i !== LAST}
                ref={(uniforms) => {
                  shadows.current[i] = uniforms;
                }}
              />
            </group>
            <group
              ref={(node) => {
                placements.current[i] = node;
              }}
              rotation-y={book.yaw}
              onClick={(event) => {
                event.stopPropagation();
                const { metaKey, ctrlKey, shiftKey } = event.nativeEvent;
                onOpen(book.manual, metaKey || ctrlKey || shiftKey);
              }}
              // A middle click opens a new tab, as it would on a link.
              onPointerUp={(event) => {
                if (event.button !== 1) return;
                event.stopPropagation();
                onOpen(book.manual, true);
              }}
              onPointerOver={(event) => {
                event.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "";
              }}
            >
              <group
                ref={(node) => {
                  tilts.current[i] = node;
                }}
              >
                {/* Lying face up, spine toward the visitor, head to the left. */}
                <group rotation-y={Math.PI / 2}>
                  <group rotation-x={-Math.PI / 2}>
                    <Book manual={book.manual} pxPerUnit={PHONE ? 338 : 676} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        );
      })}
    </>
  );
}
