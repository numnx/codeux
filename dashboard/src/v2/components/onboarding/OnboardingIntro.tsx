import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { RobotLogo } from "../brand/RobotLogo.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/*
  Onboarding intro — Sentinel boot sequence.

  TIMELINE (5.10s total):
    0.00  void backdrop fades in                          (0.55s, power2.out)
    0.05  cinematic vignette resolves                     (1.20s, power3.out)
    0.20  HUD reticle + corner brackets stencil in        (0.70s, power3.out)
    0.45  vertical scan line sweeps down across stage     (1.10s, expo.inOut)
    0.75  ── CHASSIS REVEAL ──
          logo clip-path sweeps top→bottom (chassis)      (0.85s, expo.out)
          atmosphere halo blooms                          (1.20s, power3.out)
    1.55  antennae snap outward (left + right tilt-lines) (0.45s, back.out)
    1.80  forehead jewel ignites                          (0.35s, back.out)
          inner flash pulse                               (0.80s, power4.out)
    2.10  ── AWAKEN ──
          eyes snap open (scaleY 0 → 1 with overshoot)    (0.55s, back.out)
          sonar burst ring expands outward                (1.10s, power3.out)
          secondary shockwave                             (0.95s, power4.out)
    2.85  orbital rings fade in around the head           (0.65s, power2.out)
          three satellites whip around the orbits         (continuous)
    3.20  acknowledgement double-blink                    (0.40s)
    3.50  "WELCOME TO" small-caps reveals                 (0.55s, power2.out)
    3.80  CodeUX wordmark — letter-spacing collapse       (0.95s, expo.out)
    4.45  "Agentic Runtime" tagline                       (0.50s, power2.out)
    4.95  ── HANDOFF: onExitStart fires ──
          stage scales 1 → 1.06, fades                    (0.75s)
          backdrop fades to transparent                   (0.65s)
    5.70  onComplete fires — intro unmounts

  CONTINUOUS AMBIENT (independent of master timeline):
    - atmosphere gently pulses (3.2s yoyo, sine.inOut)
    - stage floats vertically (4.0s yoyo, sine.inOut)
    - sonar pulse rings repeat every ~1.6s
    - three orbital satellites: 4.6s / 3.4s / 5.8s — never sync
*/

interface OnboardingIntroProps {
    onExitStart?: () => void;
    onComplete?: () => void;
}

// SVG orbit layer is 480x480, centered at (240, 240).
const ORBITS = [
    { rx: 215, ry: 138, rotation: 0, period: 4.6, phase: 0.08, satR: 4.5, color: "#00E0A0", strokeOpacity: 0.32 },
    { rx: 205, ry: 76, rotation: 58, period: 3.4, phase: 0.43, satR: 3.6, color: "#80FFD6", strokeOpacity: 0.30 },
    { rx: 188, ry: 96, rotation: -42, period: 5.8, phase: 0.77, satR: 3.9, color: "#33FFB8", strokeOpacity: 0.28 },
] as const;

export const OnboardingIntro: FunctionComponent<OnboardingIntroProps> = ({ onExitStart, onComplete }) => {
    const backdropRef = useRef<HTMLDivElement>(null);
    const vignetteRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);
    const atmosphereRef = useRef<HTMLDivElement>(null);
    const haloRef = useRef<HTMLDivElement>(null);
    const sonarOneRef = useRef<HTMLDivElement>(null);
    const sonarTwoRef = useRef<HTMLDivElement>(null);
    const sonarThreeRef = useRef<HTMLDivElement>(null);
    const burstRingRef = useRef<HTMLDivElement>(null);
    const shockwaveRef = useRef<HTMLDivElement>(null);
    const innerBurstRef = useRef<HTMLDivElement>(null);
    const scanLineRef = useRef<HTMLDivElement>(null);
    const reticleRef = useRef<HTMLDivElement>(null);
    const cornerRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null]);

    const logoWrapperRef = useRef<HTMLDivElement>(null);
    const robotChassisRef = useRef<HTMLDivElement>(null);
    const robotRef = useRef<HTMLDivElement>(null);

    const orbitRingRefs = useRef<Array<SVGEllipseElement | null>>([null, null, null]);
    const satelliteRefs = useRef<Array<SVGCircleElement | null>>([null, null, null]);

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
            if (reducedMotion) {
                gsap.set(
                    [
                        backdropRef.current,
                        vignetteRef.current,
                        atmosphereRef.current,
                        haloRef.current,
                        reticleRef.current,
                        logoWrapperRef.current,
                        robotChassisRef.current,
                        welcomeLabelRef.current,
                        wordmarkRef.current,
                        taglineRef.current,
                    ],
                    { opacity: 1, scale: 1, filter: "none", y: 0, letterSpacing: "-0.02em", clipPath: "inset(0)" },
                );
                gsap.set(taglineRef.current, { opacity: 0.75 });
                gsap.delayedCall(1.2, () => onExitStartRef.current?.());
                gsap.delayedCall(1.6, () => onCompleteRef.current?.());
                return;
            }

            // ===== Continuous ambient motion =====
            gsap.to(atmosphereRef.current, {
                scale: 1.07,
                duration: 3.2,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });
            gsap.to(logoWrapperRef.current, {
                y: -6,
                duration: 4.0,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1,
            });

            // Sonar pulse rings — start after the awaken moment
            [sonarOneRef, sonarTwoRef, sonarThreeRef].forEach((r, i) => {
                if (!r.current) return;
                gsap.set(r.current, { opacity: 0, scale: 0.4 });
                gsap.to(r.current, {
                    keyframes: [
                        { scale: 0.4, opacity: 0, duration: 0 },
                        { scale: 0.55, opacity: 0.7, duration: 0.15 },
                        { scale: 2.4, opacity: 0, duration: 1.55, ease: "power2.out" },
                    ],
                    repeat: -1,
                    repeatDelay: 0.05,
                    delay: 2.3 + i * 0.55,
                });
            });

            // Orbital satellites — three parametric tweens, started later
            ORBITS.forEach((orbit, i) => {
                const sat = satelliteRefs.current[i];
                if (!sat) return;
                gsap.set(sat, { opacity: 0 });
                const proxy = { t: orbit.phase * Math.PI * 2 };
                const cosR = Math.cos((orbit.rotation * Math.PI) / 180);
                const sinR = Math.sin((orbit.rotation * Math.PI) / 180);
                gsap.to(proxy, {
                    t: `+=${Math.PI * 2}`,
                    duration: orbit.period,
                    ease: "none",
                    repeat: -1,
                    onUpdate: () => {
                        const localX = orbit.rx * Math.cos(proxy.t);
                        const localY = orbit.ry * Math.sin(proxy.t);
                        const x = 240 + localX * cosR - localY * sinR;
                        const y = 240 + localX * sinR + localY * cosR;
                        sat.setAttribute("cx", x.toFixed(2));
                        sat.setAttribute("cy", y.toFixed(2));
                    },
                });
            });

            // Pre-set the parts we'll choreograph from the robot logo
            const robot = robotRef.current;
            const eyeLeft = robot?.querySelector<SVGGElement>("[data-cux-eye='left']") ?? null;
            const eyeRight = robot?.querySelector<SVGGElement>("[data-cux-eye='right']") ?? null;
            const jewel = robot?.querySelector<SVGGElement>("[data-cux-jewel]") ?? null;
            const antBall = robot?.querySelector<SVGGElement>("[data-cux-antenna-ball]") ?? null;
            const antLeft = robot?.querySelector<SVGPathElement>("[data-cux-antenna='left']") ?? null;
            const antRight = robot?.querySelector<SVGPathElement>("[data-cux-antenna='right']") ?? null;

            // Hide all "alive" parts up front
            gsap.set([eyeLeft, eyeRight].filter(Boolean), { transformOrigin: "50% 50%", svgOrigin: "627 690", scaleY: 0, opacity: 0.92 });
            if (jewel) gsap.set(jewel, { transformOrigin: "50% 50%", svgOrigin: "628 400", scale: 0, opacity: 0 });
            if (antBall) gsap.set(antBall, { transformOrigin: "50% 50%", svgOrigin: "628 280", scaleY: 0, opacity: 0 });
            if (antLeft) gsap.set(antLeft, { transformOrigin: "50% 50%", svgOrigin: "525 326", scale: 0, opacity: 0 });
            if (antRight) gsap.set(antRight, { transformOrigin: "50% 50%", svgOrigin: "731 326", scale: 0, opacity: 0 });

            // ===== Master timeline =====
            const tl = gsap.timeline();

            // Backdrop in
            tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: "power2.out" }, 0);

            // Vignette resolves
            tl.fromTo(
                vignetteRef.current,
                { opacity: 0, scale: 1.14 },
                { opacity: 1, scale: 1, duration: 1.2, ease: "power3.out" },
                0.05,
            );

            // HUD reticle + corner brackets stencil in (cinematic surveillance feel)
            tl.fromTo(
                reticleRef.current,
                { opacity: 0, scale: 0.86, rotate: -8 },
                { opacity: 1, scale: 1, rotate: 0, duration: 0.7, ease: "power3.out" },
                0.2,
            );
            cornerRefs.current.forEach((corner, i) => {
                if (!corner) return;
                tl.fromTo(
                    corner,
                    { opacity: 0, scale: 0.6 },
                    { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2)" },
                    0.25 + i * 0.05,
                );
            });

            // Vertical scan line sweeps down across the stage
            if (scanLineRef.current) {
                tl.fromTo(
                    scanLineRef.current,
                    { opacity: 0, top: "-12%" },
                    { opacity: 0.9, duration: 0.1 },
                    0.45,
                );
                tl.to(
                    scanLineRef.current,
                    { top: "112%", duration: 1.0, ease: "expo.inOut" },
                    0.55,
                );
                tl.to(
                    scanLineRef.current,
                    { opacity: 0, duration: 0.18, ease: "power2.in" },
                    1.5,
                );
            }

            // ===== 0.75s — CHASSIS REVEAL =====
            // Logo wrapper appears, scaling in subtly while a clip-path
            // sweeps from top to bottom over the chassis.
            tl.fromTo(
                logoWrapperRef.current,
                { opacity: 0, scale: 0.86 },
                { opacity: 1, scale: 1, duration: 0.95, ease: "expo.out" },
                0.75,
            );
            if (robotChassisRef.current) {
                tl.fromTo(
                    robotChassisRef.current,
                    { clipPath: "inset(0 0 100% 0)" },
                    { clipPath: "inset(0 0 0% 0)", duration: 0.85, ease: "expo.out" },
                    0.85,
                );
            }

            // Atmosphere blooms
            tl.fromTo(
                atmosphereRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 1.2, ease: "power3.out" },
                0.75,
            );
            tl.fromTo(
                haloRef.current,
                { opacity: 0, scale: 0.9 },
                { opacity: 0.85, scale: 1, duration: 1.0, ease: "power3.out" },
                0.9,
            );

            // ===== 1.55s — Antennae snap outward =====
            if (antBall) tl.to(antBall, { scaleY: 1, opacity: 1, duration: 0.42, ease: "back.out(2.6)" }, 1.55);
            if (antLeft) tl.to(antLeft, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.6);
            if (antRight) tl.to(antRight, { scale: 1, opacity: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.6);

            // ===== 1.80s — Forehead jewel ignition + inner flash =====
            if (jewel) {
                tl.to(jewel, { scale: 1.18, opacity: 1, duration: 0.32, ease: "back.out(3)" }, 1.8);
                tl.to(jewel, { scale: 1, duration: 0.45, ease: "power2.out" }, 2.12);
            }
            tl.fromTo(
                innerBurstRef.current,
                { scale: 0.22, opacity: 0.95 },
                { scale: 2.2, opacity: 0, duration: 0.85, ease: "power4.out" },
                1.8,
            );

            // ===== 2.10s — AWAKEN — eyes snap open + sonar burst =====
            if (eyeLeft && eyeRight) {
                tl.to([eyeLeft, eyeRight], {
                    scaleY: 1,
                    opacity: 1,
                    duration: 0.55,
                    ease: "back.out(2.4)",
                    stagger: 0.06,
                }, 2.1);
            }
            tl.fromTo(
                burstRingRef.current,
                { scale: 0.42, opacity: 0.95 },
                { scale: 3.1, opacity: 0, duration: 1.05, ease: "power3.out" },
                2.1,
            );
            tl.fromTo(
                shockwaveRef.current,
                { scale: 0.4, opacity: 0.75 },
                { scale: 2.6, opacity: 0, duration: 0.95, ease: "power4.out" },
                2.18,
            );

            // Atmosphere flares brighter then settles
            tl.to(atmosphereRef.current, { opacity: 1.35, duration: 0.45, ease: "power3.out", overwrite: false }, 2.1);
            tl.to(atmosphereRef.current, { opacity: 1, duration: 0.9, ease: "power2.inOut", overwrite: false }, 2.55);

            // ===== 2.85s — Orbital procession =====
            const orbitEllipses = orbitRingRefs.current.filter(Boolean) as SVGEllipseElement[];
            const orbitSats = satelliteRefs.current.filter(Boolean) as SVGCircleElement[];
            orbitEllipses.forEach((ring, i) => {
                tl.fromTo(
                    ring,
                    { opacity: 0 },
                    { opacity: ORBITS[i].strokeOpacity, duration: 0.65, ease: "power2.out" },
                    2.85 + i * 0.08,
                );
            });
            orbitSats.forEach((sat, i) => {
                tl.fromTo(
                    sat,
                    { opacity: 0, attr: { r: 0 } },
                    { opacity: 1, attr: { r: ORBITS[i].satR }, duration: 0.55, ease: "back.out(2)" },
                    2.95 + i * 0.08,
                );
            });

            // ===== 3.20s — Acknowledgement double-blink =====
            if (eyeLeft && eyeRight) {
                tl.to([eyeLeft, eyeRight], { scaleY: 0.08, duration: 0.09, ease: "power2.in" }, 3.2);
                tl.to([eyeLeft, eyeRight], { scaleY: 1, duration: 0.18, ease: "power3.out" }, 3.29);
                tl.to([eyeLeft, eyeRight], { scaleY: 0.08, duration: 0.07, ease: "power2.in" }, 3.55);
                tl.to([eyeLeft, eyeRight], { scaleY: 1, duration: 0.18, ease: "power3.out" }, 3.62);
            }

            // ===== 3.50s — Wordmark reveal =====
            tl.fromTo(
                welcomeLabelRef.current,
                { opacity: 0, y: 14, letterSpacing: "0.45em" },
                { opacity: 1, y: 0, letterSpacing: "0.32em", duration: 0.55, ease: "power2.out" },
                3.5,
            );
            tl.fromTo(
                wordmarkRef.current,
                { opacity: 0, y: 24, letterSpacing: "0.16em", filter: "blur(8px)" },
                { opacity: 1, y: 0, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 0.95, ease: "expo.out" },
                3.8,
            );
            tl.fromTo(
                taglineRef.current,
                { opacity: 0, y: 8 },
                { opacity: 0.75, y: 0, duration: 0.5, ease: "power2.out" },
                4.45,
            );

            // ===== 4.95s — Handoff =====
            tl.call(() => onExitStartRef.current?.(), undefined, 4.95);
            tl.to(stageRef.current, { opacity: 0, scale: 1.06, duration: 0.75, ease: "power2.inOut" }, 4.95);
            tl.to(reticleRef.current, { opacity: 0, scale: 1.05, duration: 0.55, ease: "power2.in" }, 4.95);
            tl.to(backdropRef.current, { opacity: 0, duration: 0.65, ease: "power2.inOut" }, 5.05);
            tl.call(() => onCompleteRef.current?.(), undefined, 5.7);
        });
        return () => ctx.revert();
    }, [reducedMotion]);

    const setOrbitRingRef = (i: number) => (el: SVGEllipseElement | null) => { orbitRingRefs.current[i] = el; };
    const setSatelliteRef = (i: number) => (el: SVGCircleElement | null) => { satelliteRefs.current[i] = el; };
    const setCornerRef = (i: number) => (el: HTMLDivElement | null) => { cornerRefs.current[i] = el; };

    return (
        <div
            ref={backdropRef}
            className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#04070A]"
            style={{ opacity: 0 }}
            aria-hidden="true"
        >
            {/* Cinematic vignette */}
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
                            "radial-gradient(ellipse 90% 70% at 50% 100%, rgba(255,184,0,0.05) 0%, transparent 55%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(circle at 50% 50%, transparent 45%, rgba(0,0,0,0.6) 100%)",
                    }}
                />
                {/* Subtle scan-grid texture */}
                <div
                    className="absolute inset-0 opacity-[0.06] mix-blend-screen"
                    style={{
                        backgroundImage:
                            "repeating-linear-gradient(0deg, rgba(0,224,160,0.6) 0px, rgba(0,224,160,0.6) 1px, transparent 1px, transparent 4px)",
                    }}
                />
            </div>

            {/* Surveillance HUD reticle + corner brackets */}
            <div
                ref={reticleRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: 0 }}
            >
                <div className="relative h-[640px] w-[640px] max-h-[88vh] max-w-[88vw]">
                    {/* Crosshair lines */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-signal-500/15 to-transparent" />
                    <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-signal-500/15 to-transparent" />
                    {/* Corner brackets */}
                    {([
                        "top-0 left-0 border-t-2 border-l-2 rounded-tl-2xl",
                        "top-0 right-0 border-t-2 border-r-2 rounded-tr-2xl",
                        "bottom-0 left-0 border-b-2 border-l-2 rounded-bl-2xl",
                        "bottom-0 right-0 border-b-2 border-r-2 rounded-br-2xl",
                    ]).map((cornerPos, i) => (
                        <div
                            key={cornerPos}
                            ref={setCornerRef(i)}
                            className={`absolute h-14 w-14 ${cornerPos} border-signal-500/35`}
                            style={{ opacity: 0 }}
                        />
                    ))}
                </div>
            </div>

            {/* Vertical scan line */}
            <div
                ref={scanLineRef}
                aria-hidden="true"
                className="pointer-events-none absolute left-0 right-0 h-[160px]"
                style={{
                    top: "-12%",
                    opacity: 0,
                    background:
                        "linear-gradient(to bottom, transparent 0%, rgba(0,224,160,0.0) 20%, rgba(0,224,160,0.45) 48%, rgba(128,255,214,0.85) 50%, rgba(0,224,160,0.45) 52%, rgba(0,224,160,0.0) 80%, transparent 100%)",
                    filter: "blur(0.5px)",
                    mixBlendMode: "screen",
                }}
            />

            {/* Center stage */}
            <div
                ref={stageRef}
                className="relative z-10 flex flex-col items-center"
                style={{ willChange: "transform, opacity" }}
            >
                {/* Logo + orbits assembly */}
                <div
                    ref={logoWrapperRef}
                    className="relative mb-14 flex h-[280px] w-[280px] items-center justify-center"
                    style={{ willChange: "transform, opacity", opacity: 0 }}
                >
                    {/* Atmosphere — large soft jade halo */}
                    <div
                        ref={atmosphereRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 460,
                            height: 460,
                            background:
                                "radial-gradient(circle, rgba(0,224,160,0.42) 0%, rgba(0,224,160,0.14) 30%, rgba(0,224,160,0.04) 55%, transparent 75%)",
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
                            background:
                                "radial-gradient(circle, rgba(128,255,214,0.32) 0%, rgba(0,224,160,0.16) 38%, transparent 70%)",
                            filter: "blur(4px)",
                            opacity: 0,
                        }}
                    />

                    {/* Sonar pulse rings (continuous after awaken) */}
                    {[sonarOneRef, sonarTwoRef, sonarThreeRef].map((r, i) => (
                        <div
                            key={`sonar-${i}`}
                            ref={r}
                            aria-hidden="true"
                            className="pointer-events-none absolute rounded-full border border-signal-500/55"
                            style={{
                                width: 220,
                                height: 220,
                                boxShadow:
                                    "0 0 18px rgba(0,224,160,0.18), inset 0 0 18px rgba(0,224,160,0.18)",
                                opacity: 0,
                            }}
                        />
                    ))}

                    {/* Outer burst ring — fires at AWAKEN moment */}
                    <div
                        ref={burstRingRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full border-2 border-signal-500/85"
                        style={{
                            width: 200,
                            height: 200,
                            boxShadow:
                                "inset 0 0 36px rgba(0,224,160,0.45), 0 0 36px rgba(0,224,160,0.4)",
                            opacity: 0,
                        }}
                    />

                    {/* Secondary shockwave */}
                    <div
                        ref={shockwaveRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full border border-white/55"
                        style={{
                            width: 200,
                            height: 200,
                            boxShadow: "0 0 22px rgba(255,255,255,0.3)",
                            opacity: 0,
                        }}
                    />

                    {/* Inner flash — fires at jewel ignition */}
                    <div
                        ref={innerBurstRef}
                        aria-hidden="true"
                        className="pointer-events-none absolute rounded-full"
                        style={{
                            width: 110,
                            height: 110,
                            background:
                                "radial-gradient(circle, rgba(128,255,214,0.95) 0%, rgba(0,224,160,0.45) 38%, transparent 70%)",
                            filter: "blur(4px)",
                            opacity: 0,
                        }}
                    />

                    {/* Orbital rings + satellites — SVG layer above logo */}
                    <svg
                        viewBox="0 0 480 480"
                        width={480}
                        height={480}
                        aria-hidden="true"
                        className="pointer-events-none absolute"
                        style={{ overflow: "visible" }}
                    >
                        {ORBITS.map((orbit, i) => (
                            <ellipse
                                key={`orbit-${i}`}
                                ref={setOrbitRingRef(i)}
                                cx={240}
                                cy={240}
                                rx={orbit.rx}
                                ry={orbit.ry}
                                transform={`rotate(${orbit.rotation} 240 240)`}
                                fill="none"
                                stroke={orbit.color}
                                strokeWidth={1.1}
                                strokeOpacity={0.9}
                                strokeDasharray="2 3"
                                strokeLinecap="round"
                                style={{ opacity: 0 }}
                            />
                        ))}
                        {ORBITS.map((orbit, i) => (
                            <circle
                                key={`sat-${i}`}
                                ref={setSatelliteRef(i)}
                                cx={240 + orbit.rx}
                                cy={240}
                                r={0}
                                fill={orbit.color}
                                style={{
                                    filter: `drop-shadow(0 0 6px ${orbit.color})`,
                                    opacity: 0,
                                }}
                            />
                        ))}
                    </svg>

                    {/* Robot chassis — clip-path swept reveal */}
                    <div
                        ref={robotChassisRef}
                        className="relative z-10"
                        style={{ clipPath: "inset(0 0 100% 0)", willChange: "clip-path, transform" }}
                    >
                        <div ref={robotRef} className="relative">
                            <RobotLogo
                                size={220}
                                idle={false}
                                active={false}
                                rounded={true}
                                withGlow={false}
                                title="Code UX"
                            />
                            {/* Thin signal beam at antenna ball */}
                            <div
                                className="pointer-events-none absolute left-1/2 -translate-x-1/2"
                                style={{
                                    top: -28,
                                    width: 1,
                                    height: 32,
                                    background:
                                        "linear-gradient(to bottom, transparent 0%, rgba(0,224,160,0.6) 100%)",
                                }}
                                aria-hidden="true"
                            />
                        </div>
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
