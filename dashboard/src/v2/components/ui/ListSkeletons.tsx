import type { FunctionComponent } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import gsap from "gsap";

const Shimmer = ({ index = 0 }: { index?: number }) => {
  const shimmerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (shimmerRef.current) {
      gsap.fromTo(
        shimmerRef.current,
        { x: "-100%" },
        {
          x: "200%",
          duration: 2,
          repeat: -1,
          ease: "none",
          delay: index * 0.15,
        }
      );
    }
  }, [index]);

  return (
    <div
      ref={shimmerRef}
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-black/[0.03] to-transparent dark:via-white/[0.03] pointer-events-none"
    />
  );
};

export const SkeletonRow: FunctionComponent<{ index?: number }> = ({ index = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          delay: index * 0.05,
          ease: "power2.out",
        }
      );
    }
  }, [index]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden flex h-16 w-full items-center gap-4 rounded-2xl border border-black/[0.04] bg-black/[0.02] px-5 dark:border-white/[0.04] dark:bg-white/[0.02]"
      aria-busy="true"
    >
      <Shimmer index={index} />
      <span className="sr-only">Loading row...</span>
      <div className="h-4 w-4 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      <div className="h-4 w-1/4 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      <div className="ml-auto h-6 w-20 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
      <div className="h-8 w-8 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
    </div>
  );
};

export const SkeletonCard: FunctionComponent<{ index?: number }> = ({ index = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.5,
          delay: index * 0.1,
          ease: "back.out(1.7)",
        }
      );
    }
  }, [index]);

  return (
    <div
      ref={containerRef}
      className="skeleton-card-entry relative overflow-hidden flex h-40 w-full flex-col gap-4 rounded-[1.25rem] border border-black/[0.04] bg-black/[0.02] p-5 dark:border-white/[0.04] dark:bg-white/[0.02]"
      aria-busy="true"
    >
      <Shimmer index={index} />
      <span className="sr-only">Loading card...</span>
      <div className="flex items-center justify-between">
        <div className="h-5 w-1/3 rounded bg-slate-200/50 dark:bg-slate-700/30" />
        <div className="h-6 w-16 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
      </div>
      <div className="mt-2 h-4 w-2/3 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      <div className="mt-auto flex items-center justify-between">
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
          <div className="h-6 w-6 rounded-full bg-slate-200/50 dark:bg-slate-700/30" />
        </div>
        <div className="h-4 w-12 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      </div>
    </div>
  );
};

export const SkeletonPanel: FunctionComponent<{ index?: number }> = ({ index = 0 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          delay: index * 0.15,
          ease: "power3.out",
        }
      );
    }
  }, [index]);

  return (
    <div
      ref={containerRef}
      className="skeleton-panel-entry relative overflow-hidden flex h-64 w-full flex-col gap-6 rounded-[1.75rem] border border-black/[0.04] bg-black/[0.02] p-7 dark:border-white/[0.04] dark:bg-white/[0.02]"
      aria-busy="true"
    >
      <Shimmer index={index} />
      <span className="sr-only">Loading panel...</span>
      <div className="h-6 w-1/4 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-full rounded bg-slate-200/50 dark:bg-slate-700/30" />
        <div className="h-4 w-5/6 rounded bg-slate-200/50 dark:bg-slate-700/30" />
        <div className="h-4 w-4/6 rounded bg-slate-200/50 dark:bg-slate-700/30" />
      </div>
      <div className="mt-auto flex gap-3">
        <div className="h-10 w-24 rounded-xl bg-slate-200/50 dark:bg-slate-700/30" />
        <div className="h-10 w-24 rounded-xl bg-slate-200/50 dark:bg-slate-700/30" />
      </div>
    </div>
  );
};

