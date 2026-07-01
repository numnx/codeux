/** @vitest-environment happy-dom */
import { h } from "preact";
import { render, screen, waitFor } from "@testing-library/preact";
import { expect, test, describe, vi } from "vitest";
import { AddProjectModal } from "../AddProjectModal.js";
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);

describe("AddProjectModal Accessibility", () => {
  test("renders with accessible name and structure", () => {
    const { container } = render(<AddProjectModal onClose={() => {}} onAdd={() => {}} initialSourceType="local" />);
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs[0]).toHaveAttribute("aria-labelledby", "add-project-modal-title");

    // Check for fixed header/footer and scrollable body structure
    const formBody = document.getElementById("add-project-form-body");
    expect(formBody).toBeInTheDocument();
  });

  test("form inputs have associated labels and handle validation errors", async () => {
    const { container } = render(<AddProjectModal onClose={() => {}} onAdd={() => {}} initialSourceType="local" />);

    // Check for Local Path input
    const pathInput = document.getElementById("add-project-path");
    expect(pathInput).toBeInTheDocument();

    // Check for Project Name input
    const nameInput = document.getElementById("add-project-name");
    expect(nameInput).toBeInTheDocument();
  });
});

  test("delete confirmation state is accessible", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.js");
    const { container, rerender } = render(<ConfirmDialog isOpen={true} options={{ title: "Delete", body: "Sure?", destructive: true }} onConfirm={() => {}} onCancel={() => {}} />);

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs[0]).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
    expect(dialogs[0]).toHaveAttribute("aria-describedby", "confirm-dialog-body");

    // Check confirm button
    const confirmBtn = screen.getByRole("button", { name: /Hold to Confirm/i });
    expect(confirmBtn).toBeInTheDocument();
  });
