/**
 * @vitest-environment jsdom
 */
import { renderHook } from "@testing-library/preact";
import { usePolling } from "../use-polling.js";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("usePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });
  });

  it("calls callback on interval", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("stops polling when enabled is false", async () => {
    const callback = vi.fn();
    const { rerender } = renderHook(({ enabled }) => usePolling(callback, 1000, { enabled }), {
      initialProps: { enabled: true },
    });

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({ enabled: false });

    await vi.advanceTimersByTimeAsync(3000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("skips ticks when document is hidden", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    Object.defineProperty(document, "hidden", { value: true, writable: true });

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("resumes and fires immediately when document becomes visible", async () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 1000));

    // Hide document
    Object.defineProperty(document, "hidden", { value: true, writable: true });
    Object.defineProperty(document, "visibilityState", { value: "hidden", writable: true });

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).not.toHaveBeenCalled();

    // Show document
    Object.defineProperty(document, "hidden", { value: false, writable: true });
    Object.defineProperty(document, "visibilityState", { value: "visible", writable: true });

    // Trigger visibilitychange event
    document.dispatchEvent(new Event("visibilitychange"));

    // tick happens asynchronously, advance by 0 or let microtasks flush
    await vi.advanceTimersByTimeAsync(0);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not stack fetches if previous fetch is in-flight", async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });

    const callback = vi.fn().mockReturnValue(promise);
    renderHook(() => usePolling(callback, 1000));

    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // advance more time, callback should not be called again because the first is still pending
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // resolve the promise
    resolvePromise!();
    // allow microtasks to clear the inFlightRef
    await vi.advanceTimersByTimeAsync(0);

    // next tick it should be called again
    await vi.advanceTimersByTimeAsync(1000);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
