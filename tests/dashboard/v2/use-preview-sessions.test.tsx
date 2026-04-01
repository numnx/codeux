/**
 * @vitest-environment jsdom
 * @jsx h
 * @jsxFrag Fragment
 */
import { h, Fragment } from "preact";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/preact";
import { usePreviewSessions } from "../../../dashboard/src/v2/hooks/use-preview-sessions.js";
import { fetchPreviewSessions } from "../../../dashboard/src/v2/lib/browser-api.js";

vi.mock("../../../dashboard/src/v2/lib/browser-api.js", () => ({
  fetchPreviewSessions: vi.fn(),
}));

function TestComponent({ options, onResult }: { options: any, onResult: (res: any) => void }) {
  const result = usePreviewSessions(options);
  onResult(result);
  return null;
}

describe("usePreviewSessions", () => {
  let lastResult: any;
  const onResult = (res: any) => { lastResult = res; };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty array and no selected session if projectId is null", async () => {
    render(<TestComponent options={{ projectId: null }} onResult={onResult} />);
    expect(lastResult.sessions).toEqual([]);
    expect(lastResult.selectedSession).toBeNull();
    expect(lastResult.loading).toBe(false);
    expect(fetchPreviewSessions).not.toHaveBeenCalled();
  });

  it("fetches sessions successfully when projectId is provided", async () => {
    const mockSessions = [{ id: "s1", sprintId: "sp1" }, { id: "s2", sprintId: "sp2" }];
    vi.mocked(fetchPreviewSessions).mockResolvedValue(mockSessions as any);

    render(<TestComponent options={{ projectId: "p1" }} onResult={onResult} />);

    expect(lastResult.loading).toBe(true);

    await act(async () => {
      // wait for the promise to resolve
      await Promise.resolve();
    });

    expect(fetchPreviewSessions).toHaveBeenCalledWith("p1");
    expect(lastResult.loading).toBe(false);
    expect(lastResult.sessions).toEqual(mockSessions);
    // falls back to index 0 if no activeSessionId or selectedSprintId
    expect(lastResult.selectedSession).toEqual(mockSessions[0]);
  });

  it("selects session by activeSessionId correctly", async () => {
    const mockSessions = [{ id: "s1", sprintId: "sp1" }, { id: "s2", sprintId: "sp2" }];
    vi.mocked(fetchPreviewSessions).mockResolvedValue(mockSessions as any);

    render(<TestComponent options={{ projectId: "p1", activeSessionId: "s2" }} onResult={onResult} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(lastResult.selectedSession).toEqual(mockSessions[1]);
  });

  it("selects session by selectedSprintId correctly if no activeSessionId", async () => {
    const mockSessions = [{ id: "s1", sprintId: "sp1" }, { id: "s2", sprintId: "sp2" }];
    vi.mocked(fetchPreviewSessions).mockResolvedValue(mockSessions as any);

    render(<TestComponent options={{ projectId: "p1", selectedSprintId: "sp2" }} onResult={onResult} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(lastResult.selectedSession).toEqual(mockSessions[1]);
  });

  it("handles fetch errors gracefully", async () => {
    vi.mocked(fetchPreviewSessions).mockRejectedValue(new Error("Network Error"));

    render(<TestComponent options={{ projectId: "p1" }} onResult={onResult} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(lastResult.loading).toBe(false);
    expect(lastResult.error).toBe("Network Error");
    expect(lastResult.sessions).toEqual([]);
  });

  it("refreshes periodically without setting loading state when silent", async () => {
    const mockSessions = [{ id: "s1" }];
    vi.mocked(fetchPreviewSessions).mockResolvedValue(mockSessions as any);

    render(<TestComponent options={{ projectId: "p1", pollInterval: 1000 }} onResult={onResult} />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchPreviewSessions).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(fetchPreviewSessions).toHaveBeenCalledTimes(2);
    // Loading shouldn't be set back to true during silent poll
    expect(lastResult.loading).toBe(false);
  });
});
