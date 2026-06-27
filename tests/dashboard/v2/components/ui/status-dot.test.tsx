/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { StatusDot } from "../../../../../dashboard/src/v2/components/ui/StatusDot";

describe("StatusDot", () => {
  it("renders running state", () => {
    const { container } = render(<StatusDot status="running" />);
    expect(container.innerHTML).toContain("animate-ping");
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("Status: running");
  });

  it("renders failed state", () => {
    const { container } = render(<StatusDot status="failed" />);
    expect(container.innerHTML).toContain("bg-status-red");
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("Status: failed");
  });

  it("renders intervention state", () => {
    const { container } = render(<StatusDot status="intervention" />);
    expect(container.innerHTML).toContain("bg-status-amber");
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("Status: intervention");
  });

  it("renders idle state", () => {
    const { container } = render(<StatusDot status="idle" />);
    expect(container.innerHTML).toContain("bg-slate-400");
    const el = container.querySelector('[role="img"]');
    expect(el?.getAttribute("aria-label")).toBe("Status: idle");
  });
});
