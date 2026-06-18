/**
 * @vitest-environment jsdom
 */
import { h } from "preact";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import "@testing-library/jest-dom/vitest";
import { BranchNameSchemeEditor } from "../BranchNameSchemeEditor";
import { SprintKeyEditor } from "../SprintKeyEditor";
import { TextInput, NumberInput, TextAreaInput } from "../SettingsFormFields";
import { Toggle } from "../../ui/Toggle";
import { ActionButton } from "../SettingsSurface";
import { OverrideBadge } from "../panels/SharedPanelComponents";

describe("SettingsControls Accessibility", () => {
  afterEach(() => {
    cleanup();
  });

  it("BranchNameSchemeEditor passes aria-label and aria-description", () => {
    render(
      <BranchNameSchemeEditor
        value="test"
        onChange={() => {}}
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-label", "Sprint branch scheme");
    expect(input).toHaveAttribute("aria-description", "Template used when naming sprint branches.");
  });

  it("SprintKeyEditor passes aria-label and aria-description", () => {
    render(
      <SprintKeyEditor
        value="SPR"
        onChange={() => {}}
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-label", "Sprint key prefix");
    expect(input).toHaveAttribute("aria-description", "Prefix used when generating sprint keys (e.g. SPR-1).");
  });

  it("TextInput passes aria-label and aria-description", () => {
    render(
      <TextInput
        value="test"
        onChange={() => {}}
        aria-label="Test Label"
        aria-description="Test Description"
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-label", "Test Label");
    expect(input).toHaveAttribute("aria-description", "Test Description");
  });

  it("NumberInput passes aria-label and aria-description", () => {
    render(
      <NumberInput
        value={10}
        onChange={() => {}}
        aria-label="Num Label"
        aria-description="Num Description"
      />
    );
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-label", "Num Label");
    expect(input).toHaveAttribute("aria-description", "Num Description");
  });

  it("TextAreaInput passes aria-label and aria-description", () => {
    render(
      <TextAreaInput
        value="test"
        onChange={() => {}}
        aria-label="Textarea Label"
        aria-description="Textarea Description"
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-label", "Textarea Label");
    expect(input).toHaveAttribute("aria-description", "Textarea Description");
  });

  it("Toggle passes aria-label and aria-checked", () => {
    render(
      <Toggle
        value={true}
        onChange={() => {}}
        aria-label="Toggle Label"
      />
    );
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-label", "Toggle Label");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("ActionButton passes disabled correctly and retains its accessible name", () => {
    render(
      <ActionButton
        label="Destroy Action"
        onClick={() => {}}
        tone="danger"
        disabled={true}
      />
    );
    const button = screen.getByRole("button", { name: "Destroy Action" });
    expect(button).toBeDisabled();
  });

  it("OverrideBadge reset button has accessible name", () => {
    render(
      <OverrideBadge
        label="Project override"
        contextLabel="Setting name"
        onReset={() => {}}
      />
    );
    const button = screen.getByRole("button", { name: "Delete project override for Setting name" });
    expect(button).toBeInTheDocument();
  });
});
