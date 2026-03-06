import type { FunctionComponent } from "preact";
import { useEffect, useRef } from "preact/hooks";
import gsap from "gsap";

export const CanvasBackground: FunctionComponent = () => {
    const splineRef = useRef<SVGPathElement>(null);

    useEffect(() => {
        // The Avant-Garde Background Spline Animation
        if (splineRef.current) {
            const tl = gsap.timeline({ repeat: -1, yoyo: true });
            tl.to(splineRef.current, {
                attr: { d: "M 0,200 C 200,600 400,-100 800,400 C 1200,900 1600,0 2000,300" },
                duration: 15,
                ease: "sine.inOut"
            }).to(splineRef.current, {
                attr: { d: "M 0,400 C 300,-100 500,800 1000,200 C 1400,-200 1800,700 2000,500" },
                duration: 20,
                ease: "sine.inOut"
            });
        }
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent dark:from-indigo-500/10 transition-colors duration-1000" />

            {/* The flowing avant-garde SVG line across the entire background */}
            <svg className="absolute w-[200vw] h-[100vh] top-[10%] left-[-10%] opacity-[0.03] dark:opacity-[0.05] drop-shadow-[0_0_20px_rgba(99,102,241,1)]" viewBox="0 0 2000 800" preserveAspectRatio="none">
                <path
                    ref={splineRef}
                    d="M 0,300 C 300,100 600,700 1000,300 C 1400,-100 1800,600 2000,200"
                    fill="none"
                    stroke="url(#bg-gradient)"
                    strokeWidth="2"
                />
                <defs>
                    <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#d946ef" />
                        <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};
