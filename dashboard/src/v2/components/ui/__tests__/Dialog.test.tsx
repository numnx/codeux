// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, cleanup } from "@testing-library/preact";
import { Dialog } from "../Dialog.js";
import { expect, test, describe, afterEach, vi } from "vitest";

describe("Dialog and Modal", () => {
  afterEach(() => {
    cleanup();
  });

  test("focus restores on Escape", async () => {
    const trigger = document.createElement("button");
    trigger.id = "trigger";
    document.body.appendChild(trigger);
    trigger.focus();

    const onClose = vi.fn();
    const { unmount } = render(
      <Dialog isOpen={true} onClose={onClose}>
        <div>Content</div>
      </Dialog>
    );

    // Escape triggers onClose
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    document.dispatchEvent(event);
    expect(onClose).toHaveBeenCalled();

    unmount();

    // Focus hook restores asynchronously via setTimeout
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });

  test("renders with accessible name", () => {
    render(
      <Dialog isOpen={true} onClose={() => {}}>
        <div>Content</div>
      </Dialog>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("Dialog");
  });

  test("does not add fallback if aria-labelledby is provided", () => {
    render(
      <Dialog isOpen={true} onClose={() => {}} ariaLabelledBy="title-id">
        <h1 id="title-id">Title</h1>
      </Dialog>
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBeNull();
    expect(dialog.getAttribute("aria-labelledby")).toBe("title-id");
  });
});
