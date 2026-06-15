/** @vitest-environment jsdom */
import { renderHook } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePolling } from "../../src/v2/hooks/use-polling.js";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset hidden state
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it("should call the callback at the specified interval", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("should not call the callback if disabled", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000, { enabled: false }));

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("should pause polling when document is hidden and skip ticks", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    // Hide document
    Object.defineProperty(document, "hidden", { value: true, configurable: true });

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("should trigger an immediate refresh when the tab becomes visible again", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    // Simulate tab hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(callback).not.toHaveBeenCalled();

    // Make visible and trigger event
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    // advance timers a bit so tick function can run
    await vi.advanceTimersByTimeAsync(0);

    // It should have triggered immediately
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("should skip a tick if the previous poll has not resolved", async () => {
    // A callback that takes 2500ms to resolve
    let resolvePromise: (value?: unknown) => void;
    const callback = vi.fn().mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve; }));
    renderHook(() => usePolling(callback, 1000));

    // First tick
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Second tick (at 2000ms), previous still resolving
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Resolve the first poll
    resolvePromise!();

    // allow microtasks to flush so finally block executes
    await Promise.resolve();

    // The next scheduled tick will run when timer hits. Wait 1000 more (3000ms total).
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("clears interval on unmount", async () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => usePolling(callback, 1000));

    unmount();
    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).not.toHaveBeenCalled();
  });
});
