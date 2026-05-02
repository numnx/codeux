import { describe, expect, it } from "vitest";
import { calculatePosition } from "../positioning/index.js";

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

describe("calculatePosition", () => {
  it("keeps a right-positioned tooltip inside the viewport after flipping left", () => {
    const result = calculatePosition({
      triggerRect: rect({ left: 640, top: 180, width: 120, height: 80 }),
      contentRect: rect({ width: 640, height: 260 }),
      position: "right",
      viewportWidth: 800,
      viewportHeight: 600,
      padding: 8,
      gap: 8,
    });

    expect(result.left).toBeGreaterThanOrEqual(8);
    expect(result.left + 640).toBeLessThanOrEqual(792);
    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + 260).toBeLessThanOrEqual(592);
  });

  it("uses viewport-capped dimensions when content is wider than the viewport", () => {
    const result = calculatePosition({
      triggerRect: rect({ left: 120, top: 80, width: 100, height: 60 }),
      contentRect: rect({ width: 900, height: 240 }),
      position: "right",
      viewportWidth: 360,
      viewportHeight: 600,
      padding: 8,
      gap: 8,
    });

    expect(result.left).toBe(8);
    expect(result.top).toBeGreaterThanOrEqual(8);
    expect(result.top + 240).toBeLessThanOrEqual(592);
  });
});
