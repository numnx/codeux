// @vitest-environment jsdom
import { h, Fragment } from "preact";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/preact";
import { useFocusTrap } from "../use-focus-trap.js";
import { expect, test, describe, afterEach, vi } from "vitest";

describe("useFocusTrap", () => {
  afterEach(() => {
    cleanup();
  });

  const TestComponent = ({ active, onClose, empty = false, initialFocusRef, restoreFocus = true }: any) => {
    const trapRef = useFocusTrap(active, { onClose, initialFocusRef, restoreFocus });
    return (
      <div>
        <button id="outside">Outside</button>
        {active && (
          <div ref={trapRef as any} data-testid="trap">
            {!empty && (
              <Fragment>
                <button id="inside1">Inside 1</button>
                <button id="inside2">Inside 2</button>
              </Fragment>
            )}
            {empty && <div id="empty-content">Empty</div>}
          </div>
        )}
      </div>
    );
  };

  test("traps focus and handles Escape", async () => {
    const onClose = vi.fn();
    render(<TestComponent active={true} onClose={onClose} />);

    // Test Escape key
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  test("prevents focus escape when tabbing in empty trap", async () => {
    const onClose = vi.fn();
    render(<TestComponent active={true} onClose={onClose} empty={true} />);

    await waitFor(() => {
      // The initial focus targets the container
      const trap = screen.getByTestId("trap");
      expect(document.activeElement).toBe(trap);
    });

    // Test Tab key on empty trap - shouldn't focus outside, should stay on container
    fireEvent.keyDown(document, { key: "Tab" });
    const trap = screen.getByTestId("trap");
    expect(document.activeElement).toBe(trap);
  });

  test("initial focus targets ref", async () => {
    const initialFocusRef = { current: null };
    render(
      <div>
        <input ref={(el: any) => initialFocusRef.current = el} id="initial-focus-input" />
        <TestComponent active={true} onClose={() => {}} initialFocusRef={initialFocusRef} />
      </div>
    );

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("initial-focus-input");
    });
  });

  test("Tab wraparound works forward", async () => {
    render(<TestComponent active={true} onClose={() => {}} />);

    // First, let the hook automatically focus the first element (inside1)
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("inside1");
    });

    const inside1 = document.getElementById("inside1");
    const inside2 = document.getElementById("inside2");

    // Focus last element
    inside2?.focus();

    // Press Tab
    fireEvent.keyDown(document, { key: "Tab" });

    // Should wrap around to first element
    expect(document.activeElement?.id).toBe("inside1");
  });

  test("Tab wraparound works backward (Shift+Tab)", async () => {
    render(<TestComponent active={true} onClose={() => {}} />);

    // First, let the hook automatically focus the first element (inside1)
    await waitFor(() => {
      expect(document.activeElement?.id).toBe("inside1");
    });

    const inside1 = document.getElementById("inside1");
    const inside2 = document.getElementById("inside2");

    // Press Shift+Tab on first element
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    // Should wrap around to last element
    expect(document.activeElement?.id).toBe("inside2");
  });


  test("ignores hidden, disabled, and inert elements", async () => {
    const TestHiddenComponent = ({ active }: any) => {
      const trapRef = useFocusTrap(active, {});
      return (
        <div>
          {active && (
            <div ref={trapRef as any} data-testid="trap">
              <button disabled id="hidden1">Hidden 1</button>
              <button aria-hidden="true" id="hidden2">Hidden 2</button>
              <button id="visible1">Visible 1</button>
              <div inert id="hidden3" tabIndex={0}>Hidden 3</div>
              <button style={{ display: 'none' }} id="hidden4">Hidden 4</button>
            </div>
          )}
        </div>
      );
    };

    render(<TestHiddenComponent active={true} />);

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("visible1");
    });

    // Tab on the only visible element should keep focus on it
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.id).toBe("visible1");
  });

  test("ignores nested hidden and inert elements", async () => {
    const TestNestedHiddenComponent = ({ active }: any) => {
      const trapRef = useFocusTrap(active, {});
      return (
        <div>
          {active && (
            <div ref={trapRef as any} data-testid="trap">
              <div inert>
                <button id="nested-inert">Nested Inert</button>
              </div>
              <div aria-hidden="true">
                <button id="nested-hidden">Nested Hidden</button>
              </div>
              <button id="visible1">Visible 1</button>
            </div>
          )}
        </div>
      );
    };

    render(<TestNestedHiddenComponent active={true} />);

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("visible1");
    });

    // Tab on the only visible element should keep focus on it
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement?.id).toBe("visible1");
  });

  test("Escape only closes the most recently opened trap", async () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    const NestedTraps = () => {
      const trap1Ref = useFocusTrap(true, { onClose: onClose1 });
      const trap2Ref = useFocusTrap(true, { onClose: onClose2 });
      return (
        <div>
          <div ref={trap1Ref as any} data-testid="trap1">
            <button id="btn1">Button 1</button>
          </div>
          <div ref={trap2Ref as any} data-testid="trap2">
            <button id="btn2">Button 2</button>
          </div>
        </div>
      );
    };

    render(<NestedTraps />);

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("btn2");
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose2).toHaveBeenCalled();
    expect(onClose1).not.toHaveBeenCalled();
  });

  test("restores focus to body if trigger unmounts", async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(<TestComponent active={true} onClose={() => {}} />);

    // Unmount closes the trap AND remove trigger from DOM
    unmount();
    trigger.remove();

    // Wait for the restore timeout
    await waitFor(() => {
      expect(document.activeElement).toBe(document.body);
    });
  });

  test("restores focus on close", async () => {
    // We simulate a button click that triggers the component to mount, meaning trigger is document.activeElement
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const originalFocus = trigger.focus.bind(trigger);
    const focusSpy = vi.fn((options?: FocusOptions) => originalFocus(options));
    trigger.focus = focusSpy;
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    const { unmount } = render(<TestComponent active={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(document.activeElement?.id).toBe("inside1");
    });

    // Unmount closes the trap
    unmount();

    // Wait for the restore timeout
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
    expect(focusSpy).toHaveBeenLastCalledWith({ preventScroll: true });
  });
});
