// @vitest-environment happy-dom

import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Drawer } from "../../../src/v2/components/ui/Drawer.js";

describe("Drawer component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders children when open", () => {
    render(
      <Drawer isOpen={true} onClose={() => {}}>
        <div data-testid="drawer-content">Content</div>
      </Drawer>
    );

    expect(screen.getByTestId("drawer-content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Drawer isOpen={false} onClose={() => {}}>
        <div data-testid="drawer-content">Content</div>
      </Drawer>
    );

    expect(screen.queryByTestId("drawer-content")).not.toBeInTheDocument();
  });
});
