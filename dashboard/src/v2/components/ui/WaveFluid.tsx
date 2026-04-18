import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/**
 * Fluid wave at bottom of card.
 * Both SVG layers are 200% wide with exactly 2 wave cycles.
 * translateX(-50%) = one exact cycle → zero-jump seamless loop.
 * Layer 2 counter-drifts via reverse + negative delay (no second keyframe needed).
 */
import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

/**
 * Fluid wave at bottom of card.
 * Both SVG layers are 200% wide with exactly 2 wave cycles.
 * translateX(-50%) = one exact cycle → zero-jump seamless loop.
 * Layer 2 counter-drifts via reverse + negative delay (no second keyframe needed).
 */
export const WaveFluid: FunctionComponent<{ accentHex: string; isActive?: boolean }> = ({ accentHex, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const prefersReducedMotion = useReducedMotion();

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        if (prefersReducedMotion) return;

        const el = containerRef.current;
        const paths = el.querySelectorAll('path');

        let ctx = gsap.context(() => {
            // Animate color changes smoothly
            gsap.to(paths, {
                fill: accentHex,
                duration: 1,
                ease: "power2.out",
                overwrite: "auto"
            });

            if (isActive) {
                // Organic activation: fade in and subtle scale up
                gsap.fromTo(el,
                    { opacity: 0, scaleY: 0.6 },
                    {
                        opacity: 0.8,
                        scaleY: 1,
                        duration: 1.5,
                        ease: "power2.out",
                        overwrite: "auto"
                    }
                );
                // Subtle pulse while running
                gsap.to(el, {
                    opacity: 0.4,
                    duration: 3,
                    yoyo: true,
                    repeat: -1,
                    ease: "sine.inOut",
                    delay: 1.5
                });
            } else {
                gsap.killTweensOf(el);
                // Reset to baseline hidden state
                gsap.to(el, {
                    opacity: 0,
                    scaleY: 0.8,
                    duration: 0.8,
                    ease: "power2.inOut",
                    overwrite: "auto"
                });

                // Coordinate hover feedback organically
                const parent = el.closest('.group');
                if (parent) {
                    const onEnter = () => {
                        if (!isActive) {
                            gsap.to(el, {
                                opacity: 1,
                                scaleY: 1,
                                duration: 1.2,
                                ease: "power2.out",
                                overwrite: "auto"
                            });
                        }
                    };
                    const onLeave = () => {
                        if (!isActive) {
                            gsap.to(el, {
                                opacity: 0,
                                scaleY: 0.8,
                                duration: 0.8,
                                ease: "power2.inOut",
                                overwrite: "auto"
                            });
                        }
                    };
                    parent.addEventListener('mouseenter', onEnter);
                    parent.addEventListener('mouseleave', onLeave);
                    return () => {
                        parent.removeEventListener('mouseenter', onEnter);
                        parent.removeEventListener('mouseleave', onLeave);
                    };
                }
            }
        });

        return () => ctx.revert();
    }, [isActive, accentHex, prefersReducedMotion]);

    return (
    <div
        ref={containerRef}
        className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none opacity-0 transform-gpu"
        style={{ transformOrigin: 'bottom' }}
    >
        {/* Primary wave — 2 cycles, drifts left */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '100%', left: 0,
                animation: 'wave-drift 6s linear infinite',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 32 C 12.5 16 37.5 16 50 32 C 62.5 48 87.5 48 100 32 C 112.5 16 137.5 16 150 32 C 162.5 48 187.5 48 200 32 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.10"
            />
        </svg>
        {/* Secondary wave — shallower, counter-drifts via reverse + phase offset */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '72%', left: 0,
                animation: 'wave-drift 9s linear infinite reverse',
                animationDelay: '-3.5s',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 38 C 12.5 26 37.5 26 50 38 C 62.5 50 87.5 50 100 38 C 112.5 26 137.5 26 150 38 C 162.5 50 187.5 50 200 38 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.065"
            />
        </svg>
    </div>
    );
};
        {/* Primary wave — 2 cycles, drifts left */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '100%', left: 0,
                animation: 'wave-drift 6s linear infinite',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 32 C 12.5 16 37.5 16 50 32 C 62.5 48 87.5 48 100 32 C 112.5 16 137.5 16 150 32 C 162.5 48 187.5 48 200 32 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.10"
            />
        </svg>
        {/* Secondary wave — shallower, counter-drifts via reverse + phase offset */}
        <svg
            style={{
                position: 'absolute', bottom: 0,
                width: '200%', height: '72%', left: 0,
                animation: 'wave-drift 9s linear infinite reverse',
                animationDelay: '-3.5s',
            }}
            viewBox="0 0 200 64"
            preserveAspectRatio="none"
        >
            <path
                d="M 0 38 C 12.5 26 37.5 26 50 38 C 62.5 50 87.5 50 100 38 C 112.5 26 137.5 26 150 38 C 162.5 50 187.5 50 200 38 L 200 64 L 0 64 Z"
                fill={accentHex}
                fillOpacity="0.065"
            />
        </svg>
    </div>
    );
};
