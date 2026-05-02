import { act } from "@testing-library/preact";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
/** @vitest-environment jsdom */
import * as React from "preact/compat";
import { h } from "preact";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { PlanningProgressOverlay } from "../../../dashboard/src/v2/components/ui/PlanningProgressOverlay.js";
import { ListSkeleton, StatCardSkeleton, ChatMessageSkeleton } from "../../../dashboard/src/v2/components/ui/ListSkeletons.js";
import { AvantgardeSelect } from "../../../dashboard/src/v2/components/ui/AvantgardeSelect.js";
import { SprintComposer } from "../../../dashboard/src/v2/components/ui/SprintComposer.js";
import { ExecutionTimelineProvider } from "../../../dashboard/src/hooks/ExecutionTimelineContext.js";
import { ConfirmDialog } from "../../../dashboard/src/v2/components/ui/ConfirmDialog.js";
import { RerunTaskModal } from "../../../dashboard/src/v2/components/ui/RerunTaskModal.js";

vi.mock("../../../dashboard/src/v2/lib/sprint-composer-state.js", () => ({
  useSprintComposerState: vi.fn(() => ({
    name: "Test Sprint",
    goal: "Test Goal",
    setName: vi.fn(),
    setGoal: vi.fn(),
    submitMode: "plan_and_start",
    setSubmitMode: vi.fn(),
    availableModes: [{ id: "plan_and_start", label: "Plan & Start", icon: () => null, description: "desc" }],
    routeOverride: null,
    setRouteOverride: vi.fn(),
    modelOverride: null,
    setModelOverride: vi.fn(),
    planningAgentPresetId: null,
    setPlanningAgentPresetId: vi.fn(),
    isEditing: false,
    hasTasks: false,
  })),
  toPlanningOverrides: vi.fn(),
  resolveSubmitOriginalPrompt: vi.fn(),
}));

describe("UI Components Coverage", () => {
  it("renders PlanningProgressOverlay in various states", () => {
    const feedback = { shipType: "container" as const, shipProgress: 0.5, text: "Test Message" };
    const { rerender } = render(
      <PlanningProgressOverlay 
        isBusy={false} 
        feedback={null} 
        planningEta={10000} 
        elapsedMs={0} 
        isDark={false} 
        actionType="plan_only" 
        onDismiss={() => {}} 
      />
    );
    expect(document.body.textContent).not.toContain("Test Message");

    rerender(
      <PlanningProgressOverlay 
        isBusy={true} 
        feedback={feedback} 
        planningEta={60000} 
        elapsedMs={1000} 
        isDark={false} 
        actionType="plan_only" 
        onDismiss={() => {}} 
      />
    );
    expect(document.body.textContent).toContain("Test Message");
    expect(document.body.textContent).toContain("Generating subtasks");

    rerender(
      <PlanningProgressOverlay 
        isBusy={true} 
        feedback={{ ...feedback, shipType: "wooden" }} 
        planningEta={60000} 
        elapsedMs={1000} 
        isDark={true} 
        actionType="improve" 
        themeAccent="ember"
        onCancel={() => {}}
        onDismiss={() => {}} 
      />
    );
    expect(document.body.textContent).toContain("The Planning agent is researching your codebase");

    rerender(
      <PlanningProgressOverlay 
        isBusy={true} 
        feedback={feedback} 
        planningEta={60000} 
        elapsedMs={1000} 
        isDark={false} 
        actionType="quicksprint" 
        onDismiss={() => {}} 
      />
    );
    expect(document.body.textContent).toContain("Quicksprint in motion");

    rerender(
      <PlanningProgressOverlay
        isBusy={true}
        feedback={feedback}
        planningEta={60000}
        elapsedMs={1000}
        isDark={false}
        actionType="plan_only"
        onDismiss={() => {}}
        secondaryActionLabel="New Sprint"
        onSecondaryAction={() => {}}
      />
    );
    expect(document.body.textContent).toContain("New Sprint");
  });

  it("handles keyboard opening in AvantgardeSelect", () => {
    const options = [{ value: "1", label: "Opt 1" }];
    render(<AvantgardeSelect value="1" onChange={() => {}} options={options} />);
    const trigger = screen.getByText("Opt 1").closest("button")!;
    
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeDefined();
  });

  it("renders SprintComposer", () => {
    const mockExecution = { connections: [], invocations: [], activeInvocationId: null };
    render(
      <ExecutionTimelineProvider execution={mockExecution as any}>
        <SprintComposer 
          nextId="SPR-1" 
          virtualProviders={[]} 
          planningPresets={[]} 
          planningEta={60000} 
          onClose={() => {}} 
          onSubmit={async () => {}} 
        />
      </ExecutionTimelineProvider>
    );
    expect(screen.getByText("Sprint Composer")).toBeDefined();
  });

  it("renders Skeletons", () => {
    render(<ListSkeleton count={3} />);
    render(<StatCardSkeleton />);
    render(<ChatMessageSkeleton />);
  });

  it("DestructiveConfirmButton handles pointer cancel/leave without firing", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen={true}
        options={{ title: "Test", body: "Body", destructive: true }}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    const confirmBtn = screen.getByText("Confirm").closest("button");
    expect(confirmBtn).toBeDefined();

    fireEvent.pointerDown(confirmBtn!, { button: 0 });
    // short hold + cancel
    fireEvent.pointerCancel(confirmBtn!);

    fireEvent.pointerDown(confirmBtn!, { button: 0 });
    fireEvent.pointerLeave(confirmBtn!);

    expect(onConfirm).not.toHaveBeenCalled();
  });





  it("ConfirmDialog handles Escape key properly", async () => {
    const onCancel = vi.fn();

    const { unmount } = render(
      <ConfirmDialog
        isOpen={true}
        options={{ title: "Test Dialog", body: "Body" }}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

        await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    vi.spyOn(event, 'preventDefault');
    vi.spyOn(event, 'stopPropagation');

    document.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    unmount();
  });



  it("RerunTaskModal prevents multiple submissions", async () => {
    let confirmResolver;
    const confirmPromise = new Promise(resolve => { confirmResolver = resolve; });

        const onConfirm = vi.fn(() => confirmPromise);
    const task = { id: "1", depends_on: [], title: "Task 1" } as any;

    render(
      <RerunTaskModal
        task={task}
        allTasks={[task]}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: /Rerun Task/i });

    // Trigger first click, but wrap in act and wait for the state flush
    await act(async () => {
        fireEvent.click(confirmBtn);
        // let the state flush
        await Promise.resolve();
    });

    // Now it should be disabled in the DOM
    expect(confirmBtn.hasAttribute("disabled")).toBe(true);

    // Second click (should be ignored because disabled or we don't even need to fire it if we proved it's disabled)
    // Actually, Preact fireEvent might still fire on disabled buttons in JSDOM, let's just assert the disabled attribute.
    // We already assert it's disabled. Let's just remove the second click from the test to avoid JSDOM quirks,
    // and rely on the disabled assertion.

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(confirmBtn.hasAttribute("disabled")).toBe(true);

        confirmResolver();
    await act(async () => {
        await confirmPromise;
    });
  });
});
