import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { RobotLogo } from "../brand/RobotLogo.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/*
  Onboarding intro — "Ignition" boot sequence.

  The screen opens on deep black (macOS-boot feel). A single seed of light
  ignites at center, the Code UX logo materialises out of the void, and thin
  colored glowing filaments draw themselves outward across the background like
  generative line art — each curve blooming from behind the logo and lighting
  a node at its tip. The wordmark resolves, then the whole stage hands off to
  the onboarding shell.

  TIMELINE (~5.85s total):
    0.00  black backdrop fades up                              (0.40s)
    0.18  center seed of light ignites                         (0.40s, back.out)
    0.50  logo materialises — scale-up + de-blur               (1.00s, expo.out)
          atmosphere + halo bloom behind it
    0.62  ignition ring pulses outward once                    (1.10s, power3.out)
    0.78  forehead jewel ignites, eyes snap open
    0.70  ── FILAMENT BLOOM ──
          ~36 glowing curves draw outward at a steady pen-pace
          (stroke dash + sine.inOut), each with a comet head
          riding the draw front and a node lighting at the tip (~4.0s cascade)
    1.05  antennae snap outward
    3.00  "WELCOME TO" small-caps reveals
    3.35  CodeUX wordmark — letter-spacing collapse + de-blur
    4.00  "Agentic Runtime" tagline
    5.00  ── HANDOFF: onExitStart fires ──
          stage scales 1 → 1.05 and fades, field fades, void fades
    5.85  onComplete fires — intro unmounts

  CONTINUOUS AMBIENT:
    - logo floats vertically (4.0s yoyo)
    - atmosphere breathes (3.4s yoyo)
    - filament field rotates a few degrees back and forth (very slow)
    - each filament shimmers in opacity once drawn (never in sync)
*/

interface OnboardingIntroProps {
    onExitStart?: () => void;
    onComplete?: () => void;
}

// ── Generative filament field ────────────────────────────────────────────────
// Full-screen SVG uses a 1000×1000 viewBox sliced to cover. Everything radiates
// from the center (500,500), emerging from behind the logo's halo.
const C = 500;
const TAU = Math.PI * 2;

// Deterministic pseudo-random so the composition is stable across renders.
const seeded = (n: number): number => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};

const JADE_PALETTE = ["#00E0A0", "#33FFB8", "#80FFD6", "#00C68F"];

interface Filament {
    d: string;
    color: string;
    width: number;
    baseOpacity: number;
    node: { x: number; y: number; r: number };
    drawDelay: number;
    drawDur: number;
    shimmer: number;
}

const buildFilaments = (): Filament[] => {
    const COUNT = 36;
    const list: Filament[] = [];
    for (let i = 0; i < COUNT; i++) {
        const s1 = seeded(i + 1);
        const s2 = seeded(i + 101);
        const s3 = seeded(i + 211);
        const s4 = seeded(i + 331);
        const angle = (i / COUNT) * TAU + (s1 - 0.5) * 0.2;
        // Alternating curl direction reads as organic, intentional art.
        const sweep = (0.32 + s2 * 0.55) * (i % 2 === 0 ? 1 : -1);
        const r0 = 30 + s1 * 52;
        const r1 = 320 + s3 * 340;
        const endAngle = angle + sweep;
        const sx = C + Math.cos(angle) * r0;
        const sy = C + Math.sin(angle) * r0;
        const ex = C + Math.cos(endAngle) * r1;
        const ey = C + Math.sin(endAngle) * r1;
        const c1r = r0 + (r1 - r0) * 0.34;
        const c2r = r0 + (r1 - r0) * 0.7;
        const c1a = angle + sweep * 0.26;
        const c2a = angle + sweep * 0.64;
        const c1x = C + Math.cos(c1a) * c1r;
        const c1y = C + Math.sin(c1a) * c1r;
        const c2x = C + Math.cos(c2a) * c2r;
        const c2y = C + Math.sin(c2a) * c2r;
        const isGold = i % 9 === 4; // sparse warm accents for contrast
        const color = isGold ? "#FFC24A" : JADE_PALETTE[i % JADE_PALETTE.length]!;
        list.push({
            d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`,
            color,
            width: 0.65 + s4 * 0.95,
            baseOpacity: 0.45 + s2 * 0.4,
            node: { x: ex, y: ey, r: 1.4 + s4 * 1.9 },
            drawDelay: 0.7 + i * 0.04,
            drawDur: 1.6 + s3 * 0.9,
            shimmer: 2.2 + s1 * 2.4,
        });
    }
    return list;
};

const FILAMENTS = buildFilaments();

export const OnboardingIntro: FunctionComponent<OnboardingIntroProps> = ({ onExitStart, onComplete }) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const vignetteRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const atmosphereRef = useRef<HTMLDivElement>(null);
    const haloRef = useRef<HTMLDivElement>(null);
    const seedRef = useRef<HTMLDivElement>(null);
    const ignitionRingRef = useRef<HTMLDivElement>(null);

    const fieldGroupRef = useRef<SVGGElement>(null);
    const coreRefs = useRef<Array<SVGPathElement | null>>(FILAMENTS.map(() => null));
    const glowRefs = useRef<Array<SVGPathElement | null>>(FILAMENTS.map(() => null));
    const nodeRefs = useRef<Array<SVGCircleElement | null>>(FILAMENTS.map(() => null));
    const cometRefs = useRef<Array<SVGCircleElement | null>>(FILAMENTS.map(() => null));

    const logoWrapperRef = useRef<HTMLDivElement>(null);
    const robotRef = useRef<HTMLDivElement>(null);

    const welcomeLabelRef = useRef<HTMLSpanElement>(null);
    const wordmarkRef = useRef<HTMLHeadingElement>(null);
    const taglineRef = useRef<HTMLSpanElement>(null);

    const onExitStartRef = useRef(onExitStart);
    const onCompleteRef = useRef(onComplete);
    onExitStartRef.current = onExitStart;
    onCompleteRef.current = onComplete;

    const reducedMotion = useReducedMotion();

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const cores = coreRefs.current.filter(Boolean) as SVGPathElement[];
            const glows = glowRefs.current.filter(Boolean) as SVGPathElement[];
            const nodes = nodeRefs.current.filter(Boolean) as SVGCircleElement[];

            // Prime every filament as an undrawn, full-length dash.
            [...cores, ...glows].forEach((path) => {
                gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
            });

            const robot = robotRef.current;
            const eyeLeft = robot?.querySelector<SVGGElement>("[data-cux-eye='left']") ?? null;
            const eyeRight = robot?.querySelector<SVGGElement>("[data-cux-eye='right']") ?? null;
            const jewel = robot?.querySelector<SVGGElement>("[data-cux-jewel]") ?? null;
            const antBall = robot?.querySelector<SVGGElement>("[data-cux-antenna-ball]") ?? null;
            const antLeft = robot?.querySelector<SVGPathElement>("[data-cux-antenna='left']") ?? null;
            const antRight = robot?.querySelector<SVGPathElement>("[data-cux-antenna='right']") ?? null;

            if (reducedMotion) {
                gsap.set([backdropRef.current, vignetteRef.current, atmosphereRef.current, haloRef.current, logoWrapperRef.current, welcomeLabelRef.current, wordmarkRef.current], {
                    opacity: 1,
                    scale: 1,
                    filter: "none",
                    y: 0,
                    letterSpacing: "-0.02em",
                });
                gsap.set(taglineRef.current, { opacity: 0.78 });
                cores.forEach((path, i) => gsap.set(path, { strokeDashoffset: 0, opacity: FILAMENTS[i]!.baseOpacity }));
                glows.forEach((path, i) => gsap.set(path, { strokeDashoffset: 0, opacity: FILAMENTS[i]!.baseOpacity * 0.5 }));
                nodes.forEach((node, i) => gsap.set(node, { opacity: 0.9, attr: { r: FILAMENTS[i]!.node.r } }));
                gsap.set([eyeLeft, eyeRight, jewel, antBall, antLeft, antRight].filter(Boolean), { opacity: 1, scale: 1, scaleY: 1 });
                gsap.delayedCall(1.2, () => onExitStartRef.current?.());
                gsap.delayedCall(1.6, () => onCompleteRef.current?.());
                return;
            }

            // ===== Continuous ambient motion =====
            gsap.to(atmosphereRef.current, { scale: 1.06, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
            gsap.to(logoWrapperRef.current, { y: -7, duration: 4.0, ease: "sine.inOut", yoyo: true, repeat: -1 });
            if (fieldGroupRef.current) {
                gsap.fromTo(
                    fieldGroupRef.current,
                    { rotation: -3, svgOrigin: "500 500" },
                    { rotation: 3, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1, svgOrigin: "500 500" },
                );
            }

            // Hide the "alive" parts of the robot up front.
            gsap.set([eyeLeft, eyeRight].filter(Boolean), { transformOrigin: "50% 50%", svgOrigin: "627 690", scaleY: 0, opacity: 0.92 });
            if (jewel) gsap.set(jewel, { transformOrigin: "50% 50%", svgOrigin: "628 400", scale: 0, opacity: 0 });
            if (antBall) gsap.set(antBall, { transformOrigin: "50% 50%", svgOrigin: "628 280", scaleY: 0, opacity: 0 });
            if (antLeft) gsap.set(antLeft, { transformOrigin: "50% 50%", svgOrigin: "525 326", scale: 0, opacity: 0 });
            if (antRight) gsap.set(antRight, { transformOrigin: "50% 50%", svgOrigin: "731 326", scale: 0, opacity: 0 });

            // ===== Master timeline =====
            const tl = gsap.timeline();

            // Void fades up
            tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
            tl.fromTo(vignetteRef.current, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: "power3.out" }, 0.05);

            // Seed of light ignites
            tl.fromTo(seedRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.6)" }, 0.18);

            // ===== 0.50s — Logo materialises out of the void =====
            tl.fromTo(
                logoWrapperRef.current,
                { opacity: 0, scale: 0.8, filter: "blur(16px)" },
                { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.0, ease: "expo.out", clearProps: "filter" },
                0.5,
            );
            tl.fromTo(atmosphereRef.current, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out" }, 0.5);
            tl.fromTo(haloRef.current, { opacity: 0, scale: 0.9 }, { opacity: 0.9, scale: 1, duration: 0.9, ease: "power3.out" }, 0.7);

            // Ignition ring pulse + seed dissolves into the logo
            tl.fromTo(ignitionRingRef.current, { scale: 0.3, opacity: 0.9 }, { scale: 2.5, opacity: 0, duration: 1.1, ease: "power3.out" }, 0.62);
            tl.to(seedRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, 0.72);

            // ===== 0.78s — Jewel ignition + eyes awaken =====
            if (jewel) {
                tl.to(jewel, { scale: 1.16, opacity: 1, duration: 0.3, ease: "back.out(3)" }, 0.78);
                tl.to(jewel, { scale: 1, duration: 0.42, ease: "power2.out" }, 1.08);
            }
            if (eyeLeft && eyeRight) {
                tl.to([eyeLeft, eyeRight], { scaleY: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)", stagger: 0.06 }, 0.9);
            }

            // ===== 1.05s — Antennae snap outward =====
            if (antBall) tl.to(antBall, { scaleY: 1, opacity: 1, duration: 0.42, ease: "back.out(2.6)" }, 1.05);
            if (antLeft) tl.to(antLeft, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.1);
            if (antRight) tl.to(antRight, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.1);

            // ===== 0.70s — FILAMENT BLOOM — glowing lines draw across the void =====
            // Each curve is drawn at a steady pen-pace (no front-loaded easing, so it
            // travels rather than pops), with a bright comet head riding the draw front
            // and a node lighting up where it lands.
            FILAMENTS.forEach((filament, i) => {
                const core = coreRefs.current[i];
                const glow = glowRefs.current[i];
                const node = nodeRefs.current[i];
                const comet = cometRefs.current[i];
                const targets = [core, glow].filter(Boolean) as SVGPathElement[];
                const totalLength = core?.getTotalLength() ?? 0;

                if (node) gsap.set(node, { opacity: 0, attr: { r: 0 } });
                if (comet) gsap.set(comet, { opacity: 0, cx: filament.node.x, cy: filament.node.y });

                if (targets.length) {
                    tl.to(targets, {
                        strokeDashoffset: 0,
                        duration: filament.drawDur,
                        ease: "sine.inOut",
                        onStart() {
                            if (comet) gsap.to(comet, { opacity: 1, duration: 0.25, ease: "power2.out" });
                        },
                        onUpdate() {
                            if (!comet || !core || totalLength === 0) return;
                            const point = core.getPointAtLength(this.progress() * totalLength);
                            comet.setAttribute("cx", point.x.toFixed(1));
                            comet.setAttribute("cy", point.y.toFixed(1));
                        },
                        onComplete() {
                            if (comet) gsap.to(comet, { opacity: 0, duration: 0.5, ease: "power2.in" });
                        },
                    }, filament.drawDelay);
                }
                if (node) {
                    tl.fromTo(
                        node,
                        { opacity: 0, attr: { r: 0 } },
                        { opacity: 0.95, attr: { r: filament.node.r }, duration: 0.5, ease: "back.out(2)" },
                        filament.drawDelay + filament.drawDur - 0.28,
                    );
                }
                // Once drawn, each line breathes — never in sync.
                if (core) {
                    gsap.to(core, {
                        opacity: filament.baseOpacity * 0.5,
                        duration: filament.shimmer,
                        ease: "sine.inOut",
                        yoyo: true,
                        repeat: -1,
                        delay: filament.drawDelay + filament.drawDur,
                    });
                }
            });

            // ===== Wordmark reveal =====
            tl.fromTo(
                welcomeLabelRef.current,
                { opacity: 0, y: 14, letterSpacing: "0.45em" },
                { opacity: 1, y: 0, letterSpacing: "0.32em", duration: 0.55, ease: "power2.out" },
                3.0,
            );
            tl.fromTo(
                wordmarkRef.current,
                { opacity: 0, y: 24, letterSpacing: "0.18em", filter: "blur(10px)" },
                { opacity: 1, y: 0, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 0.95, ease: "expo.out" },
                3.35,
            );
            tl.fromTo(taglineRef.current, { opacity: 0, y: 8 }, { opacity: 0.78, y: 0, duration: 0.5, ease: "power2.out" }, 4.0);

            // ===== 5.00s — Handoff =====
            tl.call(() => onExitStartRef.current?.(), undefined, 5.0);
            tl.to(stageRef.current, { opacity: 0, scale: 1.05, duration: 0.75, ease: "power2.inOut" }, 5.0);
            tl.to(fieldGroupRef.current, { opacity: 0, duration: 0.7, ease: "power2.inOut" }, 5.0);
            tl.to(backdropRef.current, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, 5.15);
            tl.call(() => onCompleteRef.current?.(), undefined, 5.85);
        });
        return () => ctx.revert();
    }, [reducedMotion]);

    const setCoreRef = (i: number) => (el: SVGPathElement | null) => { coreRefs.current[i] = el; };
    const setGlowRef = (i: number) => (el: SVGPathElement | null) => { glowRefs.current[i] = el; };
    const setNodeRef = (i: number) => (el: SVGCircleElement | null) => { nodeRefs.current[i] = el; };
    const setCometRef = (i: number) => (el: SVGCircleElement | null) => { cometRefs.current[i] = el; };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#020407]"
            style={{ opacity: 0 }}
            aria-hidden="true"
        >
            {/* Deep-space ground glow + vignette */}
            <div ref={vignetteRef} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 0 }}>
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(0,224,160,0.10) 0%, rgba(0,224,160,0.02) 38%, transparent 66%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 90% 80% at 50% 100%, rgba(255,184,0,0.04) 0%, transparent 52%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.72) 100%)" }}
                />
            </div>

            {/* Generative filament field — draws across the background like line art */}
            <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
            >
                <g ref={fieldGroupRef}>
                    {/* Soft blurred underlay for bloom */}
                    {FILAMENTS.map((filament, i) => (
                        <path
                            key={`glow-${i}`}
                            ref={setGlowRef(i)}
                            d={filament.d}
                            pathLength={1}
                            fill="none"
                            stroke={filament.color}
                            strokeWidth={filament.width * 3.4}
                            strokeLinecap="round"
                            style={{ opacity: filament.baseOpacity * 0.42, filter: "blur(3.5px)", mixBlendMode: "screen" }}
                        />
                    ))}
                    {/* Crisp core line */}
                    {FILAMENTS.map((filament, i) => (
                        <path
                            key={`core-${i}`}
                            ref={setCoreRef(i)}
                            d={filament.d}
                            pathLength={1}
                            fill="none"
                            stroke={filament.color}
                            strokeWidth={filament.width}
                            strokeLinecap="round"
                            style={{ opacity: filament.baseOpacity, filter: `drop-shadow(0 0 2px ${filament.color})`, mixBlendMode: "screen" }}
                        />
                    ))}
                    {/* Terminal nodes light up as each line finishes */}
                    {FILAMENTS.map((filament, i) => (
                        <circle
                            key={`node-${i}`}
                            ref={setNodeRef(i)}
                            cx={filament.node.x}
                            cy={filament.node.y}
                            r={0}
                            fill={filament.color}
                            style={{ filter: `drop-shadow(0 0 5px ${filament.color})`, opacity: 0, mixBlendMode: "screen" }}
                        />
                    ))}
                    {/* Comet heads ride the draw front of each line */}
                    {FILAMENTS.map((filament, i) => (
                        <circle
                            key={`comet-${i}`}
                            ref={setCometRef(i)}
                            cx={filament.node.x}
                            cy={filament.node.y}
                            r={2.4}
                            fill="#EAFFF6"
                            style={{ filter: `drop-shadow(0 0 6px ${filament.color}) drop-shadow(0 0 3px #ffffff)`, opacity: 0, mixBlendMode: "screen" }}
                        />
                    ))}
                </g>
            </svg>

            {/* Center stage */}
            <div ref={stageRef} className="relative z-10 flex flex-col items-center" style={{ willChange: "transform, opacity" }}>
                <div
                    ref={logoWrapperRef}
                    className="relative mb-14 flex h-[280px] w-[280px] items-center justify-center"
                    style={{ willChange: "transform, opacity, filter", opacity: 0 }}
                >
                    {/* Atmosphere — large soft jade halo */}
                    <div
                        ref={atmosphereRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 460,
                            height: 460,
                            background: "radial-gradient(circle, rgba(0,224,160,0.40) 0%, rgba(0,224,160,0.13) 30%, rgba(0,224,160,0.04) 55%, transparent 75%)",
                            filter: "blur(8px)",
                            opacity: 0,
                        }}
                    />

                    {/* Inner halo — tighter ring around the head */}
                    <div
                        ref={haloRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 280,
                            height: 280,
                            background: "radial-gradient(circle, rgba(128,255,214,0.32) 0%, rgba(0,224,160,0.16) 38%, transparent 70%)",
                            filter: "blur(4px)",
                            opacity: 0,
                        }}
                    />

                    {/* Ignition ring — single clean pulse at logo reveal */}
                    <div
                        ref={ignitionRingRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full border border-signal-500/70"
                        style={{
                            width: 220,
                            height: 220,
                            boxShadow: "inset 0 0 30px rgba(0,224,160,0.35), 0 0 30px rgba(0,224,160,0.32)",
                            opacity: 0,
                        }}
                    />

                    {/* Seed of light */}
                    <div
                        ref={seedRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 18,
                            height: 18,
                            background: "radial-gradient(circle, rgba(180,255,228,1) 0%, rgba(0,224,160,0.7) 45%, transparent 75%)",
                            boxShadow: "0 0 24px rgba(0,224,160,0.85), 0 0 48px rgba(0,224,160,0.45)",
                            opacity: 0,
                        }}
                    />

                    {/* Robot logo */}
                    <div ref={robotRef} className="relative z-10">
                        <RobotLogo size={220} idle={false} active={false} rounded={true} withGlow={false} title="Code UX" />
                        {/* Thin signal beam at antenna ball */}
                        <div
                            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                            style={{ top: -28, width: 1, height: 32, background: "linear-gradient(to bottom, transparent 0%, rgba(0,224,160,0.6) 100%)" }}
                            aria-hidden="true"
                        />
                    </div>
                </div>

                <div className="flex flex-col items-center gap-3 text-center">
                    <span
                        ref={welcomeLabelRef}
                        className="font-mono text-[11px] font-bold uppercase text-signal-500"
                        style={{ opacity: 0, letterSpacing: "0.45em" }}
                    >
                        Welcome to
                    </span>

                    <h1
                        ref={wordmarkRef}
                        className="font-display text-6xl font-black leading-none text-white md:text-7xl"
                        style={{ opacity: 0, letterSpacing: "0.15em" }}
                    >
                        Code<span className="text-signal-500">UX</span>
                    </h1>

                    <span ref={taglineRef} className="mt-2 text-sm font-medium tracking-[0.04em] text-white" style={{ opacity: 0 }}>
                        Agentic Runtime
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OnboardingIntro;
