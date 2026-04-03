/**
 * AgentAvatarScene — High-fidelity Three.js robot avatar.
 * Only used for the large detail/editor preview (one instance at a time).
 * Card thumbnails use AgentAvatarSvg instead to avoid WebGL context exhaustion.
 */
import { h } from "preact";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import * as THREE from "three";
import type { AgentAvatarConfig } from "../../types.js";
import type { AgentAvatarExpression } from "../../lib/agent-avatar.js";
import { DEFAULT_AGENT_AVATAR_CONFIG, getAccentHex } from "../../lib/agent-avatar.js";
import { AgentAvatarSvg } from "./AgentAvatarSvg.js";

interface AgentAvatarSceneProps {
  config?: AgentAvatarConfig;
  expression?: AgentAvatarExpression;
  className?: string;
  fallbackMode?: boolean;
}

/* ── Color helpers ── */
const ACCENT_COLORS: Record<string, number> = {
  jade: 0x00e0a0, amber: 0xffb800, violet: 0x8b5cf6,
  coral: 0xff6b6b, sky: 0x38bdf8, pink: 0xf472b6,
};
function accentHex(id?: string): number {
  return ACCENT_COLORS[id ?? "jade"] ?? 0x00e0a0;
}

/* ── Shared materials factory ── */
function makeMaterials(accent: number) {
  const bodyDark = new THREE.MeshStandardMaterial({ color: 0x1e1e2e, metalness: 0.6, roughness: 0.35 });
  const bodyMid = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, metalness: 0.5, roughness: 0.4 });
  const metalTrim = new THREE.MeshStandardMaterial({ color: 0x555566, metalness: 0.85, roughness: 0.2 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accent, emissive: accent, emissiveIntensity: 0.35,
    metalness: 0.3, roughness: 0.4,
  });
  const accentGlow = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85 });
  const accentSoft = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.15 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dark = new THREE.MeshBasicMaterial({ color: 0x0a0a0f });
  const cheek = new THREE.MeshBasicMaterial({ color: 0xff9999, transparent: true, opacity: 0.0 });

  return { bodyDark, bodyMid, metalTrim, accentMat, accentGlow, accentSoft, white, dark, cheek };
}

/* ── Chassis builders ── */
function buildChassis(type: string | undefined, mats: ReturnType<typeof makeMaterials>) {
  const group = new THREE.Group();

  // Core hull
  let hullGeo: THREE.BufferGeometry;
  switch (type) {
    case "square": {
      hullGeo = new THREE.BoxGeometry(2.4, 2.4, 2.2, 4, 4, 4);
      break;
    }
    case "capsule": {
      hullGeo = new THREE.CapsuleGeometry(1.05, 1.3, 16, 24);
      break;
    }
    case "egg": {
      hullGeo = new THREE.SphereGeometry(1.15, 32, 32);
      hullGeo.scale(1, 1.35, 1.05);
      break;
    }
    default: { // round
      hullGeo = new THREE.SphereGeometry(1.25, 32, 32);
      break;
    }
  }
  const hull = new THREE.Mesh(hullGeo, mats.bodyDark);
  group.add(hull);

  // Accent trim ring (equator)
  const trimGeo = new THREE.TorusGeometry(type === "square" ? 1.5 : 1.28, 0.035, 8, 48);
  const trim = new THREE.Mesh(trimGeo, mats.accentMat);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = -0.1;
  group.add(trim);

  // Panel seam lines (two subtle rings)
  const seamGeo = new THREE.TorusGeometry(type === "square" ? 1.42 : 1.22, 0.015, 6, 48);
  const seamMat = mats.bodyMid;
  const seam1 = new THREE.Mesh(seamGeo, seamMat);
  seam1.rotation.x = Math.PI / 2;
  seam1.position.y = 0.35;
  group.add(seam1);
  const seam2 = new THREE.Mesh(seamGeo, seamMat);
  seam2.rotation.x = Math.PI / 2;
  seam2.position.y = -0.5;
  group.add(seam2);

  // Chest plate accent
  const chestGeo = new THREE.CircleGeometry(0.25, 24);
  const chest = new THREE.Mesh(chestGeo, mats.accentGlow);
  chest.position.set(0, -0.55, type === "square" ? 1.12 : 1.18);
  group.add(chest);

  // Shoulder joint nubs
  const jointGeo = new THREE.SphereGeometry(0.16, 12, 12);
  const leftJoint = new THREE.Mesh(jointGeo, mats.metalTrim);
  leftJoint.position.set(-1.3, 0.05, 0);
  group.add(leftJoint);
  const rightJoint = new THREE.Mesh(jointGeo, mats.metalTrim);
  rightJoint.position.set(1.3, 0.05, 0);
  group.add(rightJoint);

  return { group, hull, chest };
}

/* ── Eye builders ── */
function buildEyes(type: string | undefined, parent: THREE.Group, mats: ReturnType<typeof makeMaterials>) {
  const eyeGroup = new THREE.Group();
  parent.add(eyeGroup);

  let leftPart: THREE.Mesh;
  let rightPart: THREE.Mesh | null = null;
  let visor: THREE.Mesh | null = null;

  switch (type) {
    case "visor": {
      const visorGeo = new THREE.BoxGeometry(2.0, 0.55, 0.28, 8, 4, 1);
      visor = new THREE.Mesh(visorGeo, mats.accentGlow);
      visor.position.set(0, 0.2, 1.15);
      eyeGroup.add(visor);

      const pupGeo = new THREE.SphereGeometry(0.1, 10, 10);
      leftPart = new THREE.Mesh(pupGeo, mats.dark);
      leftPart.position.set(-0.38, 0, 0.16);
      visor.add(leftPart);
      rightPart = new THREE.Mesh(pupGeo, mats.dark);
      rightPart.position.set(0.38, 0, 0.16);
      visor.add(rightPart);
      break;
    }
    case "pixel": {
      const pxGeo = new THREE.BoxGeometry(0.38, 0.38, 0.12);
      leftPart = new THREE.Mesh(pxGeo, mats.accentGlow);
      leftPart.position.set(-0.42, 0.2, 1.18);
      eyeGroup.add(leftPart);
      rightPart = new THREE.Mesh(pxGeo, mats.accentGlow);
      rightPart.position.set(0.42, 0.2, 1.18);
      eyeGroup.add(rightPart);
      break;
    }
    case "cyclops": {
      const outerGeo = new THREE.SphereGeometry(0.42, 24, 24);
      leftPart = new THREE.Mesh(outerGeo, mats.white);
      leftPart.position.set(0, 0.2, 1.08);
      eyeGroup.add(leftPart);

      const pupilGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const pupil = new THREE.Mesh(pupilGeo, mats.dark);
      pupil.position.set(0, 0, 0.28);
      leftPart.add(pupil);

      // Glint
      const glintGeo = new THREE.SphereGeometry(0.06, 8, 8);
      const glint = new THREE.Mesh(glintGeo, mats.white);
      glint.position.set(0.08, 0.08, 0.3);
      leftPart.add(glint);

      // Ring
      const ringGeo = new THREE.TorusGeometry(0.48, 0.04, 8, 32);
      const ring = new THREE.Mesh(ringGeo, mats.accentGlow);
      ring.position.set(0, 0.2, 1.08);
      eyeGroup.add(ring);

      visor = ring;
      break;
    }
    default: { // dual
      const outerGeo = new THREE.SphereGeometry(0.3, 24, 24);
      const pupilGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const glintGeo = new THREE.SphereGeometry(0.05, 8, 8);

      leftPart = new THREE.Mesh(outerGeo, mats.white);
      leftPart.position.set(-0.42, 0.2, 1.05);
      eyeGroup.add(leftPart);
      const lp = new THREE.Mesh(pupilGeo, mats.dark);
      lp.position.set(0, 0, 0.2);
      leftPart.add(lp);
      const lg = new THREE.Mesh(glintGeo, mats.white);
      lg.position.set(0.06, 0.06, 0.22);
      leftPart.add(lg);

      rightPart = new THREE.Mesh(outerGeo, mats.white);
      rightPart.position.set(0.42, 0.2, 1.05);
      eyeGroup.add(rightPart);
      const rp = new THREE.Mesh(pupilGeo, mats.dark);
      rp.position.set(0, 0, 0.2);
      rightPart.add(rp);
      const rg = new THREE.Mesh(glintGeo, mats.white);
      rg.position.set(0.06, 0.06, 0.22);
      rightPart.add(rg);
      break;
    }
  }

  return { eyeGroup, leftEye: leftPart, rightEye: rightPart, visor };
}

/* ── Mouth builder (curved, not a box) ── */
function buildMouth(parent: THREE.Group, mats: ReturnType<typeof makeMaterials>) {
  // Use a torus segment for a natural curved mouth
  const mouthGeo = new THREE.TorusGeometry(0.22, 0.04, 8, 16, Math.PI);
  const mouth = new THREE.Mesh(mouthGeo, mats.accentGlow);
  mouth.position.set(0, -0.3, 1.18);
  mouth.rotation.x = Math.PI; // curve opens upward (smile by default)
  parent.add(mouth);
  return mouth;
}

/* ── Antenna builders ── */
function buildAntenna(type: string | undefined, parent: THREE.Object3D, mats: ReturnType<typeof makeMaterials>) {
  const group = new THREE.Group();

  switch (type) {
    case "dual": {
      [-0.35, 0.35].forEach((x) => {
        const stickGeo = new THREE.CapsuleGeometry(0.04, 0.55, 4, 8);
        const stick = new THREE.Mesh(stickGeo, mats.metalTrim);
        stick.position.set(x, 1.55, 0);
        stick.rotation.z = x > 0 ? -0.15 : 0.15;
        group.add(stick);
        const tipGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const tip = new THREE.Mesh(tipGeo, mats.accentGlow);
        tip.position.set(0, 0.38, 0);
        stick.add(tip);
      });
      break;
    }
    case "dish": {
      const stickGeo = new THREE.CapsuleGeometry(0.05, 0.35, 4, 8);
      const stick = new THREE.Mesh(stickGeo, mats.metalTrim);
      stick.position.set(0, 1.45, 0);
      group.add(stick);
      const dishGeo = new THREE.SphereGeometry(0.28, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dish = new THREE.Mesh(dishGeo, mats.accentMat);
      dish.position.set(0, 1.8, 0);
      dish.rotation.x = Math.PI;
      group.add(dish);
      break;
    }
    case "none":
      break;
    default: { // single
      const stickGeo = new THREE.CapsuleGeometry(0.04, 0.6, 4, 8);
      const stick = new THREE.Mesh(stickGeo, mats.metalTrim);
      stick.position.set(0, 1.55, 0);
      group.add(stick);
      const tipGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const tip = new THREE.Mesh(tipGeo, mats.accentGlow);
      tip.position.set(0, 0.42, 0);
      stick.add(tip);
      break;
    }
  }

  parent.add(group);
  return group;
}

/* ── Wing builders ── */
function buildWings(type: string | undefined, parent: THREE.Group, mats: ReturnType<typeof makeMaterials>) {
  const group = new THREE.Group();

  switch (type) {
    case "jets": {
      [-1.55, 1.55].forEach((x) => {
        const wingGeo = new THREE.BoxGeometry(0.75, 0.12, 0.5);
        const wing = new THREE.Mesh(wingGeo, mats.metalTrim);
        wing.position.set(x, -0.15, -0.1);
        wing.rotation.z = x > 0 ? -0.12 : 0.12;
        group.add(wing);

        const thrustGeo = new THREE.CylinderGeometry(0.1, 0.04, 0.25, 8);
        const thrust = new THREE.Mesh(thrustGeo, mats.accentGlow);
        thrust.position.set(0, -0.12, -0.18);
        wing.add(thrust);
      });
      break;
    }
    case "hover": {
      [[-0.5, 1.55], [-0.8, 1.3]].forEach(([y, r]) => {
        const ringGeo = new THREE.TorusGeometry(r, 0.04, 8, 40);
        const ring = new THREE.Mesh(ringGeo, mats.accentMat);
        ring.position.y = y;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);
      });
      break;
    }
    case "tiny": {
      [-1.35, 1.35].forEach((x) => {
        const wGeo = new THREE.SphereGeometry(0.22, 12, 12);
        wGeo.scale(1.6, 0.5, 1.1);
        const w = new THREE.Mesh(wGeo, mats.accentMat);
        w.position.set(x, 0.3, 0);
        group.add(w);
      });
      break;
    }
    default: { // propeller
      const hubGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8);
      const hub = new THREE.Mesh(hubGeo, mats.metalTrim);
      hub.position.set(0, 1.35, 0);
      group.add(hub);
      for (let i = 0; i < 3; i++) {
        const bladeGeo = new THREE.BoxGeometry(1.1, 0.025, 0.15);
        const blade = new THREE.Mesh(bladeGeo, mats.accentMat);
        blade.rotation.y = (i * Math.PI * 2) / 3;
        hub.add(blade);
      }
      break;
    }
  }

  parent.add(group);
  return group;
}

/* ── Arms builder ── */
function buildArms(parent: THREE.Group, mats: ReturnType<typeof makeMaterials>) {
  const armGeo = new THREE.CapsuleGeometry(0.09, 0.38, 4, 8);
  const handGeo = new THREE.SphereGeometry(0.12, 12, 12);

  const left = new THREE.Mesh(armGeo, mats.metalTrim);
  left.position.set(-1.38, -0.05, 0);
  left.rotation.z = 0.45;
  parent.add(left);
  const lh = new THREE.Mesh(handGeo, mats.accentMat);
  lh.position.set(0, -0.28, 0);
  left.add(lh);

  const right = new THREE.Mesh(armGeo, mats.metalTrim);
  right.position.set(1.38, -0.05, 0);
  right.rotation.z = -0.45;
  parent.add(right);
  const rh = new THREE.Mesh(handGeo, mats.accentMat);
  rh.position.set(0, -0.28, 0);
  right.add(rh);

  return { left, right };
}

/* ── Build cheek blush circles ── */
function buildCheeks(parent: THREE.Group, mats: ReturnType<typeof makeMaterials>) {
  const geo = new THREE.CircleGeometry(0.14, 16);
  const left = new THREE.Mesh(geo, mats.cheek);
  left.position.set(-0.65, -0.12, 1.08);
  parent.add(left);
  const right = new THREE.Mesh(geo, mats.cheek);
  right.position.set(0.65, -0.12, 1.08);
  parent.add(right);
  return { left, right };
}

/* ════════════════════════════════════════════════════════
 *  Main component
 * ════════════════════════════════════════════════════════ */
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
    chassis: THREE.Group;
    chestLight: THREE.Mesh;
    eyeLeft: THREE.Mesh;
    eyeRight: THREE.Mesh | null;
    visor: THREE.Mesh | null;
    mouth: THREE.Mesh;
    antennaGroup: THREE.Group;
    wingsGroup: THREE.Group;
    leftArm: THREE.Mesh;
    rightArm: THREE.Mesh;
    cheekLeft: THREE.Mesh;
    cheekRight: THREE.Mesh;
    particles: THREE.Points;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsReducedMotion(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // Build scene — tears down cleanly on config change
  const configKey = `${config.chassis}-${config.eyes}-${config.antenna}-${config.wings}-${config.accent}`;

  useEffect(() => {
    if (fallbackMode || webglError) return;
    const mount = mountRef.current;
    if (!mount) return;

    // Teardown previous
    if (sceneRef.current) {
      cancelAnimationFrame(sceneRef.current.animationId);
      if (mount.contains(sceneRef.current.renderer.domElement)) {
        mount.removeChild(sceneRef.current.renderer.domElement);
      }
      sceneRef.current.renderer.dispose();
      // Walk scene and dispose
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
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, clientWidth / clientHeight, 0.1, 100);
    camera.position.set(0, 0.8, 7.5);
    camera.lookAt(0, 0.3, 0);

    // Lighting rig
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.0);
    key.position.set(3, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xaabbff, 0.35);
    fill.position.set(-4, 2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.4);
    rim.position.set(0, 3, -4);
    scene.add(rim);

    const ac = accentHex(config.accent);
    const mats = makeMaterials(ac);
    const avatarGroup = new THREE.Group();
    scene.add(avatarGroup);

    // Build parts
    const { group: chassisGroup, hull, chest: chestLight } = buildChassis(config.chassis, mats);
    chassisGroup.position.y = 0.5;
    avatarGroup.add(chassisGroup);

    const faceGroup = new THREE.Group();
    chassisGroup.add(faceGroup);

    const { eyeGroup, leftEye, rightEye, visor } = buildEyes(config.eyes, faceGroup, mats);
    const mouth = buildMouth(faceGroup, mats);
    const { left: cheekLeft, right: cheekRight } = buildCheeks(faceGroup, mats);
    const antennaGroup = buildAntenna(config.antenna, chassisGroup, mats);
    const wingsGroup = buildWings(config.wings, avatarGroup, mats);
    const { left: leftArm, right: rightArm } = buildArms(avatarGroup, mats);

    // Particle trail
    const pCount = 14;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 1.8;
      pos[i * 3 + 1] = -1.2 - Math.random() * 2.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.8;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pMat = new THREE.PointsMaterial({ color: ac, size: 0.06, transparent: true, opacity: 0.5 });
    const particles = new THREE.Points(pGeo, pMat);
    avatarGroup.add(particles);

    sceneRef.current = {
      renderer, scene, camera, avatarGroup,
      chassis: chassisGroup, chestLight,
      eyeLeft: leftEye, eyeRight: rightEye, visor,
      mouth, antennaGroup, wingsGroup,
      leftArm, rightArm, cheekLeft, cheekRight,
      particles,
      animationId: 0,
    };

    const onResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      const { clientWidth: w, clientHeight: h } = mountRef.current;
      sceneRef.current.renderer.setSize(w, h);
      sceneRef.current.camera.aspect = w / h;
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

  // Animation loop
  useEffect(() => {
    if (!sceneRef.current || fallbackMode || webglError) return;
    const s = sceneRef.current;
    let t = 0;

    // Expression targets
    let eyeScaleY = 1, mouthRotX = Math.PI; // default: smile (upward curve)
    let mouthScaleX = 1, mouthScaleY = 1;
    let headTiltX = 0, headTiltZ = 0;
    let bounceAmp = 0.12, bounceSpeed = 1.5;
    let armWave = 0, cheekTarget = 0, propSpeed = 6;
    let chestPulse = true;

    switch (expression) {
      case "happy":
        mouthRotX = Math.PI; // smile
        mouthScaleX = 1.4; mouthScaleY = 1.2;
        bounceAmp = 0.2; bounceSpeed = 2;
        cheekTarget = 0.4; armWave = 1.5;
        break;
      case "sad":
        eyeScaleY = 0.55;
        mouthRotX = 0; // frown (downward curve)
        mouthScaleX = 0.9; mouthScaleY = 0.8;
        headTiltX = 0.12;
        bounceAmp = 0.06; bounceSpeed = 0.7;
        propSpeed = 3; chestPulse = false;
        break;
      case "angry":
        eyeScaleY = 0.65;
        mouthRotX = 0; // frown
        mouthScaleX = 0.7; mouthScaleY = 0.5;
        headTiltX = -0.08;
        bounceAmp = 0.08; bounceSpeed = 2.5;
        propSpeed = 12;
        break;
      case "sleepy":
        eyeScaleY = 0.12;
        mouthRotX = Math.PI; mouthScaleX = 0.5; mouthScaleY = 0.5;
        headTiltZ = 0.18; headTiltX = 0.08;
        bounceAmp = 0.04; bounceSpeed = 0.5;
        propSpeed = 1.5; chestPulse = false;
        break;
      case "bored":
        eyeScaleY = 0.35;
        mouthRotX = Math.PI; mouthScaleX = 0.6; mouthScaleY = 0.3;
        headTiltZ = 0.08;
        bounceAmp = 0.04; bounceSpeed = 0.6;
        propSpeed = 2; chestPulse = false;
        break;
      case "hyped":
        eyeScaleY = 1.25;
        mouthRotX = Math.PI;
        mouthScaleX = 1.8; mouthScaleY = 1.8;
        bounceAmp = 0.5; bounceSpeed = 3.5;
        cheekTarget = 0.6; armWave = 4;
        propSpeed = 18;
        break;
      case "shake_head":
        mouthRotX = Math.PI; mouthScaleX = 0.8;
        bounceAmp = 0.1;
        break;
      case "nod":
        mouthRotX = Math.PI;
        bounceAmp = 0.1;
        break;
    }

    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);

      if (isReducedMotion) {
        s.renderer.render(s.scene, s.camera);
        return;
      }

      t += 0.016;

      // Float
      s.avatarGroup.position.y = Math.sin(t * bounceSpeed) * bounceAmp;
      s.avatarGroup.rotation.z = Math.sin(t * 0.7) * 0.02;

      // Head expression
      if (expression === "shake_head") {
        s.chassis.rotation.y = Math.sin(t * 5) * 0.25;
      } else if (expression === "nod") {
        s.chassis.rotation.x = Math.sin(t * 4) * 0.2;
      } else {
        s.chassis.rotation.x = THREE.MathUtils.lerp(s.chassis.rotation.x, headTiltX, 0.06);
        s.chassis.rotation.z = THREE.MathUtils.lerp(s.chassis.rotation.z, headTiltZ, 0.06);
        s.chassis.rotation.y = THREE.MathUtils.lerp(s.chassis.rotation.y, 0, 0.06);
      }

      // Eye squint
      s.eyeLeft.scale.y = THREE.MathUtils.lerp(s.eyeLeft.scale.y, eyeScaleY, 0.1);
      if (s.eyeRight) s.eyeRight.scale.y = THREE.MathUtils.lerp(s.eyeRight.scale.y, eyeScaleY, 0.1);
      if (s.visor && expression !== "happy" && expression !== "hyped") {
        s.visor.scale.y = THREE.MathUtils.lerp(s.visor.scale.y, eyeScaleY, 0.1);
      }

      // Mouth: smooth rotate to smile/frown + scale
      s.mouth.rotation.x = THREE.MathUtils.lerp(s.mouth.rotation.x, mouthRotX, 0.08);
      s.mouth.scale.x = THREE.MathUtils.lerp(s.mouth.scale.x, mouthScaleX, 0.1);
      s.mouth.scale.y = THREE.MathUtils.lerp(s.mouth.scale.y, mouthScaleY, 0.1);

      // Cheeks
      const cm = s.cheekLeft.material as THREE.MeshBasicMaterial;
      cm.opacity = THREE.MathUtils.lerp(cm.opacity, cheekTarget, 0.06);
      (s.cheekRight.material as THREE.MeshBasicMaterial).opacity = cm.opacity;

      // Chest light pulse
      if (chestPulse) {
        (s.chestLight.material as THREE.MeshBasicMaterial).opacity =
          0.6 + Math.sin(t * 2) * 0.25;
      }

      // Propeller / wings
      s.wingsGroup.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.geometry.type === "CylinderGeometry") {
          child.rotation.y += propSpeed * 0.016;
        }
        // Hover rings gentle spin
        child.children?.forEach?.((sub: THREE.Object3D) => {
          if (sub instanceof THREE.Mesh) sub.rotation.y += propSpeed * 0.008;
        });
      });

      // Antenna sway
      s.antennaGroup.rotation.z = Math.sin(t * 2.5) * 0.04;

      // Arm wave
      if (armWave > 0) {
        s.leftArm.rotation.z = 0.45 + Math.sin(t * armWave) * 0.3;
        s.rightArm.rotation.z = -0.45 - Math.sin(t * armWave + 1) * 0.3;
      } else {
        s.leftArm.rotation.z = THREE.MathUtils.lerp(s.leftArm.rotation.z, 0.45, 0.04);
        s.rightArm.rotation.z = THREE.MathUtils.lerp(s.rightArm.rotation.z, -0.45, 0.04);
      }

      // Particles
      const pa = (s.avatarGroup.children.find((c) => c instanceof THREE.Points) as THREE.Points)
        ?.geometry.getAttribute("position") as THREE.BufferAttribute | undefined;
      if (pa) {
        for (let i = 0; i < pa.count; i++) {
          let y = pa.getY(i);
          y -= 0.012;
          if (y < -3.8) y = -1.0;
          pa.setY(i, y);
          pa.setX(i, pa.getX(i) + Math.sin(t + i) * 0.0015);
        }
        pa.needsUpdate = true;
      }

      s.renderer.render(s.scene, s.camera);
    };

    cancelAnimationFrame(s.animationId);
    animate();

    return () => {
      if (sceneRef.current) cancelAnimationFrame(sceneRef.current.animationId);
    };
  }, [expression, isReducedMotion, fallbackMode, webglError, configKey]);

  // ── Fallback uses the SVG component ──
  if (fallbackMode || webglError) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-void-800/40 ${className}`}
        style={{ minHeight: "200px", width: "100%", height: "100%" }}
        data-testid="agent-avatar-fallback"
      >
        <AgentAvatarSvg config={config} expression={expression} className="w-full h-full max-w-[200px]" />
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
