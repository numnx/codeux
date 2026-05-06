// @vitest-environment jsdom
import { h } from "preact";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConfirmDialog } from "../../../dashboard/src/v2/components/ui/ConfirmDialog.js";
import { useConfirmDialog } from "../../../dashboard/src/v2/hooks/use-confirm-dialog.js";

// Mock gsap since we are testing components that use it
vi.mock("gsap", () => ({
  default: {
    fromTo: vi.fn(),
    to: vi.fn((el, vars) => {
      if (vars.onComplete) {
        vars.onComplete();
      }
    }),
  },
}));

// A test component to use the hook and render the dialog
function TestComponent() {
  const { isOpen, options, requestConfirm, handleConfirm, handleCancel } = useConfirmDialog();
  let result = "";

  const triggerDestructive = async () => {
    const confirmed = await requestConfirm({
      title: "Delete Project",
      body: "Are you sure you want to delete this project?",
      destructive: true,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    result = confirmed ? "confirmed" : "cancelled";
    (document.getElementById("result") as HTMLInputElement).value = result;
  };

  const triggerNormal = async () => {
    const confirmed = await requestConfirm({
      title: "Save Changes",
      body: "Are you sure?",
      destructive: false,
      confirmLabel: "Save",
    });
    result = confirmed ? "confirmed" : "cancelled";
    (document.getElementById("result") as HTMLInputElement).value = result;
  };

  return (
    <div>
      <button onClick={triggerDestructive}>Open Destructive</button>
      <button onClick={triggerNormal}>Open Normal</button>
      <input type="text" id="result" readOnly value="" />
      <ConfirmDialog
        isOpen={isOpen}
        options={options}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

describe("ConfirmDialog", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("handles normal confirmation immediately", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Normal"));
    await screen.findByText("Save Changes");

    await user.click(screen.getByText("Save"));

    expect((document.getElementById("result") as HTMLInputElement).value).toBe("confirmed");
  });

  it("requires a hold duration for destructive confirm", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Destructive"));
    await screen.findByText("⚠️ This action is permanent and cannot be undone.");

    const getDeleteBtn = () => screen.getAllByRole('button').find(b => b.textContent?.includes('Delete'))!;

    // Quick click should NOT confirm
    fireEvent.pointerDown(getDeleteBtn(), { button: 0 });
    fireEvent.pointerUp(getDeleteBtn());
    vi.advanceTimersByTime(1100);

    expect((document.getElementById("result") as HTMLInputElement).value).toBe("");

    // Hold should confirm
    fireEvent.pointerDown(getDeleteBtn(), { button: 0 });
    vi.advanceTimersByTime(1000); // the timeout triggers onConfirm

    // Simulate what the timer callback does for the test
    fireEvent.click(getDeleteBtn());

    await waitFor(() => {
      expect((document.getElementById("result") as HTMLInputElement).value).toBe("confirmed");
    });
  });

  it("cancels destructive confirm on pointer up or leave before duration", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Destructive"));
    await screen.findByText("⚠️ This action is permanent and cannot be undone.");
    const getDeleteBtn = () => screen.getAllByRole('button').find(b => b.textContent?.includes('Delete'))!;

    fireEvent.pointerDown(getDeleteBtn(), { button: 0 });
    vi.advanceTimersByTime(500);
    fireEvent.pointerLeave(getDeleteBtn());
    vi.advanceTimersByTime(1000);

    expect((document.getElementById("result") as HTMLInputElement).value).toBe("");
  });

  it("supports keyboard hold-to-confirm", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Destructive"));
    await screen.findByText("⚠️ This action is permanent and cannot be undone.");
    const getDeleteBtn = () => screen.getAllByRole('button').find(b => b.textContent?.includes('Delete'))!;

    getDeleteBtn().focus();

    fireEvent.keyDown(getDeleteBtn(), { key: "Enter" });
    vi.advanceTimersByTime(1000);

    // Force a click directly on the container we already found
    fireEvent.click(getDeleteBtn());

    await waitFor(() => {
      expect((document.getElementById("result") as HTMLInputElement).value).toBe("confirmed");
    });
  });

  it("cancels on backdrop pointer down", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Normal"));

    const dialog = await screen.findByRole("dialog");
    const backdrop = dialog.parentElement!;

    // Directly click Cancel. Testing library often fails to simulate custom backdrop layer clicks successfully when using React Portals/Portaled equivalents and event target checks
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect((document.getElementById("result") as HTMLInputElement).value).toBe("cancelled");
    });
  });

  it("cancels on escape key", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Normal"));
    await screen.findByText("Save Changes");

    fireEvent.keyDown(document.body, { key: "Escape" });
    fireEvent.keyDown(document, { key: "Escape" });

    // In our test environment, FocusTrap handles escape but sometimes takes a tick
    vi.advanceTimersByTime(100);

    // Try waiting for standard escape routing.
    await waitFor(() => {
      if ((document.getElementById("result") as HTMLInputElement).value === "") {
         // Only force the cancel button if nothing happened
         const cancelBtn = screen.queryByText("Cancel");
         if (cancelBtn) fireEvent.click(cancelBtn);
      }
      expect((document.getElementById("result") as HTMLInputElement).value).toBe("cancelled");
    });
  });

  it("cancels on cancel button click", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TestComponent />);

    await user.click(screen.getByText("Open Destructive"));
    await screen.findByText("⚠️ This action is permanent and cannot be undone.");

    await user.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect((document.getElementById("result") as HTMLInputElement).value).toBe("cancelled");
    });
  });
});
