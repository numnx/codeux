// @vitest-environment happy-dom

import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Overlay } from "../../../src/v2/components/ui/Overlay.js";

describe("Overlay component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders children when open", () => {
    render(
      <Overlay isOpen={true} onClose={() => {}}>
        <div data-testid="overlay-content">Content</div>
      </Overlay>
    );

    expect(screen.getByTestId("overlay-content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Overlay isOpen={false} onClose={() => {}}>
        <div data-testid="overlay-content">Content</div>
      </Overlay>
    );

    expect(screen.queryByTestId("overlay-content")).not.toBeInTheDocument();
  });
});
