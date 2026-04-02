import { h } from "preact";
import { render, cleanup } from "@testing-library/preact";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Setup document for rendering
if (typeof document === "undefined") {
  const dom = new (require('jsdom').JSDOM)('<!doctype html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window as any;
  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true
  });
}
import { useReducedMotion } from "../../../dashboard/src/v2/hooks/use-reduced-motion.js";
import { isReducedMotion, withMotion, getGsapConfig, MOTION_TOKENS } from "../../../dashboard/src/v2/lib/motion.js";

// Helper component to test the hook
function TestComponent() {
  const reduced = useReducedMotion();
  return h("div", { "data-testid": "motion-status" }, reduced ? "reduced" : "normal");
}

describe("Reduced Motion Foundation", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    if (typeof window !== "undefined") {
      originalMatchMedia = window.matchMedia;
    }
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    if (typeof window !== "undefined") {
      window.matchMedia = originalMatchMedia as any;
    }
  });

  function mockMatchMedia(matches: boolean) {
    if (typeof window !== "undefined") {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    } else {
      global.window = {
        matchMedia: vi.fn().mockImplementation((query) => ({
          matches,
          media: query,
          onchange: null,
          addListener: vi.fn(), // deprecated
          removeListener: vi.fn(), // deprecated
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }))
      } as any;
    }
  }

  describe("isReducedMotion (lib)", () => {
    it("returns false by default if no matchMedia", () => {
      const originalWindow = global.window;
      // @ts-expect-error simulating missing window
      delete global.window;
      expect(isReducedMotion()).toBe(false);
      global.window = originalWindow;
    });

    it("returns true when prefers-reduced-motion is reduce", () => {
      mockMatchMedia(true);
      expect(isReducedMotion()).toBe(true);
    });

    it("returns false when prefers-reduced-motion is not reduce", () => {
      mockMatchMedia(false);
      expect(isReducedMotion()).toBe(false);
    });
  });

  describe("useReducedMotion (hook)", () => {
    it("returns normal state when preference is false", () => {
      mockMatchMedia(false);
      const { getByTestId } = render(h(TestComponent, null));
      expect(getByTestId("motion-status").textContent).toBe("normal");
    });

    it("returns reduced state when preference is true", () => {
      mockMatchMedia(true);
      const { getByTestId } = render(h(TestComponent, null));
      expect(getByTestId("motion-status").textContent).toBe("reduced");
    });
  });

  describe("withMotion helper", () => {
    it("returns motion value when normal", () => {
      mockMatchMedia(false);
      expect(withMotion("animate", "static")).toBe("animate");
    });

    it("returns fallback value when reduced", () => {
      mockMatchMedia(true);
      expect(withMotion("animate", "static")).toBe("static");
    });
  });

  describe("getGsapConfig helper", () => {
    it("returns original config when normal", () => {
      mockMatchMedia(false);
      const config = { duration: 1, x: 100 };
      expect(getGsapConfig(config)).toEqual(config);
    });

    it("overrides duration and delay to 0 when reduced", () => {
      mockMatchMedia(true);
      const config = { duration: 1, delay: 0.5, x: 100, ease: "power2.out" };
      expect(getGsapConfig(config)).toEqual({
        duration: 0,
        delay: 0,
        x: 100,
        ease: "power2.out"
      });
    });

    it("allows custom overrides", () => {
      mockMatchMedia(true);
      const config = { duration: 1, x: 100 };
      expect(getGsapConfig(config, { duration: 0.1, autoAlpha: 1 })).toEqual({
        duration: 0.1,
        autoAlpha: 1,
        x: 100
      });
    });
  });

  describe("Shared Motion Tokens", () => {
    it("exposes expected duration tokens", () => {
      expect(MOTION_TOKENS.duration).toBeDefined();
      expect(typeof MOTION_TOKENS.duration.normal).toBe("number");
    });

    it("exposes expected ease tokens", () => {
      expect(MOTION_TOKENS.ease).toBeDefined();
      expect(typeof MOTION_TOKENS.ease.default).toBe("string");
    });
  });
});
