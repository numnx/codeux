// @vitest-environment happy-dom

import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Dialog } from "../../../src/v2/components/ui/Dialog.js";

describe("Dialog component", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders children when open", () => {
    render(
      <Dialog isOpen={true} onClose={() => {}}>
        <div data-testid="dialog-content">Content</div>
      </Dialog>
    );

    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <Dialog isOpen={false} onClose={() => {}}>
        <div data-testid="dialog-content">Content</div>
      </Dialog>
    );

    expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
  });
});
