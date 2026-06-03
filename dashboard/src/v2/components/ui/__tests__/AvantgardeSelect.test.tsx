/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/preact";
import * as matchers from "@testing-library/jest-dom/matchers";
import { AvantgardeSelect, type SelectOption } from "../AvantgardeSelect.js";

expect.extend(matchers);

vi.mock("gsap", () => ({
  default: {
    context: vi.fn((callback: () => void) => {
      callback();
      return { revert: vi.fn() };
    }),
    fromTo: vi.fn((_target: unknown, _fromVars: unknown, toVars: { onComplete?: () => void } | undefined) => {
      toVars?.onComplete?.();
      return {};
    }),
    to: vi.fn((_target: unknown, vars: { onComplete?: () => void } | undefined) => {
      vars?.onComplete?.();
      return {};
    }),
  },
}));

const rect = (values: Partial<DOMRect>): DOMRect => ({
  x: values.left ?? 0,
  y: values.top ?? 0,
  top: values.top ?? 0,
  left: values.left ?? 0,
  right: values.right ?? ((values.left ?? 0) + (values.width ?? 0)),
  bottom: values.bottom ?? ((values.top ?? 0) + (values.height ?? 0)),
  width: values.width ?? 0,
  height: values.height ?? 0,
  toJSON: () => ({}),
});

describe("AvantgardeSelect", () => {
  const options: SelectOption[] = [
    { value: "alpha", label: "Alpha" },
    { value: "beta", label: "Beta" },
    { value: "gamma", label: "Gamma" },
  ];

  let triggerRect = rect({ left: 24, top: 24, width: 180, height: 40 });
  let boundaryRect = rect({ left: 0, top: 0, width: 320, height: 260 });
  let panelHeight = 240;
  let getBoundingClientRectSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    triggerRect = rect({ left: 24, top: 24, width: 180, height: 40 });
    boundaryRect = rect({ left: 0, top: 0, width: 320, height: 260 });
    panelHeight = 240;

    getBoundingClientRectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.tagName === "BUTTON" && this.getAttribute("aria-haspopup") === "listbox") {
        return triggerRect;
      }

      if (this.dataset.boundary === "true") {
        return boundaryRect;
      }

      if (this.style.position === "fixed" && this.style.zIndex === "9999") {
        return rect({ left: 0, top: 0, width: 180, height: panelHeight });
      }

      return rect({ left: 0, top: 0, width: 0, height: 0 });
    });
  });

  afterEach(() => {
    cleanup();
    getBoundingClientRectSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it("moves the highlighted option with eased transitions when navigating with arrow keys", () => {
    render(
      <div data-boundary="true" style={{ overflow: "hidden", borderRadius: "12px" }}>
        <AvantgardeSelect value="alpha" onChange={vi.fn()} options={options} aria-label="Pick an option" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pick an option" }));

    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveFocus();

    fireEvent.keyDown(listbox, { key: "ArrowDown" });

    expect(listbox).toHaveAttribute("aria-activedescendant", "select-option-beta");
    const activeOption = screen.getByRole("option", { name: "Beta" });
    expect(activeOption.className).toContain("transition-[background-color,color,box-shadow,transform]");
    expect(activeOption.className).toContain("ease-[cubic-bezier(0.4,0,0.2,1)]");
    expect(activeOption.className).toContain("bg-signal-500/10");

    fireEvent.keyDown(listbox, { key: "ArrowUp" });

    expect(listbox).toHaveAttribute("aria-activedescendant", "select-option-alpha");
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    render(
      <div data-boundary="true" style={{ overflow: "hidden", borderRadius: "12px" }}>
        <AvantgardeSelect value="alpha" onChange={vi.fn()} options={options} aria-label="Pick an option" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pick an option" }));

    const listbox = screen.getByRole("listbox");
    fireEvent.keyDown(listbox, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).toBeNull();
      expect(screen.getByRole("button", { name: "Pick an option" })).toHaveFocus();
    });
  });

  it("keeps the portal inside the boundary after resize-driven repositioning", async () => {
    render(
      <div
        data-boundary="true"
        style={{
          overflow: "hidden",
          borderRadius: "12px",
          width: "320px",
          height: "260px",
        }}
      >
        <AvantgardeSelect value="alpha" onChange={vi.fn()} options={options} aria-label="Pick an option" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Pick an option" }));

    const panel = screen.getByRole("listbox").parentElement as HTMLElement;
    const initialTop = parseFloat(panel.style.top);
    const initialLeft = parseFloat(panel.style.left);

    triggerRect = rect({ left: 250, top: 180, width: 40, height: 40 });
    boundaryRect = rect({ left: 0, top: 0, width: 320, height: 260 });

    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));

    await waitFor(() => {
      const nextTop = parseFloat(panel.style.top);
      const nextLeft = parseFloat(panel.style.left);
      expect(nextTop).not.toBe(initialTop);
      expect(nextLeft).not.toBe(initialLeft);
      expect(nextTop).toBeGreaterThanOrEqual(8);
      expect(nextTop).toBeLessThanOrEqual(252);
      expect(nextLeft).toBeGreaterThanOrEqual(8);
      expect(nextLeft).toBeLessThanOrEqual(312);
    });
  });
});
