/**
 * ProjectManagerScene — cinematic 3D Project Manager avatar for the
 * Interactive chat view.
 *
 * Differs from AgentAvatarScene (the editor preview) in three ways:
 *   1. Always animated — the avatar drifts on a figure-8 path, breathes,
 *      blinks, looks around, and reacts to cursor parallax / gaze.
 *   2. State-driven — reacts to listening / thinking / talking states
 *      from the chat composer, not a fixed expression catalogue.
 *   3. Cinematic stage — holographic floor disc, volumetric beam,
 *      pulsing halo, orbital ring of particles, premium 5-point lights.
 */
import { type FunctionComponent } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as THREE from "../../../lib/three-lite.js";

export type ProjectManagerSceneState =
  | "idle"
  | "listening"
  | "thinking"
  | "talking"
  | "greeting";

export interface ProjectManagerSceneProps {
  state?: ProjectManagerSceneState;
  accent?: string;        // hex, e.g. "#00E0A0"
  baseColor?: string;     // hex, e.g. "#1e1e2e"
  className?: string;
  energy?: number;        // 0..1 — boosts halo / particle intensity
}

/* ─── color helpers ──────────────────────────────────────────────────── */
function hexToInt(hex: string, fallback: number): number {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex.trim());
  return m ? parseInt(m[1]!, 16) : fallback;
}
function lighten(c: number, f: number): number {
  const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(f * 60));
  const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(f * 60));
  const b = Math.min(255, (c & 0xff) + Math.round(f * 60));
  return (r << 16) | (g << 8) | b;
}

/* ─── procedural environment ─────────────────────────────────────────── */
function makeEnvMap(): THREE.CubeTexture | null {
  try {
    const size = 64;
    const faces: HTMLCanvasElement[] = [];
    const palette = [
      [0x18, 0x18, 0x28, 0x22, 0x22, 0x3a],
      [0x14, 0x14, 0x24, 0x1e, 0x1e, 0x34],
      [0x28, 0x28, 0x40, 0x1a, 0x1a, 0x30],
      [0x0a, 0x0a, 0x14, 0x10, 0x10, 0x1e],
      [0x1a, 0x1a, 0x2c, 0x20, 0x20, 0x36],
      [0x12, 0x12, 0x22, 0x1c, 0x1c, 0x32],
    ];
    for (let f = 0; f < 6; f++) {
      const cv = document.createElement("canvas");
      cv.width = size; cv.height = size;
      const ctx = cv.getContext("2d");
      if (!ctx) return null;
      const c = palette[f]!;
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, `rgb(${c[0]},${c[1]},${c[2]})`);
      grad.addColorStop(1, `rgb(${c[3]},${c[4]},${c[5]})`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 220; i++) {
        const a = Math.random() * 0.09;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
      }
      faces.push(cv);
    }
    const tex = new THREE.CubeTexture(faces);
    tex.needsUpdate = true;
    return tex;
  } catch { return null; }
}

/* ─── shader: holographic floor disc ─────────────────────────────────── */
const floorVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const floorFrag = /* glsl */`
  precision mediump float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3  uAccent;
  uniform float uIntensity;

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    if (r > 1.0) discard;

    float rings = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float ringR = fract(uTime * 0.18 + fi * 0.25);
      rings += smoothstep(0.02, 0.0, abs(r - ringR)) * (1.0 - ringR);
    }

    float radial = pow(1.0 - r, 2.5);
    float angle = atan(p.y, p.x);
    float spokes = 0.5 + 0.5 * sin(angle * 24.0 + uTime * 0.6);
    spokes = mix(0.85, 1.0, spokes);

    float glow = radial * spokes + rings * 0.55;
    float alpha = clamp(glow * uIntensity, 0.0, 0.95);

    vec3 col = uAccent * (0.7 + glow * 1.2);
    gl_FragColor = vec4(col, alpha);
  }
`;

/* ─── shader: volumetric beam cone ───────────────────────────────────── */
const beamVert = /* glsl */`
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const beamFrag = /* glsl */`
  precision mediump float;
  varying vec3 vPos;
  uniform float uTime;
  uniform vec3 uAccent;
  uniform float uIntensity;

  void main() {
    float yN = (vPos.y + 2.5) / 5.0;
    float fade = pow(1.0 - clamp(yN, 0.0, 1.0), 1.6);
    float radial = 1.0 - smoothstep(0.0, 1.0, length(vPos.xz) / (1.0 + (1.0 - yN) * 1.2));
    float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + vPos.y * 0.6);
    float alpha = fade * radial * 0.22 * uIntensity * pulse;
    gl_FragColor = vec4(uAccent * 1.4, alpha);
  }
`;

/* ─── shader: soft sprite halo (point) ───────────────────────────────── */
const haloFrag = /* glsl */`
  precision mediump float;
  varying float vAlpha;
  uniform vec3 uAccent;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    gl_FragColor = vec4(uAccent, a * vAlpha);
  }
`;
const haloVert = /* glsl */`
  attribute float aSize;
  attribute float aPhase;
  uniform float uTime;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float ang = aPhase + uTime * 0.6;
    p.x += cos(ang) * 0.04;
    p.z += sin(ang) * 0.04;
    p.y += sin(uTime * 1.2 + aPhase * 6.0) * 0.05;
    vAlpha = 0.4 + 0.4 * sin(uTime * 0.8 + aPhase * 6.28);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (260.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

/* ─── chassis / face builders (richer than editor preview) ───────────── */
type Mats = {
  bodyDark: THREE.MeshStandardMaterial;
  bodyMid: THREE.MeshStandardMaterial;
  metalTrim: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  accentGlow: THREE.MeshBasicMaterial;
  white: THREE.MeshStandardMaterial;
  dark: THREE.MeshBasicMaterial;
  cheek: THREE.MeshBasicMaterial;
  glass: THREE.MeshStandardMaterial;
};

function makeMats(accent: number, base: number, env: THREE.CubeTexture | null): Mats {
  const mid = lighten(base, 0.35);
  const trim = lighten(base, 0.7);
  return {
    bodyDark: new THREE.MeshStandardMaterial({
      color: base, metalness: 0.78, roughness: 0.22, envMap: env, envMapIntensity: 0.85,
    }),
    bodyMid: new THREE.MeshStandardMaterial({
      color: mid, metalness: 0.6, roughness: 0.3, envMap: env, envMapIntensity: 0.5,
    }),
    metalTrim: new THREE.MeshStandardMaterial({
      color: trim, metalness: 0.95, roughness: 0.1, envMap: env, envMapIntensity: 1.0,
    }),
    accentMat: new THREE.MeshStandardMaterial({
      color: accent, emissive: accent, emissiveIntensity: 0.65,
      metalness: 0.3, roughness: 0.25, envMap: env, envMapIntensity: 0.6,
    }),
    accentGlow: new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.95 }),
    white: new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.0, roughness: 0.12, envMap: env, envMapIntensity: 0.4,
    }),
    dark: new THREE.MeshBasicMaterial({ color: 0x05050a }),
    cheek: new THREE.MeshBasicMaterial({ color: 0xff8aa3, transparent: true, opacity: 0 }),
    glass: new THREE.MeshStandardMaterial({
      color: accent, metalness: 0.1, roughness: 0.05,
      transparent: true, opacity: 0.78, envMap: env, envMapIntensity: 1.4,
    }),
  };
}

/* ─── component ──────────────────────────────────────────────────────── */
export const ProjectManagerScene: FunctionComponent<ProjectManagerSceneProps> = ({
  state = "idle",
  accent = "#00E0A0",
  baseColor = "#1e1e2e",
  className = "",
  energy = 1,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglError, setWebglError] = useState(false);

  // Cursor pos in normalized coords [-1, 1]
  const cursorRef = useRef({ x: 0, y: 0 });
  // Live state ref so animation loop reads the latest without rebuild
  const stateRef = useRef<ProjectManagerSceneState>(state);
  const energyRef = useRef<number>(energy);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { energyRef.current = energy; }, [energy]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || webglError) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    } catch {
      setWebglError(true);
      return;
    }

    const w = mount.clientWidth || 600;
    const h = mount.clientHeight || 600;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%", height: "100%", display: "block",
    });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
    camera.position.set(0, 0.6, 8.4);
    camera.lookAt(0, 0.4, 0);

    const accentInt = hexToInt(accent, 0x00e0a0);
    const baseInt = hexToInt(baseColor, 0x1e1e2e);
    const accentVec = new THREE.Color(accentInt);
    const env = makeEnvMap();
    const mats = makeMats(accentInt, baseInt, env);

    /* ── Lights ───────────────────────────────────────────────────── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.42));
    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(3, 5, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.45);
    fill.position.set(-4, 2, 3); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0, 3, -4); scene.add(rim);
    const kicker = new THREE.PointLight(accentInt, 1.6, 14);
    kicker.position.set(0, -1.4, 2.2); scene.add(kicker);
    const topGlow = new THREE.PointLight(accentInt, 0.9, 10);
    topGlow.position.set(0, 3.2, 1.5); scene.add(topGlow);

    /* ── Stage: holographic floor disc ────────────────────────────── */
    const floorMat = new THREE.ShaderMaterial({
      vertexShader: floorVert,
      fragmentShader: floorFrag,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Vector3(accentVec.r, accentVec.g, accentVec.b) },
        uIntensity: { value: 1.0 },
      },
      transparent: true,
      depthWrite: false,
    });
    const floorGeo = new THREE.CircleGeometry(2.6, 64);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.85;
    scene.add(floor);

    /* ── Stage: volumetric beam (additive cone) ───────────────────── */
    const beamMat = new THREE.ShaderMaterial({
      vertexShader: beamVert,
      fragmentShader: beamFrag,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Vector3(accentVec.r, accentVec.g, accentVec.b) },
        uIntensity: { value: 0.7 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const beamGeo = new THREE.CylinderGeometry(0.2, 2.0, 5.0, 36, 1, true);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.6;
    scene.add(beam);

    /* ── Avatar group + drift parent ─────────────────────────────── */
    const driftGroup = new THREE.Group(); // applies float / drift / parallax
    scene.add(driftGroup);
    const avatarGroup = new THREE.Group(); // body local rotation/lean
    driftGroup.add(avatarGroup);

    /* ── Avatar build ────────────────────────────────────────────── */
    const chassisGroup = new THREE.Group();
    chassisGroup.position.y = 0.5;
    avatarGroup.add(chassisGroup);

    // Hull — sphere with rim
    const hullGeo = new THREE.SphereGeometry(1.25, 40, 40);
    const hull = new THREE.Mesh(hullGeo, mats.bodyDark);
    chassisGroup.add(hull);

    // Equator panel-line: thin torus
    const equatorGeo = new THREE.TorusGeometry(1.252, 0.012, 6, 64);
    const equator = new THREE.Mesh(equatorGeo, mats.metalTrim);
    equator.rotation.x = Math.PI / 2;
    chassisGroup.add(equator);

    // Bottom rim (accent)
    const rimGeo = new THREE.TorusGeometry(1.22, 0.025, 8, 64);
    const rimMesh = new THREE.Mesh(rimGeo, mats.accentMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = -0.85;
    chassisGroup.add(rimMesh);

    // Shoulder joints
    const jointGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const leftJoint = new THREE.Mesh(jointGeo, mats.metalTrim);
    leftJoint.position.set(-1.3, 0.05, 0);
    chassisGroup.add(leftJoint);
    const rightJoint = new THREE.Mesh(jointGeo, mats.metalTrim);
    rightJoint.position.set(1.3, 0.05, 0);
    chassisGroup.add(rightJoint);

    // Face group
    const faceGroup = new THREE.Group();
    chassisGroup.add(faceGroup);

    // Eyes (dual round, gaze-tracked)
    const outerGeo = new THREE.SphereGeometry(0.3, 28, 28);
    const pupilGeo = new THREE.SphereGeometry(0.15, 20, 20);
    const glintGeo = new THREE.SphereGeometry(0.05, 10, 10);

    const leftEye = new THREE.Mesh(outerGeo, mats.white);
    leftEye.position.set(-0.42, 0.2, 1.05);
    faceGroup.add(leftEye);
    const lp = new THREE.Mesh(pupilGeo, mats.dark);
    lp.position.set(0, 0, 0.2); leftEye.add(lp);
    const lg = new THREE.Mesh(glintGeo, mats.white);
    lg.position.set(0.07, 0.07, 0.22); leftEye.add(lg);

    const rightEye = new THREE.Mesh(outerGeo, mats.white);
    rightEye.position.set(0.42, 0.2, 1.05);
    faceGroup.add(rightEye);
    const rp = new THREE.Mesh(pupilGeo, mats.dark);
    rp.position.set(0, 0, 0.2); rightEye.add(rp);
    const rg = new THREE.Mesh(glintGeo, mats.white);
    rg.position.set(0.07, 0.07, 0.22); rightEye.add(rg);

    // Eyelids — thin black caps that scale to blink/squint
    const lidGeo = new THREE.SphereGeometry(0.305, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const leftLid = new THREE.Mesh(lidGeo, mats.dark);
    leftLid.scale.y = 0; leftEye.add(leftLid);
    const rightLid = new THREE.Mesh(lidGeo, mats.dark);
    rightLid.scale.y = 0; rightEye.add(rightLid);

    // Mouth
    const mouthGeo = new THREE.TorusGeometry(0.22, 0.04, 10, 24, Math.PI);
    const mouth = new THREE.Mesh(mouthGeo, mats.accentGlow);
    mouth.position.set(0, -0.3, 1.22);
    mouth.rotation.x = Math.PI;
    faceGroup.add(mouth);

    // Cheeks
    const cheekGeo = new THREE.CircleGeometry(0.15, 18);
    const cheekL = new THREE.Mesh(cheekGeo, mats.cheek);
    cheekL.position.set(-0.65, -0.12, 1.10); faceGroup.add(cheekL);
    const cheekR = new THREE.Mesh(cheekGeo, mats.cheek);
    cheekR.position.set(0.65, -0.12, 1.10); faceGroup.add(cheekR);

    // Antenna with blinking tip
    const antennaGroup = new THREE.Group();
    const stickGeo = new THREE.CapsuleGeometry(0.04, 0.6, 4, 8);
    const stick = new THREE.Mesh(stickGeo, mats.metalTrim);
    stick.position.set(0, 1.55, 0); antennaGroup.add(stick);
    const tipGeo = new THREE.SphereGeometry(0.13, 16, 16);
    const tip = new THREE.Mesh(tipGeo, mats.accentMat);
    tip.position.set(0, 0.42, 0); stick.add(tip);
    chassisGroup.add(antennaGroup);

    // Hover rings (under chassis)
    const ringMatA = new THREE.MeshBasicMaterial({ color: accentInt, transparent: true, opacity: 0.55 });
    const ringMatB = new THREE.MeshBasicMaterial({ color: accentInt, transparent: true, opacity: 0.32 });
    const hover1 = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.04, 8, 64), ringMatA);
    hover1.rotation.x = Math.PI / 2; hover1.position.y = -0.6; avatarGroup.add(hover1);
    const hover2 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.03, 8, 64), ringMatB);
    hover2.rotation.x = Math.PI / 2; hover2.position.y = -0.85; avatarGroup.add(hover2);

    // Arms — segmented with elbow & hand
    function buildArm(side: number) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 1.38, 0.05, 0);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 6, 12), mats.metalTrim);
      upper.position.set(0, -0.1, 0); pivot.add(upper);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), mats.accentMat);
      elbow.position.set(0, -0.32, 0); pivot.add(elbow);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 6, 12), mats.metalTrim);
      fore.position.set(0, -0.5, 0); pivot.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mats.accentMat);
      hand.position.set(0, -0.7, 0); pivot.add(hand);
      pivot.rotation.z = side * 0.5;
      avatarGroup.add(pivot);
      return pivot;
    }
    const leftArm = buildArm(-1);
    const rightArm = buildArm(1);

    /* ── Halo: orbital points around avatar ──────────────────────── */
    const haloCount = 28;
    const haloPos = new Float32Array(haloCount * 3);
    const haloSize = new Float32Array(haloCount);
    const haloPhase = new Float32Array(haloCount);
    for (let i = 0; i < haloCount; i++) {
      const a = (i / haloCount) * Math.PI * 2;
      const r = 1.55 + Math.random() * 0.25;
      haloPos[i * 3] = Math.cos(a) * r;
      haloPos[i * 3 + 1] = 0.3 + (Math.random() - 0.5) * 0.4;
      haloPos[i * 3 + 2] = Math.sin(a) * r;
      haloSize[i] = 1.4 + Math.random() * 1.6;
      haloPhase[i] = a;
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
    haloGeo.setAttribute("aSize", new THREE.BufferAttribute(haloSize, 1));
    haloGeo.setAttribute("aPhase", new THREE.BufferAttribute(haloPhase, 1));
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: haloVert,
      fragmentShader: haloFrag,
      uniforms: {
        uTime: { value: 0 },
        uAccent: { value: new THREE.Vector3(accentVec.r, accentVec.g, accentVec.b) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const halo = new THREE.Points(haloGeo, haloMat);
    avatarGroup.add(halo);

    /* ── Orbital ring: thin glowing ring tilted, rotates ─────────── */
    const orbitGeo = new THREE.TorusGeometry(1.95, 0.012, 6, 96);
    const orbitMat = new THREE.MeshBasicMaterial({ color: accentInt, transparent: true, opacity: 0.7 });
    const orbit = new THREE.Mesh(orbitGeo, orbitMat);
    orbit.rotation.x = Math.PI / 2.4;
    orbit.rotation.z = 0.3;
    avatarGroup.add(orbit);

    /* ── Ambient sparkles (drifting around scene) ────────────────── */
    const sparkleCount = 60;
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      sparklePos[i * 3] = (Math.random() - 0.5) * 6;
      sparklePos[i * 3 + 1] = (Math.random() - 0.5) * 5;
      sparklePos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
    }
    const sparkleGeo = new THREE.BufferGeometry();
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePos, 3));
    const sparkleMat = new THREE.PointsMaterial({
      color: accentInt, size: 0.05, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    /* ── Cursor & resize handlers ────────────────────────────────── */
    const onMouseMove = (e: MouseEvent) => {
      const rect = mount.getBoundingClientRect();
      cursorRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      cursorRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      const cw = mount.clientWidth || 600;
      const ch = mount.clientHeight || 600;
      renderer.setSize(cw, ch);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    /* ── Animation state ─────────────────────────────────────────── */
    let t = 0;
    let blinkTimer = 2 + Math.random() * 3;
    let blinkPhase = 0; // 0..1 (closed at 0.5)
    let microActionTimer = 5 + Math.random() * 5;
    let microActionRot = { x: 0, y: 0, z: 0 };

    // Smoothed state targets
    let leanXSmooth = 0;
    let bobAmpSmooth = 0.18;
    let bobSpeedSmooth = 1.4;
    let mouthOpenSmooth = 0;
    let cheekSmooth = 0;
    let armSwingSmooth = 0;
    let yRotExtraSmooth = 0;
    let haloIntensitySmooth = 1;
    let beamIntensitySmooth = 0.7;
    let floorIntensitySmooth = 1;

    let rafId = 0;
    const clock = { last: performance.now() };

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min(0.05, (now - clock.last) / 1000);
      clock.last = now;

      if (reducedMotion) {
        renderer.render(scene, camera);
        return;
      }
      t += dt;

      const s = stateRef.current;
      const e = energyRef.current;

      // State targets
      let leanX = 0, bobAmp = 0.18, bobSpeed = 1.4;
      let mouthOpen = 0, cheek = 0, armSwing = 0, yRotExtra = 0;
      let haloI = 1, beamI = 0.7, floorI = 1;

      switch (s) {
        case "listening":
          leanX = -0.06; bobAmp = 0.1; bobSpeed = 1.0;
          haloI = 1.15; beamI = 0.95; floorI = 1.2;
          break;
        case "thinking":
          bobAmp = 0.07; bobSpeed = 0.7;
          yRotExtra = 0.6; // slow Y drift
          haloI = 1.45; beamI = 1.1; floorI = 1.4;
          break;
        case "talking":
          bobAmp = 0.22; bobSpeed = 2.4;
          mouthOpen = 0.5 + 0.5 * Math.sin(t * 14);
          cheek = 0.35;
          armSwing = 1.2;
          haloI = 1.3; beamI = 1.0; floorI = 1.3;
          break;
        case "greeting":
          bobAmp = 0.32; bobSpeed = 2.8;
          armSwing = 2.2; cheek = 0.55;
          haloI = 1.5; beamI = 1.15; floorI = 1.5;
          break;
        default:
          // idle
          break;
      }

      // Smooth interpolation
      const k = 1 - Math.exp(-dt * 4);
      leanXSmooth += (leanX - leanXSmooth) * k;
      bobAmpSmooth += (bobAmp - bobAmpSmooth) * k;
      bobSpeedSmooth += (bobSpeed - bobSpeedSmooth) * k;
      mouthOpenSmooth += (mouthOpen - mouthOpenSmooth) * k;
      cheekSmooth += (cheek - cheekSmooth) * k;
      armSwingSmooth += (armSwing - armSwingSmooth) * k;
      yRotExtraSmooth += (yRotExtra - yRotExtraSmooth) * k;
      haloIntensitySmooth += (haloI * e - haloIntensitySmooth) * k;
      beamIntensitySmooth += (beamI * e - beamIntensitySmooth) * k;
      floorIntensitySmooth += (floorI * e - floorIntensitySmooth) * k;

      /* Drift: figure-8 in XZ + bob in Y */
      const driftX = Math.sin(t * 0.35) * 0.55;
      const driftZ = Math.sin(t * 0.7) * 0.18;
      const bob = Math.sin(t * bobSpeedSmooth) * bobAmpSmooth;
      // Cursor parallax — small offset toward cursor
      const px = cursorRef.current.x * 0.35;
      const py = cursorRef.current.y * 0.18;
      driftGroup.position.set(driftX + px, bob + py, driftZ);

      /* Subtle whole-body sway */
      driftGroup.rotation.z = Math.sin(t * 0.6) * 0.025;
      driftGroup.rotation.x = Math.sin(t * 0.45) * 0.012;

      /* Body lean / extra Y rotation */
      avatarGroup.rotation.x += (leanXSmooth - avatarGroup.rotation.x) * k;
      // Thinking spin (additive Y rotation rate)
      avatarGroup.rotation.y += yRotExtraSmooth * dt;

      /* Micro-actions: occasional head tilt / look-around */
      microActionTimer -= dt;
      if (microActionTimer <= 0 && s === "idle") {
        microActionTimer = 4 + Math.random() * 6;
        microActionRot = {
          x: (Math.random() - 0.5) * 0.16,
          y: (Math.random() - 0.5) * 0.32,
          z: (Math.random() - 0.5) * 0.08,
        };
      } else if (s !== "idle") {
        microActionRot = { x: 0, y: 0, z: 0 };
      }
      // Decay rotation back over time
      microActionRot.x *= 1 - dt * 0.6;
      microActionRot.y *= 1 - dt * 0.6;
      microActionRot.z *= 1 - dt * 0.6;

      const headTargetX = microActionRot.x + (s === "listening" ? 0.12 : 0) + cursorRef.current.y * 0.06;
      const headTargetY = microActionRot.y + cursorRef.current.x * 0.18;
      const headTargetZ = microActionRot.z + (s === "listening" ? 0.06 : 0);
      chassisGroup.rotation.x += (headTargetX - chassisGroup.rotation.x) * k * 1.2;
      chassisGroup.rotation.y += (headTargetY - chassisGroup.rotation.y) * k * 1.2;
      chassisGroup.rotation.z += (headTargetZ - chassisGroup.rotation.z) * k * 1.2;

      /* Eye gaze — pupil offset toward cursor */
      const gazeX = cursorRef.current.x * 0.06;
      const gazeY = cursorRef.current.y * 0.04;
      lp.position.x += (gazeX - lp.position.x) * k * 0.8;
      lp.position.y += (gazeY - lp.position.y) * k * 0.8;
      lp.position.z = 0.2;
      rp.position.x += (gazeX - rp.position.x) * k * 0.8;
      rp.position.y += (gazeY - rp.position.y) * k * 0.8;
      rp.position.z = 0.2;
      // Glints follow pupils
      lg.position.set(lp.position.x + 0.07, lp.position.y + 0.07, 0.22);
      rg.position.set(rp.position.x + 0.07, rp.position.y + 0.07, 0.22);

      /* Blink */
      blinkTimer -= dt;
      if (blinkTimer <= 0 && blinkPhase === 0) {
        blinkPhase = 0.001;
      }
      if (blinkPhase > 0) {
        blinkPhase += dt * 6.0; // blink takes ~1/6s
        if (blinkPhase >= 1) {
          blinkPhase = 0;
          blinkTimer = 2.5 + Math.random() * 4;
        }
      }
      const blinkLid = Math.sin(blinkPhase * Math.PI); // 0 → 1 → 0
      // Squint when listening
      const baseLid = s === "listening" ? 0.25 : 0;
      const lidScale = Math.max(blinkLid, baseLid);
      leftLid.scale.y = lidScale;
      rightLid.scale.y = lidScale;

      /* Mouth: smile by default, open on talking */
      const targetSmileScaleX = (s === "greeting" || s === "talking") ? 1.5 : 1.2;
      const targetSmileScaleY = 1.0 + mouthOpenSmooth * 0.9;
      mouth.scale.x += (targetSmileScaleX - mouth.scale.x) * k;
      mouth.scale.y += (targetSmileScaleY - mouth.scale.y) * k;

      /* Cheeks */
      (cheekL.material as THREE.MeshBasicMaterial).opacity = cheekSmooth;
      (cheekR.material as THREE.MeshBasicMaterial).opacity = cheekSmooth;

      /* Arms */
      const wave = Math.sin(t * 4) * armSwingSmooth * 0.45;
      const targetLeftZ = 0.5 + (armSwingSmooth > 0 ? wave : 0);
      const targetRightZ = -0.5 - (armSwingSmooth > 0 ? Math.sin(t * 4 + 1.2) * armSwingSmooth * 0.45 : 0);
      // Greeting: raise right arm
      const greetingLift = s === "greeting" ? -1.5 + Math.sin(t * 6) * 0.2 : 0;
      leftArm.rotation.z += (targetLeftZ - leftArm.rotation.z) * k * 0.8;
      rightArm.rotation.z += ((targetRightZ + greetingLift) - rightArm.rotation.z) * k * 0.8;

      /* Hover rings rotate */
      hover1.rotation.z += dt * 0.6;
      hover2.rotation.z -= dt * 0.4;

      /* Antenna sway + tip pulse */
      antennaGroup.rotation.z = Math.sin(t * 2.4) * 0.05;
      const tipMat = tip.material as THREE.MeshStandardMaterial;
      tipMat.emissiveIntensity = 0.5 + 0.4 * Math.sin(t * 3 + 1);

      /* Orbital ring rotation */
      orbit.rotation.y += dt * 0.45;
      orbit.rotation.z = 0.3 + Math.sin(t * 0.5) * 0.06;

      /* Sparkle drift */
      const sp = sparkleGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < sparkleCount; i++) {
        let y = sp.getY(i);
        y += dt * (0.05 + (i % 5) * 0.01);
        if (y > 2.6) y = -2.6;
        sp.setY(i, y);
        sp.setX(i, sp.getX(i) + Math.sin(t * 0.4 + i) * 0.0008);
      }
      sp.needsUpdate = true;

      /* Stage uniforms */
      floorMat.uniforms.uTime.value = t;
      floorMat.uniforms.uIntensity.value = floorIntensitySmooth;
      beamMat.uniforms.uTime.value = t;
      beamMat.uniforms.uIntensity.value = beamIntensitySmooth;
      haloMat.uniforms.uTime.value = t;
      // Halo opacity scaled by intensity through point alpha (handled in shader via vAlpha base)
      kicker.intensity = 1.4 + haloIntensitySmooth * 0.4;
      topGlow.intensity = 0.8 + haloIntensitySmooth * 0.3;

      /* Camera subtle parallax */
      const camTargetX = cursorRef.current.x * 0.18;
      const camTargetY = 0.6 + cursorRef.current.y * 0.1;
      camera.position.x += (camTargetX - camera.position.x) * k * 0.5;
      camera.position.y += (camTargetY - camera.position.y) * k * 0.5;
      camera.lookAt(0, 0.4, 0);

      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      ro.disconnect();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material;
        if (mat) {
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    };
  }, [accent, baseColor, reducedMotion, webglError]);

  if (webglError) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`}>
        <span className="text-sm">Interactive scene unavailable</span>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative ${className}`}
      data-testid="project-manager-scene"
      aria-hidden="true"
    />
  );
};
