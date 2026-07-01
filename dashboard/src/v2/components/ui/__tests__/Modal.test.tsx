// @vitest-environment jsdom
import { h } from "preact";
import { useState } from "preact/hooks";
import { render, screen, cleanup } from "@testing-library/preact";
import { Modal } from "../Modal.js";
import { expect, test, describe, afterEach } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
expect.extend(matchers);

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

  test("omits aria-describedby when not provided", () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Modal>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
  });
});


test("restores focus to trigger on close", async () => {
    const TestComponent = () => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div>
                <button onClick={() => setIsOpen(true)}>Open</button>
                <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                    <div>Modal Content</div>
                </Modal>
            </div>
        );
    };
    render(<TestComponent />);

    const button = screen.getByRole("button", { name: "Open" });
    button.focus();
    button.click();

    // It takes some frames to open and trap focus
    await new Promise((resolve) => setTimeout(resolve, 100));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Hit Escape
    const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true });
    document.dispatchEvent(escapeEvent);

    // It takes some frames to close and restore focus
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(button).toHaveFocus();
});
