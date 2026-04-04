/**
 * AgentAvatarSvg — Lightweight, zero-WebGL robot avatar rendered as pure SVG.
 * Used for card thumbnails and anywhere we need many avatars on-screen at once.
 * Matches the same config/expression API as the 3D scene.
 */
import { h } from "preact";
import type { AgentAvatarConfig } from "../../types.js";
import type { AgentAvatarExpression } from "../../lib/agent-avatar.js";
import { getAccentHex } from "../../lib/agent-avatar.js";

interface AgentAvatarSvgProps {
  config?: AgentAvatarConfig;
  expression?: AgentAvatarExpression;
  className?: string;
  size?: number;
}

/* ── Chassis shape paths ── */
function chassisPath(type?: string): string {
  switch (type) {
    case "square":
      return "M 32 28 Q 32 22 38 22 L 82 22 Q 88 22 88 28 L 88 72 Q 88 78 82 78 L 38 78 Q 32 78 32 72 Z";
    case "capsule":
      return "M 40 20 Q 60 14 80 20 Q 90 28 90 50 Q 90 72 80 80 Q 60 86 40 80 Q 30 72 30 50 Q 30 28 40 20 Z";
    case "egg":
      return "M 60 16 Q 88 22 88 52 Q 88 78 60 84 Q 32 78 32 52 Q 32 22 60 16 Z";
    default: // round
      return "M 60 18 Q 86 18 86 50 Q 86 82 60 82 Q 34 82 34 50 Q 34 18 60 18 Z";
  }
}

/* ── Eye rendering ── */
function renderEyes(type: string | undefined, expr: AgentAvatarExpression, accent: string) {
  const squint = expr === "sleepy" || expr === "bored";
  const wide = expr === "hyped";
  const angry = expr === "angry";
  const sad = expr === "sad";

  switch (type) {
    case "visor":
      return (
        <g>
          {/* Visor band */}
          <rect x="38" y={squint ? "44" : "40"} width="44" height={squint ? "8" : (wide ? "16" : "12")} rx="5" fill={accent} opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.6;0.9" dur="3s" repeatCount="indefinite" />
          </rect>
          {/* Pupils */}
          {!squint && (
            <>
              <circle cx="50" cy={wide ? "48" : "46"} r={wide ? "4" : "3"} fill="#0a0a0f" />
              <circle cx="70" cy={wide ? "48" : "46"} r={wide ? "4" : "3"} fill="#0a0a0f" />
              <circle cx="51.5" cy={wide ? "46.5" : "44.5"} r="1.2" fill="white" opacity="0.9" />
              <circle cx="71.5" cy={wide ? "46.5" : "44.5"} r="1.2" fill="white" opacity="0.9" />
            </>
          )}
        </g>
      );
    case "pixel":
      return (
        <g>
          <rect x="43" y={squint ? "44" : "41"} width={wide ? "10" : "8"} height={squint ? "4" : (wide ? "10" : "8")} rx="1.5" fill={accent} opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2.5s" repeatCount="indefinite" />
          </rect>
          <rect x="67" y={squint ? "44" : "41"} width={wide ? "10" : "8"} height={squint ? "4" : (wide ? "10" : "8")} rx="1.5" fill={accent} opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2.5s" repeatCount="indefinite" begin="0.3s" />
          </rect>
        </g>
      );
    case "cyclops":
      return (
        <g>
          <circle cx="60" cy="46" r={squint ? "5" : (wide ? "11" : "9")} fill="white" />
          <circle cx="60" cy="46" r={squint ? "2" : (wide ? "5.5" : "4.5")} fill="#0a0a0f" />
          {!squint && <circle cx="62" cy="44" r="1.8" fill="white" opacity="0.85" />}
          <circle cx="60" cy="46" r={squint ? "7" : (wide ? "13" : "11")} fill="none" stroke={accent} strokeWidth="1.5" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.3;0.6" dur="3s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    default: // dual
      return (
        <g>
          {/* Left eye */}
          <circle cx="48" cy="46" r={squint ? "3" : (wide ? "9" : "7.5")} fill="white" />
          <circle cx="48" cy="46" r={squint ? "1.5" : (wide ? "4.5" : "3.5")} fill="#0a0a0f" />
          {!squint && <circle cx="50" cy="44" r="1.5" fill="white" opacity="0.85" />}
          {/* Right eye */}
          <circle cx="72" cy="46" r={squint ? "3" : (wide ? "9" : "7.5")} fill="white" />
          <circle cx="72" cy="46" r={squint ? "1.5" : (wide ? "4.5" : "3.5")} fill="#0a0a0f" />
          {!squint && <circle cx="74" cy="44" r="1.5" fill="white" opacity="0.85" />}
          {/* Angry brow lines */}
          {angry && (
            <>
              <line x1="41" y1="36" x2="53" y2="38" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" />
              <line x1="79" y1="36" x2="67" y2="38" stroke="#0a0a0f" strokeWidth="2" strokeLinecap="round" />
            </>
          )}
          {/* Sad brow lines */}
          {sad && (
            <>
              <line x1="41" y1="39" x2="53" y2="37" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="79" y1="39" x2="67" y2="37" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </g>
      );
  }
}

/* ── Mouth rendering ── */
function renderMouth(expr: AgentAvatarExpression, accent: string) {
  switch (expr) {
    case "happy":
      return (
        <path d="M 49 60 Q 54 67 60 67 Q 66 67 71 60" stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      );
    case "hyped":
      return (
        <g>
          <path d="M 47 58 Q 54 70 60 70 Q 66 70 73 58" stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 50 60 Q 60 68 70 60" fill={accent} opacity="0.15" />
        </g>
      );
    case "sad":
      return (
        <path d="M 50 65 Q 55 59 60 59 Q 65 59 70 65" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      );
    case "angry":
      return (
        <g>
          <path d="M 50 63 Q 55 58 60 58 Q 65 58 70 63" stroke={accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <line x1="48" y1="62" x2="52" y2="63" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="72" y1="62" x2="68" y2="63" stroke={accent} strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );
    case "bored":
      return (
        <line x1="52" y1="62" x2="68" y2="62" stroke={accent} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      );
    case "sleepy":
      return (
        <g>
          <path d="M 53 62 Q 57 64 60 64 Q 63 64 67 62" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" />
          {/* Z letters */}
          <text x="78" y="36" fill={accent} fontSize="8" fontWeight="bold" opacity="0.5">z</text>
          <text x="84" y="28" fill={accent} fontSize="6" fontWeight="bold" opacity="0.3">z</text>
        </g>
      );
    default:
      return (
        <path d="M 52 61 Q 56 63 60 63 Q 64 63 68 61" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
      );
  }
}

/* ── Antenna rendering ── */
function renderAntenna(type: string | undefined, accent: string) {
  switch (type) {
    case "dual":
      return (
        <g>
          <line x1="46" y1="22" x2="40" y2="8" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
          <circle cx="40" cy="7" r="3.5" fill={accent}>
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <line x1="74" y1="22" x2="80" y2="8" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
          <circle cx="80" cy="7" r="3.5" fill={accent}>
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" begin="0.5s" />
          </circle>
        </g>
      );
    case "dish":
      return (
        <g>
          <line x1="60" y1="20" x2="60" y2="8" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" />
          <path d="M 50 9 Q 60 2 70 9" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round">
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2.5s" repeatCount="indefinite" />
          </path>
          <circle cx="60" cy="8" r="2" fill={accent} />
        </g>
      );
    case "none":
      return null;
    default: // single
      return (
        <g>
          <line x1="60" y1="20" x2="60" y2="6" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="5" r="4" fill={accent}>
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>
      );
  }
}

/* ── Wing / propulsion rendering ── */
function renderWings(type: string | undefined, accent: string) {
  switch (type) {
    case "jets":
      return (
        <g>
          {/* Left wing */}
          <path d="M 32 46 L 18 40 L 16 48 Z" fill="#4b5563" />
          <path d="M 18 40 L 16 48" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="16" cy="52" rx="3" ry="5" fill={accent} opacity="0.4">
            <animate attributeName="ry" values="5;8;5" dur="0.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="0.4s" repeatCount="indefinite" />
          </ellipse>
          {/* Right wing */}
          <path d="M 88 46 L 102 40 L 104 48 Z" fill="#4b5563" />
          <path d="M 102 40 L 104 48" stroke={accent} strokeWidth="1.5" opacity="0.6" />
          <ellipse cx="104" cy="52" rx="3" ry="5" fill={accent} opacity="0.4">
            <animate attributeName="ry" values="5;8;5" dur="0.4s" repeatCount="indefinite" begin="0.1s" />
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="0.4s" repeatCount="indefinite" begin="0.1s" />
          </ellipse>
        </g>
      );
    case "hover":
      return (
        <g>
          <ellipse cx="60" cy="82" rx="28" ry="4" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.5" strokeDasharray="4 3">
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur="1.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="60" cy="86" rx="22" ry="3" fill="none" stroke={accent} strokeWidth="1" opacity="0.3" strokeDasharray="3 3">
            <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" begin="0.3s" />
          </ellipse>
        </g>
      );
    case "tiny":
      return (
        <g>
          <ellipse cx="26" cy="44" rx="10" ry="5" fill={accent} opacity="0.3" />
          <ellipse cx="94" cy="44" rx="10" ry="5" fill={accent} opacity="0.3" />
        </g>
      );
    default: // propeller
      return (
        <g>
          <line x1="60" y1="18" x2="60" y2="14" stroke="#6b7280" strokeWidth="2" />
          <g transform-origin="60 14">
            <line x1="42" y1="14" x2="78" y2="14" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
              <animateTransform attributeName="transform" type="rotate" from="0 60 14" to="360 60 14" dur="0.3s" repeatCount="indefinite" />
            </line>
          </g>
        </g>
      );
  }
}

/* ── Arms ── */
function renderArms(expr: AgentAvatarExpression, accent: string) {
  const waving = expr === "happy" || expr === "hyped";
  return (
    <g>
      {/* Left arm */}
      <line x1="34" y1="52" x2={waving ? "20" : "24"} y2={waving ? "38" : "62"} stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
      <circle cx={waving ? "20" : "24"} cy={waving ? "36" : "64"} r="4" fill={accent} opacity="0.7" />
      {/* Right arm */}
      <line x1="86" y1="52" x2={waving ? "100" : "96"} y2={waving ? "38" : "62"} stroke="#6b7280" strokeWidth="3" strokeLinecap="round" />
      <circle cx={waving ? "100" : "96"} cy={waving ? "36" : "64"} r="4" fill={accent} opacity="0.7" />
    </g>
  );
}

/* ── Cheek blush ── */
function renderCheeks(expr: AgentAvatarExpression) {
  if (expr !== "happy" && expr !== "hyped") return null;
  return (
    <g>
      <circle cx="38" cy="56" r="5" fill="#ff9999" opacity="0.25" />
      <circle cx="82" cy="56" r="5" fill="#ff9999" opacity="0.25" />
    </g>
  );
}

export function AgentAvatarSvg({
  config,
  expression = "happy",
  className = "",
  size,
}: AgentAvatarSvgProps) {
  const accent = getAccentHex(config?.accent);
  const chassis = config?.chassis ?? "round";
  const eyes = config?.eyes ?? "dual";
  const antenna = config?.antenna ?? "single";
  const wings = config?.wings ?? "propeller";

  return (
    <svg
      viewBox="0 0 120 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      data-testid="agent-avatar-svg"
    >
      <defs>
        {/* Glow filter for accent elements */}
        <filter id={`glow-${chassis}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Subtle shadow */}
        <filter id="chassis-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Floating animation group */}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0,0;0,-2;0,0" dur="3s" repeatCount="indefinite" />

        {/* Wings (behind body) */}
        {renderWings(wings, accent)}

        {/* Antenna (behind body for some types) */}
        {renderAntenna(antenna, accent)}

        {/* Arms */}
        {renderArms(expression, accent)}

        {/* Main chassis */}
        <path d={chassisPath(chassis)} fill="#1e1e2e" stroke="#2a2a3e" strokeWidth="1.5" filter="url(#chassis-shadow)" />

        {/* Accent panel overlay */}
        <path d={chassisPath(chassis)} fill={accent} opacity="0.07" />

        {/* Panel line details */}
        <line x1="42" y1="70" x2="78" y2="70" stroke={accent} strokeWidth="0.8" opacity="0.2" />
        <line x1="60" y1="70" x2="60" y2="78" stroke={accent} strokeWidth="0.8" opacity="0.15" />
        {/* Chest accent dot */}
        <circle cx="60" cy="72" r="2" fill={accent} opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="3s" repeatCount="indefinite" />
        </circle>

        {/* Eyes */}
        {renderEyes(eyes, expression, accent)}

        {/* Mouth */}
        {renderMouth(expression, accent)}

        {/* Cheek blush */}
        {renderCheeks(expression)}
      </g>
    </svg>
  );
}
