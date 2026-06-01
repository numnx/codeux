import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { RobotLogo } from "../brand/RobotLogo.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/*
  Onboarding intro — Immersive generative line-art boot sequence.
  Centered perfectly around the logo on absolute black, with sweeping vibrant filaments.
*/

interface OnboardingIntroProps {
    onExitStart?: () => void;
    onComplete?: () => void;
}

const C = 500;
const TAU = Math.PI * 2;

// Deterministic pseudo-random so the composition is stable across renders.
const seeded = (n: number): number => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
};

const NEON_PALETTE = [
  "#00E0A0", // Signal Jade (Primary Accent)
  "#00F0FF", // Neon Cyan
  "#7B2CBF", // Electric Purple
  "#FF007F", // Neon Rose
  "#FFB800", // Warm Ember
  "#39FF14", // Neon Green
];

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
    const COUNT = 48; // Detailed canvas of sweeping tendrils
    const list: Filament[] = [];
    for (let i = 0; i < COUNT; i++) {
        const s1 = seeded(i + 1);
        const s2 = seeded(i + 101);
        const s3 = seeded(i + 211);
        const s4 = seeded(i + 331);
        
        // Even distribution around the center point
        const angle = (i / COUNT) * TAU + (s1 - 0.5) * 0.15;
        
        // Alternating sweep direction creates beautiful overlapping curves
        const sweep = (0.45 + s2 * 0.95) * (i % 2 === 0 ? 1 : -1);
        
        // Start radius hidden under the logo
        const r0 = 40 + s1 * 40;
        
        // End radius sweeping far across the screen
        const r1 = 380 + s3 * 420;
        
        const endAngle = angle + sweep;
        
        const sx = C + Math.cos(angle) * r0;
        const sy = C + Math.sin(angle) * r0;
        const ex = C + Math.cos(endAngle) * r1;
        const ey = C + Math.sin(endAngle) * r1;
        
        // Sweeping Bezier control paths for high elegance
        const c1r = r0 + (r1 - r0) * 0.38;
        const c2r = r0 + (r1 - r0) * 0.72;
        const c1a = angle + sweep * 0.3;
        const c2a = angle + sweep * 0.7;
        
        const c1x = C + Math.cos(c1a) * c1r;
        const c1y = C + Math.sin(c1a) * c1r;
        const c2x = C + Math.cos(c2a) * c2r;
        const c2y = C + Math.sin(c2a) * c2r;
        
        const isAccent = i % 7 === 3;
        const color = isAccent ? "#FFB800" : NEON_PALETTE[i % NEON_PALETTE.length]!;
        
        list.push({
            d: `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`,
            color,
            width: 0.35 + s4 * 0.65, // super fine lines
            baseOpacity: 0.55 + s2 * 0.35,
            node: { x: ex, y: ey, r: 1.2 + s4 * 1.5 },
            drawDelay: 0.6 + i * 0.07, // elegant progressive draw
            drawDur: 3.2 + s3 * 1.8, // beautiful slow build
            shimmer: 3.0 + s1 * 3.0,
        });
    }
    return list;
};

const FILAMENTS = buildFilaments();

function primePathForDraw(path: SVGPathElement): number {
    const length = Math.max(1, path.getTotalLength());
    gsap.set(path, {
        strokeDasharray: length,
        strokeDashoffset: length,
        opacity: 0,
    });
    return length;
}

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

            // Prime filaments with real SVG path lengths so they draw from the
            // center outward instead of appearing as already-painted lines.
            const coreLengths = cores.map(primePathForDraw);
            const glowLengths = glows.map(primePathForDraw);

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
                cores.forEach((path, i) => gsap.set(path, { strokeDasharray: coreLengths[i], strokeDashoffset: 0, opacity: FILAMENTS[i]!.baseOpacity }));
                glows.forEach((path, i) => gsap.set(path, { strokeDasharray: glowLengths[i], strokeDashoffset: 0, opacity: FILAMENTS[i]!.baseOpacity * 0.5 }));
                nodes.forEach((node, i) => gsap.set(node, { opacity: 0.9, attr: { r: FILAMENTS[i]!.node.r } }));
                gsap.set([eyeLeft, eyeRight, jewel, antBall, antLeft, antRight].filter(Boolean), { opacity: 1, scale: 1, scaleY: 1 });
                gsap.delayedCall(1.2, () => onExitStartRef.current?.());
                gsap.delayedCall(1.6, () => onCompleteRef.current?.());
                return;
            }

            // ===== Ambient animations =====
            gsap.to(atmosphereRef.current, { scale: 1.06, duration: 3.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
            gsap.to(logoWrapperRef.current, { y: -7, duration: 4.0, ease: "sine.inOut", yoyo: true, repeat: -1 });
            if (fieldGroupRef.current) {
                gsap.fromTo(
                    fieldGroupRef.current,
                    { rotation: -3, svgOrigin: "500 500" },
                    { rotation: 3, duration: 26, ease: "sine.inOut", yoyo: true, repeat: -1, svgOrigin: "500 500" },
                );
            }

            // Hide raw robot components
            gsap.set([eyeLeft, eyeRight].filter(Boolean), { transformOrigin: "50% 50%", svgOrigin: "627 690", scaleY: 0, opacity: 0.92 });
            if (jewel) gsap.set(jewel, { transformOrigin: "50% 50%", svgOrigin: "628 400", scale: 0, opacity: 0 });
            if (antBall) gsap.set(antBall, { transformOrigin: "50% 50%", svgOrigin: "628 280", scaleY: 0, opacity: 0 });
            if (antLeft) gsap.set(antLeft, { transformOrigin: "50% 50%", svgOrigin: "525 326", scale: 0, opacity: 0 });
            if (antRight) gsap.set(antRight, { transformOrigin: "50% 50%", svgOrigin: "731 326", scale: 0, opacity: 0 });

            const tl = gsap.timeline();

            // Void black overlay reveal
            tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" }, 0);
            tl.fromTo(vignetteRef.current, { opacity: 0 }, { opacity: 1, duration: 1.1, ease: "power3.out" }, 0.05);

            // Light seed ignition
            tl.fromTo(seedRef.current, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.6)" }, 0.18);

            // Logo materialisation
            tl.fromTo(
                logoWrapperRef.current,
                { opacity: 0, scale: 0.8, filter: "blur(16px)" },
                { opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.0, ease: "expo.out", clearProps: "filter" },
                0.5,
            );
            tl.fromTo(atmosphereRef.current, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out" }, 0.5);
            tl.fromTo(haloRef.current, { opacity: 0, scale: 0.9 }, { opacity: 0.9, scale: 1, duration: 0.9, ease: "power3.out" }, 0.7);

            // Seed merges & ignition pulse
            tl.fromTo(ignitionRingRef.current, { scale: 0.3, opacity: 0.9 }, { scale: 2.5, opacity: 0, duration: 1.1, ease: "power3.out" }, 0.62);
            tl.to(seedRef.current, { opacity: 0, duration: 0.5, ease: "power2.in" }, 0.72);

            // Awake eyes & forehead jewel
            if (jewel) {
                tl.to(jewel, { scale: 1.16, opacity: 1, duration: 0.3, ease: "back.out(3)" }, 0.78);
                tl.to(jewel, { scale: 1, duration: 0.42, ease: "power2.out" }, 1.08);
            }
            if (eyeLeft && eyeRight) {
                tl.to([eyeLeft, eyeRight], { scaleY: 1, opacity: 1, duration: 0.5, ease: "back.out(2.4)", stagger: 0.06 }, 0.9);
            }

            // Antennas snap
            if (antBall) tl.to(antBall, { scaleY: 1, opacity: 1, duration: 0.42, ease: "back.out(2.6)" }, 1.05);
            if (antLeft) tl.to(antLeft, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.1);
            if (antRight) tl.to(antRight, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.1);

            // Draw line-art filaments
            FILAMENTS.forEach((filament, i) => {
                const core = coreRefs.current[i];
                const glow = glowRefs.current[i];
                const node = nodeRefs.current[i];
                const comet = cometRefs.current[i];
                const totalLength = core?.getTotalLength() ?? 0;

                if (node) gsap.set(node, { opacity: 0, attr: { r: 0 } });
                if (comet) gsap.set(comet, { opacity: 0, cx: filament.node.x, cy: filament.node.y });

                if (core) {
                    tl.to(core, {
                        strokeDashoffset: 0,
                        opacity: filament.baseOpacity,
                        duration: filament.drawDur,
                        ease: "none",
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
                if (glow) {
                    tl.to(glow, {
                        strokeDashoffset: 0,
                        opacity: filament.baseOpacity * 0.35,
                        duration: filament.drawDur,
                        ease: "none",
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

            // Wordmark reveal timings
            tl.fromTo(
                welcomeLabelRef.current,
                { opacity: 0, y: 14, letterSpacing: "0.45em" },
                { opacity: 1, y: 0, letterSpacing: "0.32em", duration: 0.55, ease: "power2.out" },
                3.8,
            );
            tl.fromTo(
                wordmarkRef.current,
                { opacity: 0, y: 24, letterSpacing: "0.18em", filter: "blur(10px)" },
                { opacity: 1, y: 0, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 0.95, ease: "expo.out" },
                4.25,
            );
            tl.fromTo(taglineRef.current, { opacity: 0, y: 8 }, { opacity: 0.78, y: 0, duration: 0.5, ease: "power2.out" }, 5.0);

            // Immersive clean exit and dashboard handoff
            tl.call(() => onExitStartRef.current?.(), undefined, 7.2);
            tl.to(stageRef.current, { opacity: 0, scale: 1.05, duration: 0.75, ease: "power2.inOut" }, 7.2);
            tl.to(fieldGroupRef.current, { opacity: 0, duration: 0.7, ease: "power2.inOut" }, 7.2);
            tl.to(backdropRef.current, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, 7.35);
            tl.call(() => onCompleteRef.current?.(), undefined, 8.0);
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
            className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#000000]"
            style={{ opacity: 0 }}
            aria-hidden="true"
        >
            {/* Deep-space ambient ground glow & vignette */}
            <div ref={vignetteRef} aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: 0 }}>
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(0,224,160,0.12) 0%, rgba(0,224,160,0.02) 40%, transparent 70%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(ellipse 90% 80% at 50% 100%, rgba(255,184,0,0.04) 0%, transparent 52%)" }}
                />
                <div
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(circle at 50% 50%, transparent 35%, rgba(0,0,0,0.85) 100%)" }}
                />
            </div>

            {/* Generative filament field - perfect absolute centering */}
            <svg
                viewBox="0 0 1000 1000"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
            >
                <g ref={fieldGroupRef}>
                    {/* Soft blurred underlay for immersive glow */}
                    {FILAMENTS.map((filament, i) => (
                        <path
                            key={`glow-${i}`}
                            ref={setGlowRef(i)}
                            d={filament.d}
                            fill="none"
                            stroke={filament.color}
                            strokeWidth={filament.width * 5.0}
                            strokeLinecap="round"
                            style={{ opacity: filament.baseOpacity * 0.35, filter: "blur(6px)", mixBlendMode: "screen" }}
                        />
                    ))}
                    {/* Crisp core lines */}
                    {FILAMENTS.map((filament, i) => (
                        <path
                            key={`core-${i}`}
                            ref={setCoreRef(i)}
                            d={filament.d}
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
                    {/* Comet heads riding the draw front */}
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

            {/* Centered stage */}
            <div ref={stageRef} className="relative z-10 flex flex-col items-center justify-center" style={{ willChange: "transform, opacity" }}>
                <div
                    ref={logoWrapperRef}
                    className="relative flex h-[280px] w-[280px] items-center justify-center animate-pulse-slow"
                    style={{ willChange: "transform, opacity, filter", opacity: 0 }}
                >
                    {/* Atmosphere halo */}
                    <div
                        ref={atmosphereRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 460,
                            height: 460,
                            background: "radial-gradient(circle, rgba(0,224,160,0.42) 0%, rgba(0,224,160,0.13) 30%, rgba(0,224,160,0.04) 55%, transparent 75%)",
                            filter: "blur(8px)",
                            opacity: 0,
                        }}
                    />

                    {/* Inner tighter halo */}
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

                    {/* Pulse Ring */}
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

                    {/* Central seed of light */}
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

                    {/* Robot logo - perfectly aligned at 0,0 center of screen */}
                    <div ref={robotRef} className="relative z-10">
                        <RobotLogo size={220} idle={false} active={false} rounded={true} withGlow={false} title="Code UX" />
                        <div
                            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                            style={{ top: -28, width: 1, height: 32, background: "linear-gradient(to bottom, transparent 0%, rgba(0,224,160,0.6) 100%)" }}
                            aria-hidden="true"
                        />
                    </div>
                </div>

                {/* Absolutely positioned text block to prevent logo offset shift */}
                <div className="absolute top-[190px] flex flex-col items-center gap-2 text-center w-[400px] min-w-[320px]">
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
