/**
 * AgentAvatarScene — High-fidelity 3D translation of the Code UX brand mark.
 *
 * Built as a stack of extruded layers that mirror the logo SVG one-to-one:
 *
 *    ┌─────────────────────────────────┐
 *    │  Black rounded TILE             │  ← chassis card
 *    │   ┌─────────────────────┐       │
 *    │ • │   White FACE SHELL  │ •     │  ← face + side ear bumps
 *    │   │  ┌────────────────┐ │       │
 *    │   │  │   DARK INSET   │ │       │  ← the "screen"
 *    │   │  │   ◉ jewel      │ │       │  ← forehead jewel
 *    │   │  │   ⌣  ⌣  eyes   │ │       │  ← jade smile arcs
 *    │   │  └────────────────┘ │       │
 *    │   └─────────────────────┘       │
 *    └─────────────────────────────────┘
 *           │   ANTENNA PILL + tilt lines (above the tile, jade emissive)
 *
 * The scene is rendered with brand-tinted env reflections, a 5-point light
 * rig, and a jade rim from below so the silhouette pops against any
 * background. Choreography: idle breath, periodic blink (smile arcs
 * compress + reopen), jewel pulse, antenna sway, expression head poses.
 */
import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as THREE from "../../../lib/three-lite.js";
import type { AgentAvatarConfig } from "../../types.js";
import {
  DEFAULT_AGENT_AVATAR_CONFIG,
  getAccentHex,
  isLightBase,
  BRAND_COLORS,
  type AgentAvatarExpression,
} from "../../lib/agent-avatar.js";
import { AgentAvatarSvg } from "./AgentAvatarSvg.js";

interface AgentAvatarSceneProps {
  config?: AgentAvatarConfig;
  expression?: AgentAvatarExpression;
  className?: string;
  fallbackMode?: boolean;
}

/* ── Hex string → THREE.Color int ── */
function hexInt(hex: string, fallback = 0x000000): number {
  const m = hex.match(/^#?([\da-f]{6})$/i);
  return m ? parseInt(m[1], 16) : fallback;
}

/* ════════════════════════════════════════════════════════════════════════
 *  Shape builders — extruded 2D shapes that recreate each logo layer.
 *
 *  Working units: the avatar canvas is roughly 2.6 × 2.6 around the origin.
 * ════════════════════════════════════════════════════════════════════════ */

/** Rounded-rectangle Shape centered at the origin. */
function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  return s;
}

/** Smile-arc Shape — a thick crescent/comma like the logo's eyes.
 *  Drawn as a horizontal "U" with bezier curves, centered at origin. */
function smileArcShape(width: number, height: number, thickness: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const t = thickness;
  const s = new THREE.Shape();
  // Outer arc (top-left → bottom → top-right)
  s.moveTo(-w, -h * 0.2);
  s.bezierCurveTo(-w, h, -w * 0.4, h, 0, h);
  s.bezierCurveTo(w * 0.4, h, w, h, w, -h * 0.2);
  // Inner edge — return back along the inside of the crescent
  s.lineTo(w - t, -h * 0.2);
  s.bezierCurveTo(w - t, h - t, w * 0.4, h - t, 0, h - t);
  s.bezierCurveTo(-w * 0.4, h - t, -w + t, h - t, -w + t, -h * 0.2);
  s.lineTo(-w, -h * 0.2);
  return s;
}

/** Vertical capsule/pill Shape — used for the antenna stem. */
function capsuleShape(width: number, height: number): THREE.Shape {
  const w = width / 2;
  const h = height / 2;
  const s = new THREE.Shape();
  s.moveTo(-w, -h + w);
  s.bezierCurveTo(-w, -h, w, -h, w, -h + w);
  s.lineTo(w, h - w);
  s.bezierCurveTo(w, h, -w, h, -w, h - w);
  s.lineTo(-w, -h + w);
  return s;
}

/** Extrude a Shape into a 3D mesh. */
function extrude(
  shape: THREE.Shape,
  depth: number,
  bevel: number,
  bevelSegments = 4,
): THREE.BufferGeometry {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments,
    curveSegments: 24,
  });
}

/* ════════════════════════════════════════════════════════════════════════
 *  Procedural environment map — gives the materials life
 * ════════════════════════════════════════════════════════════════════════ */
function createEnvMap(accent: number): THREE.CubeTexture | null {
  try {
    const size = 64;
    const faces: HTMLCanvasElement[] = [];
    const ar = ((accent >> 16) & 0xff) / 255;
    const ag = ((accent >> 8) & 0xff) / 255;
    const ab = (accent & 0xff) / 255;
    const accentRgba = `rgba(${Math.round(ar * 255)},${Math.round(ag * 255)},${Math.round(ab * 255)},0.55)`;

    const baseShades: [number, number][] = [
      [0x18, 0x22], [0x12, 0x1e], [0x32, 0x16], [0x06, 0x10], [0x18, 0x22], [0x10, 0x1c],
    ];
    for (let f = 0; f < 6; f++) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx || typeof ctx.createLinearGradient !== "function") return null;
      const [a, b] = baseShades[f];
      const g = ctx.createLinearGradient(0, 0, 0, size);
      g.addColorStop(0, `rgb(${a},${a},${a + 8})`);
      g.addColorStop(1, `rgb(${b},${b},${b + 12})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      if (f === 2) {
        const rg = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
        rg.addColorStop(0, accentRgba);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, size, size);
      }
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
        ctx.fillRect(x, y, 1, 1);
      }
      faces.push(canvas);
    }
    const tex = new THREE.CubeTexture(faces);
    tex.needsUpdate = true;
    return tex;
  } catch {
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════════════
 *  Materials factory
 * ════════════════════════════════════════════════════════════════════════ */
function makeMaterials(opts: {
  shell: number;
  inset: number;
  accent: number;
  envMap: THREE.CubeTexture | null;
  light: boolean;
}) {
  const { shell, inset, accent, envMap, light } = opts;
  return {
    shell: new THREE.MeshStandardMaterial({
      color: shell,
      metalness: 0.2,
      roughness: 0.35,
      envMap,
      envMapIntensity: light ? 0.55 : 0.7,
    }),
    inset: new THREE.MeshStandardMaterial({
      color: inset,
      metalness: 0.55,
      roughness: 0.2,
      envMap,
      envMapIntensity: 0.6,
    }),
    bezel: new THREE.MeshStandardMaterial({
      color: 0x101010,
      metalness: 0.7,
      roughness: 0.35,
      envMap,
      envMapIntensity: 0.4,
    }),
    jade: new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.95,
      metalness: 0.4,
      roughness: 0.18,
      envMap,
      envMapIntensity: 0.55,
    }),
    jadeStem: new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.7,
      metalness: 0.35,
      roughness: 0.25,
      envMap,
      envMapIntensity: 0.45,
    }),
    jadeGlow: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.45 }),
    glint: new THREE.MeshBasicMaterial({ color: 0xeefff8, transparent: true, opacity: 0.85 }),
  };
}
type Mats = ReturnType<typeof makeMaterials>;

/* ════════════════════════════════════════════════════════════════════════
 *  Chassis variant proportions — applied to tile + face shell + inset
 * ════════════════════════════════════════════════════════════════════════ */
interface ChassisSpec {
  tileR: number;       // tile corner radius
  scaleX: number;      // inner content scale
  scaleY: number;
}
const CHASSIS_SPECS: Record<string, ChassisSpec> = {
  classic: { tileR: 0.42, scaleX: 1.0, scaleY: 1.0 },
  square:  { tileR: 0.18, scaleX: 1.0, scaleY: 1.0 },
  tall:    { tileR: 0.42, scaleX: 0.88, scaleY: 1.0 },
  pebble:  { tileR: 0.62, scaleX: 1.0, scaleY: 0.92 },
};
function getChassisSpec(id?: string): ChassisSpec {
  return CHASSIS_SPECS[id ?? "classic"] ?? CHASSIS_SPECS.classic;
}

/* ════════════════════════════════════════════════════════════════════════
 *  Build the avatar — returns named refs for the animation loop
 * ════════════════════════════════════════════════════════════════════════ */
function buildAvatar(config: AgentAvatarConfig, mats: Mats) {
  const root = new THREE.Group();
  const headGroup = new THREE.Group();
  root.add(headGroup);

  const chassis = getChassisSpec(config.chassis);

  /* Inner content group — chassis variants scale the bot so tall/wide
     variations work without deforming the face geometry. The 3D scene
     intentionally has no surrounding "tile" mesh: we render the bot only
     so it floats freely against whatever background hosts the canvas. */
  const innerGroup = new THREE.Group();
  innerGroup.scale.set(chassis.scaleX, chassis.scaleY, 1);
  headGroup.add(innerGroup);

  /* ── 2. White face shell + ear caps ──
     Shell is a flat extruded rounded rect, slightly inset from the tile.
     Ear caps are two squat spheres flanking it at mid-height. */
  const shellW = 1.55;
  const shellH = 1.42;
  const shellShape = roundedRectShape(shellW, shellH, 0.42);
  const shellGeo = extrude(shellShape, 0.1, 0.03, 5);
  const shell = new THREE.Mesh(shellGeo, mats.shell);
  shell.position.set(0, -0.04, 0.13);
  innerGroup.add(shell);

  const earGeo = new THREE.SphereGeometry(0.26, 32, 32);
  earGeo.scale(1.0, 0.85, 0.85);
  const earL = new THREE.Mesh(earGeo, mats.shell);
  earL.position.set(-shellW / 2 - 0.05, -0.18, 0.18);
  innerGroup.add(earL);
  const earR = new THREE.Mesh(earGeo, mats.shell);
  earR.position.set(shellW / 2 + 0.05, -0.18, 0.18);
  innerGroup.add(earR);

  /* ── 3. Dark inset face ──
     Sits inside the shell, recessed deeper. */
  const insetW = 1.18;
  const insetH = 0.78;
  const insetShape = roundedRectShape(insetW, insetH, 0.32);
  const insetGeo = extrude(insetShape, 0.08, 0.025, 4);
  const inset = new THREE.Mesh(insetGeo, mats.inset);
  inset.position.set(0, -0.22, 0.23);
  innerGroup.add(inset);

  /* ── 4. Bezel sliver — thin dark line above the inset, hugging the top edge ── */
  const bezelGeo = new THREE.BoxGeometry(insetW * 0.95, 0.012, 0.012);
  const bezel = new THREE.Mesh(bezelGeo, mats.bezel);
  bezel.position.set(0, -0.22 + insetH / 2 + 0.012, 0.32);
  innerGroup.add(bezel);

  /* ── 5. Eyes ── */
  const eyesGroup = new THREE.Group();
  innerGroup.add(eyesGroup);
  eyesGroup.position.set(0, -0.22, 0.32);

  const eyeSep = insetW * 0.27;
  const eyesId = config.eyes ?? "smile";
  let leftEye: THREE.Mesh;
  let rightEye: THREE.Mesh | null = null;
  let eyesKind: "smile" | "visor" | "single" | "pixel" = "smile";

  if (eyesId === "visor") {
    eyesKind = "visor";
    const visorGeo = new THREE.BoxGeometry(insetW * 0.82, 0.12, 0.06);
    leftEye = new THREE.Mesh(visorGeo, mats.jade);
    leftEye.position.set(0, 0, 0);
    eyesGroup.add(leftEye);
    // Inner pupil dots
    const pupGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const lp = new THREE.Mesh(pupGeo, mats.glint);
    lp.position.set(-eyeSep, 0, 0.05);
    eyesGroup.add(lp);
    const rp = new THREE.Mesh(pupGeo, mats.glint);
    rp.position.set(eyeSep, 0, 0.05);
    eyesGroup.add(rp);
  } else if (eyesId === "single") {
    eyesKind = "single";
    const lensGeo = new THREE.SphereGeometry(0.18, 32, 32);
    leftEye = new THREE.Mesh(lensGeo, mats.jade);
    eyesGroup.add(leftEye);
    const ringGeo = new THREE.TorusGeometry(0.22, 0.018, 12, 48);
    const ring = new THREE.Mesh(ringGeo, mats.jade);
    eyesGroup.add(ring);
    rightEye = ring;
    const glintGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const glint = new THREE.Mesh(glintGeo, mats.glint);
    glint.position.set(-0.05, 0.05, 0.16);
    eyesGroup.add(glint);
  } else if (eyesId === "pixel") {
    eyesKind = "pixel";
    const pxGeo = new THREE.BoxGeometry(0.14, 0.14, 0.05);
    leftEye = new THREE.Mesh(pxGeo, mats.jade);
    leftEye.position.set(-eyeSep, 0, 0.02);
    eyesGroup.add(leftEye);
    rightEye = new THREE.Mesh(pxGeo, mats.jade);
    rightEye.position.set(eyeSep, 0, 0.02);
    eyesGroup.add(rightEye);
  } else {
    eyesKind = "smile";
    // Canonical smile-arcs — extruded thick crescents
    const smileGeo = extrude(smileArcShape(0.34, 0.22, 0.06), 0.05, 0.012, 3);
    leftEye = new THREE.Mesh(smileGeo, mats.jade);
    leftEye.position.set(-eyeSep, 0.06, 0.02);
    eyesGroup.add(leftEye);
    const smileGeo2 = extrude(smileArcShape(0.34, 0.22, 0.06), 0.05, 0.012, 3);
    rightEye = new THREE.Mesh(smileGeo2, mats.jade);
    rightEye.position.set(eyeSep, 0.06, 0.02);
    eyesGroup.add(rightEye);
  }

  /* ── 6. Forehead jewel ── */
  let jewel: THREE.Mesh | null = null;
  if (eyesId === "smile") {
    const jewelGeo = new THREE.SphereGeometry(0.075, 24, 24);
    jewel = new THREE.Mesh(jewelGeo, mats.jade);
    jewel.position.set(0, 0.08, 0.34);
    innerGroup.add(jewel);
    const jewelGlowGeo = new THREE.SphereGeometry(0.16, 16, 16);
    const jewelGlow = new THREE.Mesh(jewelGlowGeo, mats.jadeGlow);
    jewelGlow.position.copy(jewel.position);
    innerGroup.add(jewelGlow);
    const glintGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const glint = new THREE.Mesh(glintGeo, mats.glint);
    glint.position.set(-0.022, 0.094, 0.41);
    innerGroup.add(glint);
  }

  /* ── 7. Antenna ── */
  const antennaGroup = new THREE.Group();
  innerGroup.add(antennaGroup);
  antennaGroup.position.set(0, shellH / 2 + 0.06, 0.0);
  const antennaId = config.antenna ?? "jewel";
  let antennaTip: THREE.Mesh | null = null;

  if (antennaId === "bunny") {
    [-1, 1].forEach((side) => {
      const stickGeo = extrude(capsuleShape(0.07, 0.42), 0.04, 0.012, 3);
      const stick = new THREE.Mesh(stickGeo, mats.jade);
      stick.position.set(side * 0.18, 0.18, 0.05);
      stick.rotation.z = side * 0.38;
      antennaGroup.add(stick);
      const tipGeo = new THREE.SphereGeometry(0.07, 18, 18);
      const tip = new THREE.Mesh(tipGeo, mats.jade);
      tip.position.set(side * 0.34, 0.36, 0.07);
      antennaGroup.add(tip);
      if (!antennaTip) antennaTip = tip;
    });
  } else if (antennaId === "beam") {
    const stickGeo = extrude(capsuleShape(0.05, 0.48), 0.04, 0.01, 3);
    const stick = new THREE.Mesh(stickGeo, mats.jade);
    stick.position.set(0, 0.18, 0.05);
    antennaGroup.add(stick);
    const tipGeo = new THREE.SphereGeometry(0.1, 20, 20);
    const tip = new THREE.Mesh(tipGeo, mats.jade);
    tip.position.set(0, 0.42, 0.07);
    antennaGroup.add(tip);
    antennaTip = tip;
    const haloGeo = new THREE.TorusGeometry(0.16, 0.012, 8, 32);
    const halo = new THREE.Mesh(haloGeo, mats.jadeGlow);
    halo.rotation.x = Math.PI / 2;
    halo.position.copy(tip.position);
    antennaGroup.add(halo);
  } else if (antennaId !== "none") {
    // Default jewel: vertical pill + two diagonal tilt lines
    const pillGeo = extrude(capsuleShape(0.09, 0.32), 0.05, 0.012, 3);
    const pill = new THREE.Mesh(pillGeo, mats.jade);
    pill.position.set(0, 0.18, 0.05);
    antennaGroup.add(pill);
    antennaTip = pill;
    // Diagonal tilt lines flanking the pill (left = \, right = /)
    const lineGeo = extrude(capsuleShape(0.04, 0.22), 0.04, 0.01, 3);
    const lineL = new THREE.Mesh(lineGeo, mats.jadeStem);
    lineL.position.set(-0.16, 0.07, 0.05);
    lineL.rotation.z = -Math.PI * 0.18;
    antennaGroup.add(lineL);
    const lineR = new THREE.Mesh(lineGeo, mats.jadeStem);
    lineR.position.set(0.16, 0.07, 0.05);
    lineR.rotation.z = Math.PI * 0.18;
    antennaGroup.add(lineR);
  }

  /* ── 8. Aura (behind the tile) ── */
  const auraGroup = new THREE.Group();
  root.add(auraGroup);
  const wingsId = config.wings ?? "none";
  const auraRefs: { r1?: THREE.Mesh; r2?: THREE.Mesh; halo?: THREE.Mesh; kind: string } = { kind: wingsId };
  if (wingsId === "halo") {
    const haloGeo = new THREE.TorusGeometry(1.55, 0.04, 12, 80);
    const halo = new THREE.Mesh(haloGeo, mats.jade);
    halo.rotation.x = Math.PI / 2;
    halo.position.z = -0.2;
    auraGroup.add(halo);
    auraRefs.halo = halo;
  } else if (wingsId === "pulse") {
    const r1Geo = new THREE.TorusGeometry(1.4, 0.025, 10, 80);
    const r1 = new THREE.Mesh(r1Geo, mats.jade);
    r1.rotation.x = Math.PI / 2;
    r1.position.z = -0.1;
    auraGroup.add(r1);
    auraRefs.r1 = r1;
    const r2Geo = new THREE.TorusGeometry(1.55, 0.02, 10, 80);
    const r2 = new THREE.Mesh(r2Geo, mats.jadeStem);
    r2.rotation.x = Math.PI / 2;
    r2.position.z = -0.1;
    auraGroup.add(r2);
    auraRefs.r2 = r2;
  }

  return { root, headGroup, innerGroup, shell, inset, ears: [earL, earR], eyesGroup, leftEye, rightEye, eyesKind, jewel, antennaGroup, antennaTip, auraGroup, auraRefs };
}

/* ════════════════════════════════════════════════════════════════════════
 *  Main component
 * ════════════════════════════════════════════════════════════════════════ */
export function AgentAvatarScene({
  config = DEFAULT_AGENT_AVATAR_CONFIG,
  expression = "happy",
  className = "",
  fallbackMode = false,
}: AgentAvatarSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    avatarGroup: THREE.Group;
    parts: ReturnType<typeof buildAvatar>;
    particles: THREE.Points | null;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);

  const configKey = `${config.chassis}-${config.eyes}-${config.antenna}-${config.wings}-${config.accent}-${config.baseColor}`;

  useEffect(() => {
    if (fallbackMode || webglError) return;
    const mount = mountRef.current;
    if (!mount) return;

    // Tear down previous scene
    if (sceneRef.current) {
      cancelAnimationFrame(sceneRef.current.animationId);
      if (mount.contains(sceneRef.current.renderer.domElement)) {
        mount.removeChild(sceneRef.current.renderer.domElement);
      }
      sceneRef.current.renderer.dispose();
      sceneRef.current.scene.traverse((obj: THREE.Object3D) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
      sceneRef.current = null;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      setWebglError(true);
      return;
    }

    const { clientWidth, clientHeight } = mount;
    renderer.setSize(clientWidth, clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, clientWidth / clientHeight, 0.1, 100);
    camera.position.set(0, 0.2, 5.4);
    camera.lookAt(0, 0, 0);

    const accent = hexInt(getAccentHex(config.accent), 0x00eaab);
    const shell = isLightBase(config.baseColor) ? hexInt("#1A1A22") : hexInt(BRAND_COLORS.shellLight);
    const inset = isLightBase(config.baseColor) ? hexInt(BRAND_COLORS.shellLight) : hexInt(BRAND_COLORS.inkFace);
    const light = isLightBase(config.baseColor);

    /* 5-point lighting rig */
    scene.add(new THREE.AmbientLight(0xffffff, light ? 0.55 : 0.4));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(2.5, 4, 4.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb6d4ff, 0.45);
    fill.position.set(-3.5, 1.5, 2.5);
    scene.add(fill);
    const back = new THREE.DirectionalLight(0xffd9a3, 0.32);
    back.position.set(0, 2.5, -4);
    scene.add(back);
    // Jade rim from below — gives the silhouette its signature jade lift
    const rim = new THREE.PointLight(accent, 1.1, 8);
    rim.position.set(0, -1.6, 2.0);
    scene.add(rim);
    const kicker = new THREE.PointLight(accent, 0.35, 6);
    kicker.position.set(0, 2.4, 1.5);
    scene.add(kicker);

    const envMap = createEnvMap(accent);
    const mats = makeMaterials({ shell, inset, accent, envMap, light });

    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    const parts = buildAvatar(config, mats);
    avatarGroup.add(parts.root);

    // Particle ambient: jade motes drifting up around the head
    const pCount = config.wings === "dust" ? 36 : 16;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 1] = -1.6 + Math.random() * 3.6;
      pos[i * 3 + 2] = -0.6 + Math.random() * 0.8;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({
      color: accent,
      size: config.wings === "dust" ? 0.045 : 0.025,
      transparent: true,
      opacity: config.wings === "dust" ? 0.7 : 0.4,
    });
    const particles = new THREE.Points(pGeo, pMat);
    avatarGroup.add(particles);

    sceneRef.current = {
      renderer, scene, camera, avatarGroup, parts, particles,
      animationId: 0,
    };

    const onResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      const { clientWidth: w, clientHeight: h2 } = mountRef.current;
      sceneRef.current.renderer.setSize(w, h2);
      sceneRef.current.camera.aspect = w / h2;
      sceneRef.current.camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        if (mount.contains(sceneRef.current.renderer.domElement)) {
          mount.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current.renderer.dispose();
        sceneRef.current.scene.traverse((obj: THREE.Object3D) => {
          if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
          const mat = (obj as THREE.Mesh).material;
          if (mat) {
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
            else (mat as THREE.Material).dispose();
          }
        });
        sceneRef.current = null;
      }
    };
  }, [configKey, fallbackMode, webglError]);

  /* ════════════════════════════════════════════════════════════════════════
   *  Animation loop — choreography per expression
   * ════════════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!sceneRef.current || fallbackMode || webglError) return;
    const s = sceneRef.current;
    const p = s.parts;
    let t = 0;
    let nextBlink = 3 + Math.random() * 2;

    // Expression targets
    let headTiltX = 0, headTiltZ = 0;
    let bounceAmp = 0.04, bounceSpeed = 1.4;
    let antennaSway = 0.05;
    let eyeArcInvert = false;
    let eyeScaleY = 1.0;
    let jewelIntensity = 0.95;

    switch (expression) {
      case "happy":
        bounceAmp = 0.06; bounceSpeed = 1.8;
        jewelIntensity = 1.0;
        break;
      case "sad":
        headTiltX = 0.14;
        bounceAmp = 0.02; bounceSpeed = 0.6;
        eyeArcInvert = true;
        jewelIntensity = 0.4;
        break;
      case "angry":
        headTiltX = -0.05;
        bounceAmp = 0.03; bounceSpeed = 2.6;
        eyeArcInvert = true;
        eyeScaleY = 0.7;
        antennaSway = 0.1;
        jewelIntensity = 1.25;
        break;
      case "sleepy":
        eyeScaleY = 0.18;
        headTiltZ = 0.18; headTiltX = 0.08;
        bounceAmp = 0.02; bounceSpeed = 0.5;
        antennaSway = 0.015;
        jewelIntensity = 0.35;
        break;
      case "bored":
        eyeScaleY = 0.35;
        headTiltZ = 0.08;
        bounceAmp = 0.02; bounceSpeed = 0.7;
        jewelIntensity = 0.5;
        break;
      case "hyped":
        bounceAmp = 0.14; bounceSpeed = 3.2;
        antennaSway = 0.14;
        eyeScaleY = 1.2;
        jewelIntensity = 1.4;
        break;
      case "shake_head":
      case "nod":
        bounceAmp = 0.04;
        break;
    }

    // Flip the smile arcs on sad/angry (frown)
    if (p.eyesKind === "smile") {
      if (eyeArcInvert) {
        p.leftEye.scale.y = -Math.abs(p.leftEye.scale.y || 1);
        if (p.rightEye) p.rightEye.scale.y = -Math.abs(p.rightEye.scale.y || 1);
      } else {
        p.leftEye.scale.y = Math.abs(p.leftEye.scale.y || 1);
        if (p.rightEye) p.rightEye.scale.y = Math.abs(p.rightEye.scale.y || 1);
      }
    }

    const jewelMat = p.jewel?.material as THREE.MeshStandardMaterial | undefined;
    const antennaTipMat = p.antennaTip?.material as THREE.MeshStandardMaterial | undefined;

    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);

      if (isReducedMotion) {
        s.renderer.render(s.scene, s.camera);
        return;
      }

      t += 0.016;

      // Idle float + breath
      s.avatarGroup.position.y = Math.sin(t * bounceSpeed) * bounceAmp + 0.02;
      const breath = 1 + Math.sin(t * 1.5) * 0.012;
      p.headGroup.scale.set(breath, breath, breath);

      // Head pose
      if (expression === "shake_head") {
        p.headGroup.rotation.y = Math.sin(t * 5) * 0.25;
      } else if (expression === "nod") {
        p.headGroup.rotation.x = Math.sin(t * 4) * 0.18;
      } else {
        p.headGroup.rotation.y = THREE.MathUtils.lerp(p.headGroup.rotation.y, Math.sin(t * 0.4) * 0.06, 0.08);
        p.headGroup.rotation.x = THREE.MathUtils.lerp(p.headGroup.rotation.x, headTiltX, 0.06);
        p.headGroup.rotation.z = THREE.MathUtils.lerp(p.headGroup.rotation.z, headTiltZ, 0.06);
      }

      // Antenna sway
      p.antennaGroup.rotation.z = Math.sin(t * 2.0) * antennaSway;

      // Blink — smile arcs compress
      let blinkFactor = 1;
      if (t > nextBlink) {
        const phase = t - nextBlink;
        if (phase < 0.16) blinkFactor = 1 - phase / 0.16;
        else if (phase < 0.32) blinkFactor = (phase - 0.16) / 0.16;
        else nextBlink = t + 3 + Math.random() * 3;
      }
      const targetEyeY = eyeScaleY * Math.max(0.08, blinkFactor);
      const signedTarget = eyeArcInvert ? -targetEyeY : targetEyeY;
      p.leftEye.scale.y = THREE.MathUtils.lerp(p.leftEye.scale.y, signedTarget, 0.35);
      if (p.rightEye) p.rightEye.scale.y = THREE.MathUtils.lerp(p.rightEye.scale.y, signedTarget, 0.35);

      // Jewel + antenna pulse
      const pulse = jewelIntensity * (0.85 + Math.sin(t * 2.4) * 0.2);
      if (jewelMat) jewelMat.emissiveIntensity = THREE.MathUtils.lerp(jewelMat.emissiveIntensity, pulse, 0.08);
      if (antennaTipMat) antennaTipMat.emissiveIntensity = THREE.MathUtils.lerp(antennaTipMat.emissiveIntensity, pulse * 1.05, 0.08);

      // Aura ring pulse
      if (p.auraRefs.kind === "pulse" && p.auraRefs.r1 && p.auraRefs.r2) {
        const k = 1 + Math.sin(t * 1.8) * 0.06;
        p.auraRefs.r1.scale.set(k, k, k);
        p.auraRefs.r2.scale.set(k * 1.04, k * 1.04, k * 1.04);
      }
      if (p.auraRefs.kind === "halo" && p.auraRefs.halo) {
        p.auraGroup.rotation.y += 0.006;
      }

      // Particles drift up
      if (s.particles) {
        const attr = s.particles.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
        if (attr && attr.count) {
          for (let i = 0; i < attr.count; i++) {
            let y = attr.getY(i);
            y += 0.008;
            if (y > 2.4) y = -1.6;
            attr.setY(i, y);
            attr.setX(i, attr.getX(i) + Math.sin(t + i * 0.4) * 0.0008);
          }
          attr.needsUpdate = true;
        }
      }

      s.renderer.render(s.scene, s.camera);
    };

    cancelAnimationFrame(s.animationId);
    animate();

    return () => {
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animationId);
    };
  }, [expression, isReducedMotion, fallbackMode, webglError, configKey]);

  if (fallbackMode || webglError) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-void-800/40 ${className}`}
        style={{ minHeight: "200px", width: "100%", height: "100%" }}
        data-testid="agent-avatar-fallback"
      >
        <AgentAvatarSvg config={config} expression={expression} className="w-full h-full max-w-[220px]" />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative ${className}`}
      style={{ minHeight: "200px" }}
      data-testid="agent-avatar-scene"
    />
  );
}

export { BRAND_COLORS };
