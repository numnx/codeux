/** @jsx h */
/** @jsxFrag Fragment */
/** @vitest-environment jsdom */
import React from "react";
import { h, Fragment } from "preact";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/preact";
import { useStatsPageData } from "../../../dashboard/src/v2/pages/stats/use-stats-page-data.js";
import { useProjectStats } from "../../../dashboard/src/v2/hooks/use-project-stats.js";

vi.mock("../../../dashboard/src/v2/hooks/use-project-stats.js", () => ({
  useProjectStats: vi.fn(),
}));

function TestComponent({ projectId, onResult }: { projectId: string | null, onResult: (res: any) => void }) {
  const data = useStatsPageData(projectId);
  onResult(data);
  return null;
}

describe("useStatsPageData", () => {
  const projectId = "proj-1";
  let lastResult: any;
  const onResult = (res: any) => { lastResult = res; };

  beforeEach(() => {
    vi.mocked(useProjectStats).mockReturnValue({
      stats: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    } as any);
  });

  it("initializes with default values", () => {
    render(<TestComponent projectId={projectId} onResult={onResult} />);

    expect(lastResult.activeQuery).toEqual({ window: "7d" });
    expect(lastResult.visualMode).toBe("trend");
    expect(lastResult.loading).toBe(false);
  });

  it("applies preset window", () => {
    render(<TestComponent projectId={projectId} onResult={onResult} />);

    act(() => {
      lastResult.applyPresetWindow("30d");
    });

    expect(lastResult.activeQuery).toEqual({ window: "30d" });
  });

  it("applies custom range", () => {
    render(<TestComponent projectId={projectId} onResult={onResult} />);

    act(() => {
      lastResult.setCustomFrom("2023-01-01");
      lastResult.setCustomTo("2023-01-10");
    });

    act(() => {
      lastResult.applyCustomRange();
    });

    expect(lastResult.activeQuery).toEqual({
      window: "custom",
      from: "2023-01-01",
      to: "2023-01-10",
    });
  });

  it("does not apply custom range if dates are missing", () => {
    render(<TestComponent projectId={projectId} onResult={onResult} />);

    act(() => {
      lastResult.setCustomFrom("");
      lastResult.setCustomTo("");
    });

    act(() => {
      lastResult.applyCustomRange();
    });

    // Should still be the default
    expect(lastResult.activeQuery).toEqual({ window: "7d" });
  });

  it("updates visual mode", () => {
    render(<TestComponent projectId={projectId} onResult={onResult} />);

    act(() => {
      lastResult.setVisualMode("composition");
    });

    expect(lastResult.visualMode).toBe("composition");
  });

  it("calculates completionConfidence based on stats", () => {
    const { rerender } = render(<TestComponent projectId={projectId} onResult={onResult} />);
    expect(lastResult.completionConfidence).toBe("No telemetry");

    vi.mocked(useProjectStats).mockReturnValue({
      stats: {
        usage: { reportedInvocationCount: 10, estimatedInvocationCount: 0 },
      },
      loading: false,
      error: null,
    } as any);
    rerender(<TestComponent projectId={projectId} onResult={onResult} />);
    expect(lastResult.completionConfidence).toBe("Provider reported");

    vi.mocked(useProjectStats).mockReturnValue({
      stats: {
        usage: { reportedInvocationCount: 10, estimatedInvocationCount: 5 },
      },
      loading: false,
      error: null,
    } as any);
    rerender(<TestComponent projectId={projectId} onResult={onResult} />);
    expect(lastResult.completionConfidence).toBe("Mixed reported + fallback");

    vi.mocked(useProjectStats).mockReturnValue({
      stats: {
        usage: { reportedInvocationCount: 0, estimatedInvocationCount: 5 },
      },
      loading: false,
      error: null,
    } as any);
    rerender(<TestComponent projectId={projectId} onResult={onResult} />);
    expect(lastResult.completionConfidence).toBe("Estimated fallback");
    
    vi.mocked(useProjectStats).mockReturnValue({
      stats: {
        usage: { reportedInvocationCount: 0, estimatedInvocationCount: 0 },
      },
      loading: false,
      error: null,
    } as any);
    rerender(<TestComponent projectId={projectId} onResult={onResult} />);
    expect(lastResult.completionConfidence).toBe("Unavailable");
  });
});
