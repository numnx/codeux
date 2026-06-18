// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { Modal } from "../Modal.js";
import { expect, test, describe, afterEach, vi } from "vitest";
import { fireEvent, waitFor } from "@testing-library/preact";

describe("Modal", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders with accessible name", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Dialog");
  });

  test("does not add fallback if aria-labelledby is provided", () => {
    render(
      <Modal isOpen={true} onClose={() => {}} ariaLabelledBy="title-id">
        <h1 id="title-id">Title</h1>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBeNull();
    expect(dialog.getAttribute("aria-labelledby")).toBe("title-id");
  });

  test("calls onClose on backdrop click if not disabled", () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Modal>
    );
    const overlay = document.querySelector('.bg-void-900\\/50');
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalled();
  });

  test("reduced motion exit timing", async () => {
    vi.useFakeTimers();
    // mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: true, // prefer-reduced-motion
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    rerender(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );

    // With reduced motion, unmounts instantly or near instantly
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    vi.useRealTimers();
  });
});
