/**
 * @vitest-environment jsdom
 */
/// <reference types="@testing-library/jest-dom" />
import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { describe, it, expect, vi, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { TopCardsModeRenderer } from "../../../src/v2/components/stats/TopCardsModeRenderer.js";

expect.extend(matchers);

// Setup GSAP mock
vi.mock("gsap", () => ({
  default: {
    killTweensOf: vi.fn(),
    fromTo: vi.fn().mockImplementation((el, from, to) => {
      if (to?.onComplete) to.onComplete();
    }),
    to: vi.fn().mockImplementation((el, config) => {
      if (config?.onComplete) config.onComplete();
    }),
    set: vi.fn(),
    context: vi.fn().mockImplementation((cb) => { cb(); return { revert: vi.fn() }; })
  }
}));

const mockStats = {
  purposes: [],
  usage: {
    wallTimeMs: 120000,
    inputTokens: 1500,
    outputTokens: 300,
    reportedInvocationCount: 40,
    estimatedInvocationCount: 5,
    unavailableInvocationCount: 1,
    unsupportedInvocationCount: 0
  },
  providers: [],
  ledgers: {
    tasks: [],
    invocations: []
  }
};

const defaultProps = {
  stats: mockStats as any,
  providerSegments: [],
  tokenSegments: [],
  sourceSegments: []
};

describe("TopCardsModeRenderer Accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render a section with a proper accessible role/structure", () => {
    render(<TopCardsModeRenderer mode="trend" {...defaultProps} />);
    const container = screen.getByTestId("top-cards-renderer");
    expect(container.tagName.toLowerCase()).toBe("section");
  });
});
