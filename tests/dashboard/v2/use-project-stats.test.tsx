/**
 * @vitest-environment jsdom
 * @jsx h
 * @jsxFrag Fragment
 */
import { h, Fragment } from "preact";
import React from "react";
import { render, cleanup, act } from "@testing-library/preact";
import { useProjectStats } from "../../../dashboard/src/v2/hooks/use-project-stats.js";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { subscribeToDashboardRealtime } from "../../../dashboard/src/lib/realtime/dashboard-realtime-client.js";
import { fetchProjectStats } from "../../../dashboard/src/v2/lib/project-api.js";

let realtimeCallback: any;

// Mock the realtime client
vi.mock("../../../dashboard/src/lib/realtime/dashboard-realtime-client.js", () => ({
  subscribeToDashboardRealtime: vi.fn((topics, cb) => {
    realtimeCallback = cb;
    return vi.fn();
  }),
}));

// Mock the API
vi.mock("../../../dashboard/src/v2/lib/project-api.js", () => ({
  fetchProjectStats: vi.fn(async (projectId, query, signal) => {
    // Simulate network delay
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 50);
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }
    });
    return { id: "stats-snapshot" };
  }),
}));

function TestComponent({ projectId, query, onResult }: { projectId: string | null; query: any, onResult?: (res: any) => void }) {
  const result = useProjectStats(projectId, query);
  onResult?.(result);
  const { stats, loading, error } = result;
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'idle'}</div>
      <div data-testid="stats">{stats ? (stats as any).id : 'none'}</div>
      <div data-testid="error">{error || 'none'}</div>
    </div>
  );
}

describe("useProjectStats", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useFakeTimers();
    realtimeCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cancels previous fetch on query change", async () => {
    const { getByTestId, rerender } = render(<TestComponent projectId="p1" query="7d" />);
    expect(getByTestId("loading").textContent).toBe("loading");

    // Immediately change the query before the first fetch completes
    rerender(<TestComponent projectId="p1" query="30d" />);

    // Fast-forward time to let fetches complete
    await act(async () => {
      vi.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(fetchProjectStats).toHaveBeenCalledTimes(2);

    const firstCallSignal = vi.mocked(fetchProjectStats).mock.calls[0][2];
    expect(firstCallSignal?.aborted).toBe(true);

    const secondCallSignal = vi.mocked(fetchProjectStats).mock.calls[1][2];
    expect(secondCallSignal?.aborted).toBe(false);

    expect(getByTestId("loading").textContent).toBe("idle");
    expect(getByTestId("stats").textContent).toBe("stats-snapshot");
  });

  it("handles null projectId", async () => {
    const { getByTestId } = render(<TestComponent projectId={null} query="7d" />);
    expect(getByTestId("stats").textContent).toBe("none");
    expect(fetchProjectStats).not.toHaveBeenCalled();
  });

  it("refreshes on realtime events", async () => {
    render(<TestComponent projectId="p1" query="7d" />);
    
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(fetchProjectStats).toHaveBeenCalledTimes(1);

    // Trigger realtime event
    act(() => {
      if (realtimeCallback) {
        realtimeCallback({ type: "event", event: { eventType: "project.execution.updated" } });
      }
    });

    // Wait for debounce (500ms)
    await act(async () => {
      vi.advanceTimersByTime(600);
      await Promise.resolve();
    });

    expect(fetchProjectStats).toHaveBeenCalledTimes(2);
  });

  it("polls periodically", async () => {
    render(<TestComponent projectId="p1" query="7d" />);
    
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });
    expect(fetchProjectStats).toHaveBeenCalledTimes(1);

    // Advance by default poll interval (30s)
    await act(async () => {
      vi.advanceTimersByTime(30000);
      await Promise.resolve();
    });

    expect(fetchProjectStats).toHaveBeenCalledTimes(2);
  });

  it("handles fetch errors", async () => {
    vi.mocked(fetchProjectStats).mockRejectedValueOnce(new Error("Failed to fetch"));
    
    const { getByTestId } = render(<TestComponent projectId="p1" query="7d" />);
    
    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(getByTestId("error").textContent).toBe("Failed to fetch");
  });
});
