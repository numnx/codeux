import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import gsap from "gsap";
import { Atom } from "../brand/Atom.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/*
  Onboarding intro — the macOS-feel first-touch sequence.

  TIMELINE (5.05s total):
    0.00  backdrop fade-in                           (0.55s, power2.out)
    0.05  vignette resolves                          (1.3s, power3.out)
    0.10  atmosphere glow builds                     (1.4s, power3.out)
    0.40  atom container scales in, idle state       (1.0s, expo.out)
    1.40  ── ACTIVATION MOMENT ──
          atom.active = true (Atom's own choreography engages)
          burst ring expands outward                 (1.0s, power3.out)
          inner flash blooms + dissipates            (0.85s, power4.out)
          atmosphere flares brighter, then settles
    2.50  "WELCOME TO" small-caps                    (0.6s, power2.out)
    2.75  CodeUX wordmark — letter-spacing collapse  (0.95s, expo.out)
    3.45  "Agentic Runtime" tagline                  (0.55s, power2.out)
    4.30  ── HANDOFF: onExitStart fires ──
          stage scales 1 → 1.08 + fades              (0.85s)
          backdrop fades to transparent              (0.75s)
    5.05  onComplete fires — intro unmounts

  CONTINUOUS AMBIENT (independent of master timeline, runs throughout):
    - atmosphere gently pulses (3.2s yoyo, sine.inOut)
    - atom container floats vertically (4s yoyo, sine.inOut)
*/

interface OnboardingIntroProps {
    onExitStart?: () => void;
    onComplete?: () => void;
}

export const OnboardingIntro: FunctionComponent<OnboardingIntroProps> = ({ onExitStart, onComplete }) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const atmosphereRef = useRef<HTMLDivElement>(null);
    const burstRingRef = useRef<HTMLDivElement>(null);
    const innerBurstRef = useRef<HTMLDivElement>(null);
    const atomContainerRef = useRef<HTMLDivElement>(null);
    const welcomeLabelRef = useRef<HTMLSpanElement>(null);
    const wordmarkRef = useRef<HTMLHeadingElement>(null);
    const taglineRef = useRef<HTMLSpanElement>(null);
    const vignetteRef = useRef<HTMLDivElement>(null);

    const reducedMotion = useReducedMotion();
    const [atomActive, setAtomActive] = useState(false);

    // Stable refs for callbacks — prevents the main timeline from being torn
    // down when parent re-renders create new function references.
    const onExitStartRef = useRef(onExitStart);
    const onCompleteRef = useRef(onComplete);
    onExitStartRef.current = onExitStart;
    onCompleteRef.current = onComplete;

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            if (reducedMotion) {
                gsap.set(
                    [
                        backdropRef.current,
                        vignetteRef.current,
                        atmosphereRef.current,
                        atomContainerRef.current,
                        welcomeLabelRef.current,
                        wordmarkRef.current,
                        taglineRef.current,
                    ],
                    { opacity: 1, scale: 1, filter: "none", y: 0, letterSpacing: "-0.02em" },
                );
                gsap.set(taglineRef.current, { opacity: 0.75 });
                setAtomActive(true);
                gsap.delayedCall(1.2, () => onExitStartRef.current?.());
                gsap.delayedCall(1.6, () => onCompleteRef.current?.());
                return;
            }

            // ─── Continuous ambient motion (runs throughout) ──────────
            gsap.to(atmosphereRef.current, {
                scale: 1.06,
                duration: 3.2,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });
            gsap.to(atomContainerRef.current, {
                y: -6,
                duration: 4.0,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });

            // ─── Master timeline ──────────────────────────────────────
            const tl = gsap.timeline();

            // Backdrop fades in
            tl.fromTo(
                backdropRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.55, ease: "power2.out" },
                0,
            );

            // Vignette resolves
            tl.fromTo(
                vignetteRef.current,
                { opacity: 0, scale: 1.14 },
                { opacity: 1, scale: 1, duration: 1.3, ease: "power3.out" },
                0.05,
            );

            // Atmosphere glow builds — large, dim → bright halo
            tl.fromTo(
                atmosphereRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 1.4, ease: "power3.out" },
                0.1,
            );

            // Atom enters — clean scale, no blur. The eye is born.
            tl.fromTo(
                atomContainerRef.current,
                { opacity: 0, scale: 0.62 },
                { opacity: 1, scale: 1, duration: 1.0, ease: "expo.out" },
                0.4,
            );

            // ─── 1.4s — ACTIVATION MOMENT ─────────────────────────────
            // The atom transitions to atomic mode AT THE SAME TIME as a
            // visible burst expands outward — making it a single event
            // rather than two separate moments.
            tl.call(() => setAtomActive(true), undefined, 1.4);

            // Outer burst ring — expands and fades
            tl.fromTo(
                burstRingRef.current,
                { scale: 0.42, opacity: 0.9 },
                { scale: 2.8, opacity: 0, duration: 1.0, ease: "power3.out" },
                1.4,
            );

            // Inner flash — brighter, smaller, faster (the ignition spark)
            tl.fromTo(
                innerBurstRef.current,
                { scale: 0.28, opacity: 0.95 },
                { scale: 2.4, opacity: 0, duration: 0.85, ease: "power4.out" },
                1.4,
            );

            // Atmosphere flares brighter, then settles
            tl.to(
                atmosphereRef.current,
                { opacity: 1.4, duration: 0.6, ease: "power3.out", overwrite: false },
                1.4,
            );
            tl.to(
                atmosphereRef.current,
                { opacity: 1, duration: 0.9, ease: "power2.inOut", overwrite: false },
                2.0,
            );

            // ─── 2.5s — Wordmark reveal ───────────────────────────────
            tl.fromTo(
                welcomeLabelRef.current,
                { opacity: 0, y: 14, letterSpacing: "0.45em" },
                { opacity: 1, y: 0, letterSpacing: "0.32em", duration: 0.6, ease: "power2.out" },
                2.5,
            );

            tl.fromTo(
                wordmarkRef.current,
                { opacity: 0, y: 26, letterSpacing: "0.15em", filter: "blur(8px)" },
                { opacity: 1, y: 0, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 0.95, ease: "expo.out" },
                2.75,
            );

            tl.fromTo(
                taglineRef.current,
                { opacity: 0, y: 8 },
                { opacity: 0.75, y: 0, duration: 0.55, ease: "power2.out" },
                3.45,
            );

            // ─── 4.30s — Exit handoff ─────────────────────────────────
            tl.call(() => onExitStartRef.current?.(), undefined, 4.3);

            tl.to(
                stageRef.current,
                { opacity: 0, scale: 1.08, duration: 0.85, ease: "power2.inOut" },
                4.3,
            );

            tl.to(
                backdropRef.current,
                { opacity: 0, duration: 0.75, ease: "power2.inOut" },
                4.5,
            );

            tl.call(() => onCompleteRef.current?.(), undefined, 5.05);
        });
        return () => ctx.revert();
    }, [reducedMotion]);

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#05080B]"
            style={{ opacity: 0 }}
            aria-hidden="true"
        >
            {/* Dimensional backdrop — warm void with subtle brand wash */}
            <div
                ref={vignetteRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ opacity: 0 }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 60% at 50% 45%, rgba(0,224,160,0.10) 0%, rgba(0,224,160,0.025) 35%, transparent 65%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,184,0,0.06) 0%, transparent 55%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,0.55) 100%)",
                    }}
                />
            </div>

            {/* Center stage */}
            <div
                ref={stageRef}
                className="relative z-10 flex flex-col items-center"
                style={{ willChange: "transform, opacity" }}
            >
                {/* Atom assembly — atmosphere + burst layers + atom */}
                <div className="relative mb-12 flex h-[220px] w-[220px] items-center justify-center text-white/55">
                    {/* Atmosphere glow — large soft jade halo, extends well beyond atom */}
                    <div
                        ref={atmosphereRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 380,
                            height: 380,
                            background:
                                "radial-gradient(circle, rgba(0,224,160,0.38) 0%, rgba(0,224,160,0.14) 28%, rgba(0,224,160,0.04) 52%, transparent 72%)",
                            filter: "blur(6px)",
                            opacity: 0,
                        }}
                    />

                    {/* Outer burst ring — expands outward at activation moment */}
                    <div
                        ref={burstRingRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full border border-signal-500/65"
                        style={{
                            width: 168,
                            height: 168,
                            boxShadow:
                                "inset 0 0 36px rgba(0,224,160,0.4), 0 0 28px rgba(0,224,160,0.3)",
                            opacity: 0,
                        }}
                    />

                    {/* Inner flash — brighter, smaller burst centered on nucleus */}
                    <div
                        ref={innerBurstRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 96,
                            height: 96,
                            background:
                                "radial-gradient(circle, rgba(128,255,214,0.85) 0%, rgba(0,224,160,0.4) 38%, transparent 70%)",
                            filter: "blur(4px)",
                            opacity: 0,
                        }}
                    />

                    {/* The atom itself */}
                    <div
                        ref={atomContainerRef}
                        className="relative z-10"
                        style={{ willChange: "transform, opacity" }}
                    >
                        <Atom size={156} active={atomActive} intensity="cinematic" title="Code UX" />
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

                    <span
                        ref={taglineRef}
                        className="mt-2 text-sm font-medium tracking-[0.04em] text-white"
                        style={{ opacity: 0 }}
                    >
                        Agentic Runtime
                    </span>
                </div>
            </div>
        </div>
    );
};

export default OnboardingIntro;
