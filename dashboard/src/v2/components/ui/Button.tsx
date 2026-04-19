import type { FunctionComponent, ComponentProps } from "preact";
import { memo } from "preact/compat";
import { useCallback, useRef, useEffect } from "preact/hooks";
import { Check, X } from "lucide-preact";
import gsap from "gsap";
import { useActionFeedback } from "../../hooks/use-action-feedback.js";
import { useMagnetic } from "../../hooks/use-magnetic.js";
import { useReducedMotion } from "../../hooks/use-reduced-motion.js";

export interface ButtonProps extends ComponentProps<"button"> {
  pending?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "signal";
  size?: "sm" | "md" | "lg";
}

const VARIANTS = {
  primary: "bg-slate-900 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-slate-700 dark:bg-white dark:text-void-900 dark:hover:bg-slate-100",
  secondary: "border border-black/[0.06] bg-white/72 text-slate-600 hover:text-slate-900 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-300 dark:hover:text-white",
  danger: "border border-status-red/30 bg-status-red/[0.06] text-status-red hover:bg-status-red/[0.12]",
  ghost: "bg-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
  signal: "bg-signal-500 hover:bg-signal-400 text-void-900 shadow-[0_4px_20px_rgba(0,224,160,0.25)] hover:shadow-[0_8px_32px_rgba(0,224,160,0.4)] disabled:shadow-none",
};

const SIZES = {
  sm: "px-3 py-1.5 text-xs rounded-xl",
  md: "px-4 py-2 text-xs rounded-xl",
  lg: "px-6 py-3 text-sm rounded-2xl",
};

export const Button: FunctionComponent<ButtonProps> = memo(({
  children,
  className = "",
  variant = "secondary",
  size = "md",
  pending = false,
  disabled,
  onClick,
  ...props
}) => {
  const { feedback, setPending, setSuccess, setError } = useActionFeedback(2000);
  const reducedMotion = useReducedMotion();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shimmerRef = useRef<HTMLDivElement>(null);
  
  useMagnetic(buttonRef, contentRef, { enabled: variant === "primary" || variant === "signal" });

  const isPending = pending || feedback.status === "pending";
  const isSuccess = feedback.status === "success";
  const isError = feedback.status === "error";

  // Press animation
  const handleMouseDown = useCallback(() => {
    if (disabled || isPending || reducedMotion) return;
    gsap.to(buttonRef.current, {
      scale: 0.94,
      duration: 0.2,
      ease: "power2.out"
    });
  }, [disabled, isPending, reducedMotion]);

  const handleMouseUp = useCallback(() => {
    if (reducedMotion) return;
    gsap.to(buttonRef.current, {
      scale: 1,
      duration: 0.4,
      ease: "back.out(1.7)"
    });
  }, [reducedMotion]);

  const successIconRef = useRef<SVGSVGElement>(null);
  const errorIconRef = useRef<SVGSVGElement>(null);

  // Success/Error/Pending animations
  useEffect(() => {
    if (reducedMotion || !buttonRef.current) return;

    if (isSuccess || isError) {
      const tl = gsap.timeline();
      
      // Button pop
      tl.to(buttonRef.current, {
        scale: 1.02,
        duration: 0.15,
        ease: "power2.out"
      })
      .to(buttonRef.current, {
        scale: 1,
        duration: 0.4,
        ease: "back.out(2)"
      });

      if (isSuccess) {
        // Glow effect
        gsap.fromTo(buttonRef.current, 
          { boxShadow: "0 0 0px 0px rgba(34, 197, 94, 0)" },
          { 
            boxShadow: "0 0 20px 4px rgba(34, 197, 94, 0.4)", 
            duration: 0.4, 
            yoyo: true, 
            repeat: 1,
            ease: "power2.inOut"
          }
        );

        if (successIconRef.current) {
          gsap.fromTo(successIconRef.current, 
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)", delay: 0.1 }
          );
        }
      } else {
        // Error shake
        gsap.to(buttonRef.current, {
          x: [-4, 4, -4, 4, 0],
          duration: 0.4,
          ease: "power2.inOut"
        });

        if (errorIconRef.current) {
          gsap.fromTo(errorIconRef.current, 
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)", delay: 0.1 }
          );
        }
      }
    }
  }, [isSuccess, isError, reducedMotion]);

  // Coordinated Shimmer
  useEffect(() => {
    if (!isPending || !shimmerRef.current || reducedMotion) return;

    const anim = gsap.fromTo(shimmerRef.current,
      { x: "-100%" },
      { 
        x: "100%", 
        duration: 1.5, 
        repeat: -1, 
        ease: "power1.inOut" 
      }
    );

    return () => anim.kill();
  }, [isPending, reducedMotion]);

  const handleClick = useCallback(
    (e: any) => {
      if (!onClick) return;

      const result = (onClick as any)(e);
      if (result && typeof result === "object" && "then" in result && typeof result.then === "function") {
        setPending("");
        result
          .then(() => setSuccess("Success")) // Passing message to trigger success state
          .catch((err: unknown) => {
            setError("Error");
            throw err;
          });
      }
      return result;
    },
    [onClick, setPending, setSuccess, setError]
  );

  const baseClasses = "group/btn inline-flex items-center justify-center gap-2 font-bold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-500 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-px disabled:hover:translate-y-0 touch-target";
  const variantClasses = VARIANTS[variant];
  const sizeClasses = SIZES[size];

  let overrideClasses = "";
  if (isSuccess) overrideClasses = "!bg-status-green !text-white !border-transparent";
  else if (isError) overrideClasses = "!bg-status-red !text-white !border-transparent";

  const childrenOpacity = (isPending) ? "opacity-50" : (isSuccess || isError) ? "opacity-0" : "opacity-100";

  return (
    <button
      {...props}
      ref={buttonRef}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      disabled={disabled || isPending}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${overrideClasses} relative overflow-hidden ${className}`}
    >
      <div ref={contentRef} className={`flex items-center justify-center gap-2 transition-opacity duration-200 ${childrenOpacity}`}>
        {children}
      </div>

      {isPending && (
        <div 
          ref={shimmerRef}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full" 
        />
      )}

      {isSuccess && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check ref={successIconRef} className="w-5 h-5" />
        </div>
      )}

      {isError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <X ref={errorIconRef} className="w-5 h-5" />
        </div>
      )}
    </button>
  );
});