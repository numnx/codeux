import type { FunctionComponent, JSX } from "preact";

/*
  Code UX — "SENTINEL" sigil.

  The mark is an EYE made of light:
    - elliptical iris frame   = the 300° open arc (eye outline)
    - jade pupil              = the agent's core
    - bright trailing arc     = thought in motion, a glance
    - jade comet              = where the agent is right now

  Geometry on a 64-unit canvas, center (32,32), ellipse rx=25 ry=17:
    main orbit arc :  M 54 23  A 25 17 0 1 0  54 41   (~300°, CCW)
    trail arc      :  M 32 49  A 25 17 0 0 0  54 41   (~60°, fades up)
    pupil          :  cx 32 cy 32 r 5
    glint          :  cx 30.4 cy 30.5 r 1.5
    satellite      :  cx 54 cy 41 r 3
    eye halo       :  ellipse rx=28 ry=21 (jade radial)
    satellite halo :  circle r=8 (jade radial)

  Animation hooks (CSS in styles.css):
    .cux-mark          — root, accepts :hover / :focus-visible
    .cux-eye-halo      — pulses on hover
    .cux-sat-halo      — pulses on hover (delayed)
    .cux-eye           — blinks (scaleY) on hover
    .cux-pupil         — iris dilation (scale, overshoot)
    .cux-glint         — moment-of-recognition shimmer

  Trigger from any ancestor by adding .cux-trigger to it.
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
    const rootClass = `cux-mark${className ? ` ${className}` : ""}`;
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            width={dim}
            height={dim}
            role="img"
            aria-labelledby={labelId}
            className={rootClass}
            {...rest}
        >
            <title id={labelId}>{title}</title>
            <defs>
                <linearGradient
                    id="cux-orbit-trail"
                    gradientUnits="userSpaceOnUse"
                    x1="32"
                    y1="49"
                    x2="54"
                    y2="41"
                >
                    <stop offset="0%" stopColor={JADE} stopOpacity="0" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0.95" />
                </linearGradient>
                <radialGradient id="cux-eye-halo-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={JADE} stopOpacity="0.55" />
                    <stop offset="55%" stopColor={JADE} stopOpacity="0.14" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0" />
                </radialGradient>
                <radialGradient
                    id="cux-sat-halo-grad"
                    cx="54"
                    cy="41"
                    r="8"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor={JADE} stopOpacity="0.62" />
                    <stop offset="100%" stopColor={JADE} stopOpacity="0" />
                </radialGradient>
            </defs>

            {withGlow ? (
                <>
                    <ellipse className="cux-eye-halo" cx="32" cy="32" rx="28" ry="21" fill="url(#cux-eye-halo-grad)" />
                    <circle className="cux-sat-halo" cx="54" cy="41" r="8" fill="url(#cux-sat-halo-grad)" />
                </>
            ) : null}

            <g className="cux-eye">
                <path
                    d="M 54 23 A 25 17 0 1 0 54 41"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeOpacity="0.36"
                    strokeLinecap="round"
                />
                <path
                    d="M 32 49 A 25 17 0 0 0 54 41"
                    fill="none"
                    stroke="url(#cux-orbit-trail)"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                />
                <circle cx="54" cy="41" r="3" fill={JADE} />
                <circle cx="53.2" cy="40.2" r="0.95" fill={JADE_LIFT} opacity="0.85" />

                <g className="cux-pupil">
                    <circle cx="32" cy="32" r="5" fill={JADE} />
                    <circle className="cux-glint" cx="30.4" cy="30.5" r="1.5" fill={JADE_LIFT} opacity="0.78" />
                </g>
            </g>
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

    const wrapperClass = `inline-flex cux-trigger ${layout === "stacked" ? "flex-col items-start gap-2" : "items-center gap-3"} ${className ?? ""}`;

    return (
        <div className={wrapperClass}>
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
