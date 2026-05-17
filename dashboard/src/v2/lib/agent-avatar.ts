import type { AgentAvatarConfig } from "../types.js";

/* ════════════════════════════════════════════════════════════════════════
 *  Avatar expressions
 * ════════════════════════════════════════════════════════════════════════
 *  Each expression maps onto idle / blink / arc-shape / antenna behavior in
 *  both the SVG and the WebGL avatar so the look stays one-to-one across
 *  surfaces. Keep this list in sync with renderer switch statements.
 * ════════════════════════════════════════════════════════════════════════ */

export type AgentAvatarExpression =
  | "happy"
  | "sad"
  | "angry"
  | "sleepy"
  | "bored"
  | "hyped"
  | "shake_head"
  | "nod";

export const AGENT_AVATAR_EXPRESSIONS: AgentAvatarExpression[] = [
  "happy",
  "sad",
  "angry",
  "sleepy",
  "bored",
  "hyped",
  "shake_head",
  "nod",
];

export const SHOWCASE_EXPRESSIONS: AgentAvatarExpression[] = [
  "happy",
  "sad",
  "angry",
  "bored",
  "hyped",
];

/* ════════════════════════════════════════════════════════════════════════
 *  Brand DNA — the canonical Code UX logo palette.
 *  Every avatar variant pulls from this so they all read as the same family.
 * ════════════════════════════════════════════════════════════════════════ */
export const BRAND_COLORS = {
  onyx: "#050507",
  shellLight: "#FCFBFC",
  shellWarm: "#F4F1EA",
  inkFace: "#010101",
  bezel: "#101010",
  jade: "#00EAAB",
  jadeBright: "#34FFC4",
  jadeShadow: "#04C58F",
} as const;

/* ── Legacy humanoid options (kept for backward compat with stored data) ── */
export const AGENT_AVATAR_BODIES = ["male", "female"];
export const AGENT_AVATAR_HAIRS = ["style1", "style2", "style3", "style4"];
export const AGENT_AVATAR_FACES = ["style1", "style2", "style3", "style4"];
export const AGENT_AVATAR_SHIRTS = ["style1", "style2", "style3", "style4"];
export const AGENT_AVATAR_BOTTOMS = ["style1", "style2", "style3", "style4"];

/* ════════════════════════════════════════════════════════════════════════
 *  Robot part catalogues — curated to stay inside logo DNA.
 *
 *  CHASSIS — silhouette proportions only. All chassis share the same
 *  rounded-cushion language as the logo's outer body; variations tweak
 *  width/height so identities feel distinct without breaking the brand.
 *
 *  EYES (face inset) — the canonical look is "smile" (the jade arches in
 *  the logo). Other variants live inside the same dark face inset and use
 *  the same jade glow language.
 *
 *  ANTENNA — the logo's signature is a single jade jewel-ball + two
 *  diagonal tilt lines. Variants are restatements of that motif.
 *
 *  AURA (stored in the `wings` field for backward compat) — adds an
 *  optional ambient flourish around the head. Replaces the old wing/jet
 *  metaphor with logo-faithful jade flair: none, pulse rings, jade dust,
 *  or a soft halo.
 * ════════════════════════════════════════════════════════════════════════ */

export const ROBOT_CHASSIS_OPTIONS = [
  { id: "classic", label: "Classic" },
  { id: "square", label: "Square" },
  { id: "tall", label: "Tall" },
  { id: "pebble", label: "Pebble" },
] as const;

export const ROBOT_EYE_OPTIONS = [
  { id: "smile", label: "Smile Arcs" },
  { id: "visor", label: "Visor" },
  { id: "single", label: "Single Lens" },
  { id: "pixel", label: "Pixel" },
] as const;

export const ROBOT_ANTENNA_OPTIONS = [
  { id: "jewel", label: "Jewel" },
  { id: "bunny", label: "Bunny" },
  { id: "beam", label: "Beacon" },
  { id: "none", label: "None" },
] as const;

/** Stored in the legacy `wings` config field. */
export const ROBOT_WING_OPTIONS = [
  { id: "none", label: "Clean" },
  { id: "pulse", label: "Pulse Rings" },
  { id: "dust", label: "Jade Dust" },
  { id: "halo", label: "Halo" },
] as const;

export const ROBOT_ACCENT_OPTIONS = [
  { id: "jade", label: "Signal Jade", hex: BRAND_COLORS.jade },
  { id: "amber", label: "Ember Amber", hex: "#FFB347" },
  { id: "violet", label: "Cosmic Violet", hex: "#A78BFA" },
  { id: "coral", label: "Warm Coral", hex: "#FF8FA3" },
  { id: "sky", label: "Sky Blue", hex: "#7DD3FC" },
  { id: "fuchsia", label: "Neon Fuchsia", hex: "#F472B6" },
] as const;

export const ROBOT_BASE_COLOR_OPTIONS = [
  { id: "onyx", label: "Onyx", hex: BRAND_COLORS.onyx },
  { id: "graphite", label: "Graphite", hex: "#1B1B22" },
  { id: "midnight", label: "Midnight", hex: "#0B1023" },
  { id: "ivory", label: "Ivory", hex: BRAND_COLORS.shellWarm },
  { id: "arctic", label: "Arctic", hex: "#E5ECF3" },
  { id: "rose", label: "Rose Dust", hex: "#F2D6D2" },
] as const;

export type RobotChassis = typeof ROBOT_CHASSIS_OPTIONS[number]["id"];
export type RobotEyes = typeof ROBOT_EYE_OPTIONS[number]["id"];
export type RobotAntenna = typeof ROBOT_ANTENNA_OPTIONS[number]["id"];
export type RobotWings = typeof ROBOT_WING_OPTIONS[number]["id"];
export type RobotAccent = typeof ROBOT_ACCENT_OPTIONS[number]["id"];
export type RobotBaseColor = typeof ROBOT_BASE_COLOR_OPTIONS[number]["id"];

export const DEFAULT_AGENT_AVATAR_CONFIG: AgentAvatarConfig = {
  body: "male",
  hair: "style1",
  face: "style1",
  shirt: "style1",
  bottom: "style1",
  chassis: "classic",
  eyes: "smile",
  antenna: "jewel",
  wings: "none",
  accent: "jade",
  baseColor: "onyx",
};

/** Get accent hex color from accent id */
export function getAccentHex(accentId?: string): string {
  const found = ROBOT_ACCENT_OPTIONS.find((o) => o.id === accentId);
  return found?.hex ?? BRAND_COLORS.jade;
}

/** Get base color hex from base color id */
export function getBaseColorHex(baseColorId?: string): string {
  const found = ROBOT_BASE_COLOR_OPTIONS.find((o) => o.id === baseColorId);
  return found?.hex ?? BRAND_COLORS.onyx;
}

/** Is this base color light (so we should flip the face shell to a darker tint)? */
export function isLightBase(baseColorId?: string): boolean {
  return baseColorId === "ivory" || baseColorId === "arctic" || baseColorId === "rose";
}

/** Pick the right face-shell color for a given base. */
export function getShellHex(baseColorId?: string): string {
  return isLightBase(baseColorId) ? "#1A1A22" : BRAND_COLORS.shellLight;
}

/** Pick the right inner face inset color for a given base. */
export function getInsetHex(baseColorId?: string): string {
  return isLightBase(baseColorId) ? "#FCFBFC" : BRAND_COLORS.inkFace;
}

/** Deterministically generates a random integer between min and max based on a seed string. */
function deterministicRandomInt(seed: string, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const positiveHash = Math.abs(hash);
  return min + (positiveHash % (max - min + 1));
}

function pickRandom<T>(seed: string, options: readonly T[], salt: string): T {
  const index = deterministicRandomInt(`${seed}-${salt}`, 0, options.length - 1);
  return options[index];
}

function pickRandomId<T extends { id: string }>(seed: string, options: readonly T[], salt: string): string {
  return pickRandom(seed, options, salt).id;
}

export function generateRandomAgentAvatar(seed: string): AgentAvatarConfig {
  if (!seed) {
    return { ...DEFAULT_AGENT_AVATAR_CONFIG };
  }

  return {
    body: pickRandom(seed, AGENT_AVATAR_BODIES, "body"),
    hair: pickRandom(seed, AGENT_AVATAR_HAIRS, "hair"),
    face: pickRandom(seed, AGENT_AVATAR_FACES, "face"),
    shirt: pickRandom(seed, AGENT_AVATAR_SHIRTS, "shirt"),
    bottom: pickRandom(seed, AGENT_AVATAR_BOTTOMS, "bottom"),
    chassis: pickRandomId(seed, ROBOT_CHASSIS_OPTIONS, "chassis"),
    eyes: pickRandomId(seed, ROBOT_EYE_OPTIONS, "eyes"),
    antenna: pickRandomId(seed, ROBOT_ANTENNA_OPTIONS, "antenna"),
    wings: pickRandomId(seed, ROBOT_WING_OPTIONS, "wings"),
    accent: pickRandomId(seed, ROBOT_ACCENT_OPTIONS, "accent"),
    baseColor: pickRandomId(seed, ROBOT_BASE_COLOR_OPTIONS, "baseColor"),
  };
}

export function normalizeAgentAvatarConfig(
  config?: Partial<AgentAvatarConfig> | null
): AgentAvatarConfig {
  if (!config) {
    return { ...DEFAULT_AGENT_AVATAR_CONFIG };
  }

  const normalized = { ...DEFAULT_AGENT_AVATAR_CONFIG };

  if (config.body && AGENT_AVATAR_BODIES.includes(config.body)) {
    normalized.body = config.body;
  }
  if (config.hair && AGENT_AVATAR_HAIRS.includes(config.hair)) {
    normalized.hair = config.hair;
  }
  if (config.face && AGENT_AVATAR_FACES.includes(config.face)) {
    normalized.face = config.face;
  }
  if (config.shirt && AGENT_AVATAR_SHIRTS.includes(config.shirt)) {
    normalized.shirt = config.shirt;
  }
  if (config.bottom && AGENT_AVATAR_BOTTOMS.includes(config.bottom)) {
    normalized.bottom = config.bottom;
  }

  const chassisIds = ROBOT_CHASSIS_OPTIONS.map((o) => o.id as string);
  const eyeIds = ROBOT_EYE_OPTIONS.map((o) => o.id as string);
  const antennaIds = ROBOT_ANTENNA_OPTIONS.map((o) => o.id as string);
  const wingIds = ROBOT_WING_OPTIONS.map((o) => o.id as string);
  const accentIds = ROBOT_ACCENT_OPTIONS.map((o) => o.id as string);

  if (config.chassis && chassisIds.includes(config.chassis)) {
    normalized.chassis = config.chassis;
  }
  if (config.eyes && eyeIds.includes(config.eyes)) {
    normalized.eyes = config.eyes;
  }
  if (config.antenna && antennaIds.includes(config.antenna)) {
    normalized.antenna = config.antenna;
  }
  if (config.wings && wingIds.includes(config.wings)) {
    normalized.wings = config.wings;
  }
  if (config.accent && accentIds.includes(config.accent)) {
    normalized.accent = config.accent;
  }

  const baseColorIds = ROBOT_BASE_COLOR_OPTIONS.map((o) => o.id as string);
  if (config.baseColor && baseColorIds.includes(config.baseColor)) {
    normalized.baseColor = config.baseColor;
  }

  return normalized;
}

/* ════════════════════════════════════════════════════════════════════════
 *  Chassis proportion table — single source of truth used by both SVG and
 *  3D renderers so the silhouette stays identical across surfaces.
 *
 *  All numbers are *relative* to a unit head (1.0 wide, 1.0 tall, 0.55 deep).
 * ════════════════════════════════════════════════════════════════════════ */
export interface ChassisProportions {
  width: number;       // horizontal scale (1 = base)
  height: number;      // vertical scale
  depth: number;       // z-depth scale
  cornerRadius: number; // SVG corner radius fraction (0..1)
  earOffset: number;   // ear-cap horizontal offset
  earSize: number;     // ear-cap size
}

export const CHASSIS_PROPORTIONS: Record<string, ChassisProportions> = {
  classic: { width: 1.0, height: 1.0, depth: 0.55, cornerRadius: 0.26, earOffset: 0.5, earSize: 0.18 },
  square:  { width: 1.05, height: 1.0, depth: 0.55, cornerRadius: 0.14, earOffset: 0.52, earSize: 0.17 },
  tall:    { width: 0.92, height: 1.18, depth: 0.55, cornerRadius: 0.28, earOffset: 0.46, earSize: 0.16 },
  pebble:  { width: 1.18, height: 0.92, depth: 0.55, cornerRadius: 0.32, earOffset: 0.6, earSize: 0.18 },
};

export function getChassisProportions(chassisId?: string): ChassisProportions {
  return CHASSIS_PROPORTIONS[chassisId ?? "classic"] ?? CHASSIS_PROPORTIONS.classic;
}
