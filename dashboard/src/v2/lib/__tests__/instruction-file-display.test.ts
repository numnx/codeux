import { describe, expect, it } from "vitest";
import { formatBytes } from "../instruction-file-display.js";

describe("formatBytes", () => {
  it("formats bytes using standard units", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1500 * 1024)).toBe("1.5 MB");
  });

  it("translates empty bytes fallback to Spanish", () => {
    expect(formatBytes(0, "es")).toBe("Vacío");
  });
});
