const originalEmitWarning = process.emitWarning.bind(process);

process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const message = typeof warning === "string" ? warning : warning?.message ?? "";
  const type = warning instanceof Error
    ? warning.name
    : typeof args[0] === "string"
      ? args[0]
      : "";

  if (type === "ExperimentalWarning" && message.includes("SQLite is an experimental feature")) {
    return;
  }

  return originalEmitWarning(warning as never, ...(args as []));
}) as typeof process.emitWarning;

const installAnimationFramePolyfill = (): void => {
  const target = globalThis as typeof globalThis & {
    requestAnimationFrame?: (callback: FrameRequestCallback) => number;
    cancelAnimationFrame?: (id: number) => void;
    window?: Window & typeof globalThis;
  };

  if (!target.requestAnimationFrame) {
    target.requestAnimationFrame = (callback: FrameRequestCallback): number => {
      return setTimeout(() => callback(Date.now()), 0) as unknown as number;
    };
  }

  if (!target.cancelAnimationFrame) {
    target.cancelAnimationFrame = (id: number): void => {
      clearTimeout(id);
    };
  }

  if (target.window) {
    target.window.requestAnimationFrame ??= target.requestAnimationFrame;
    target.window.cancelAnimationFrame ??= target.cancelAnimationFrame;
  }
};

installAnimationFramePolyfill();
