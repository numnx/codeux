import type { FunctionComponent, JSX } from "preact";

/*
  Code UX — "ORBIT" sigil.

  A sentient core inside an open orbital path. The mark says:
    - jade core           = the agent's mind / project nucleus
    - dim 300° arc        = workspace boundary (open, never closed)
    - bright trailing arc = the agent's current work, a comet's wake
    - jade satellite      = where the agent is right now

  Geometry on a 64-unit canvas, center (32,32):
    orbit centerline r=22, gap of 60° on the right (angles +30° → -30°)
    drawn arc:  M 51 21  A 22 22 0 1 0  51 43   (~300°, counterclockwise)
    trail arc:  M 32 54  A 22 22 0 0 0  51 43   (~60°,  fades into satellite)
    core:       cx 32 cy 32 r 5
    satellite:  cx 51 cy 43 r 3
*/

const JADE = "#00E0A0";
const JADE_LIFT = "#80FFD6";

interface LogoProps extends Omit<JSX.SVGAttributes<SVGSVGElement>, "size" | "title"> {
    size?: number | string;
    title?: string;
    titleId?: string;
    withGlow?: boolean;
}

export const Logo: FunctionComponent<LogoProps> = ({
    size = 24,
    title = "Code UX",
    titleId,
    withGlow = true,
    className,
    ...rest
}) => {
    const dim = typeof size === "number" ? String(size) : size;
    const labelId = titleId ?? "code-ux-logo-title";
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={dim}
            height={dim}
            role="img"
            aria-labelledby={labelId}
            className={className}
            {...rest}
        >
            <title id={labelId}>{title}</title>
            <defs>
                <linearGradient
                    id="cux-orbit-trail"
                    gradientUnits="userSpaceOnUse"
                    x1="32"
                    y1="54"
                    x2="51"
                    y2="43"
                >
                    <stop offset="0%" stopColor={JADE} stopOpacity="0" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0.95" />
                </linearGradient>
                <radialGradient
                    id="cux-core-halo"
                    cx="32"
                    cy="32"
                    r="13"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor={JADE} stopOpacity="0.55" />
                    <stop offset="55%" stopColor={JADE} stopOpacity="0.14" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0" />
                </radialGradient>
                <radialGradient
                    id="cux-sat-halo"
                    cx="51"
                    cy="43"
                    r="7"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor={JADE} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0" />
                </radialGradient>
            </defs>

            {withGlow ? (
                <>
                    <circle cx="32" cy="32" r="13" fill="url(#cux-core-halo)" />
                    <circle cx="51" cy="43" r="7" fill="url(#cux-sat-halo)" />
                </>
            ) : null}

            <path
                d="M 51 21 A 22 22 0 1 0 51 43"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeOpacity="0.34"
                strokeLinecap="round"
            />

            <path
                d="M 32 54 A 22 22 0 0 0 51 43"
                fill="none"
                stroke="url(#cux-orbit-trail)"
                strokeWidth="2.25"
                strokeLinecap="round"
            />

            <circle cx="32" cy="32" r="5" fill={JADE} />
            <circle cx="30.4" cy="30.4" r="1.5" fill={JADE_LIFT} opacity="0.78" />

            <circle cx="51" cy="43" r="3" fill={JADE} />
            <circle cx="50.2" cy="42.2" r="0.95" fill={JADE_LIFT} opacity="0.85" />
        </svg>
    );
};

type LockupLayout = "row" | "stacked";

interface LogoLockupProps {
    size?: number;
    layout?: LockupLayout;
    tagline?: string;
    withGlow?: boolean;
    className?: string;
    wordmarkClassName?: string;
}

export const LogoLockup: FunctionComponent<LogoLockupProps> = ({
    size = 28,
    layout = "row",
    tagline,
    withGlow = true,
    className,
    wordmarkClassName,
}) => {
    const wordmark = (
        <span className={wordmarkClassName ?? "font-display font-bold tracking-tight text-slate-900 dark:text-white"}>
            Code<span className="text-signal-500">UX</span>
        </span>
    );

    if (layout === "stacked") {
        return (
            <div className={`inline-flex flex-col items-start gap-2 ${className ?? ""}`}>
                <Logo size={size} withGlow={withGlow} />
                <div className="flex flex-col leading-none">
                    {wordmark}
                    {tagline ? (
                        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-signal-500 font-mono">
                            {tagline}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-3 ${className ?? ""}`}>
            <Logo size={size} withGlow={withGlow} />
            <div className="flex flex-col leading-none">
                {wordmark}
                {tagline ? (
                    <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-signal-500 font-mono">
                        {tagline}
                    </span>
                ) : null}
            </div>
        </div>
    );
};

export default Logo;
