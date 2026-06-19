/**
 * @vitest-environment jsdom
 */
import { h } from "preact";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/preact";
import "@testing-library/jest-dom/vitest";
import { BranchNameSchemeEditor } from "../BranchNameSchemeEditor";
import { SprintKeyEditor } from "../SprintKeyEditor";
import { TextInput, NumberInput, TextAreaInput } from "../SettingsFormFields";

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
});

import { PillChoiceGroup, Row, SelectInput } from "../SettingsFormFields";
import { SettingsCategoryRail } from "../SettingsCategoryRail";
import { OverrideBadge } from "../panels/SharedPanelComponents";
import { fireEvent } from "@testing-library/preact";

describe("SettingsCategoryRail", () => {
  it("renders correctly with search match and keyboard focus", () => {
    const onSwitch = vi.fn();
    render(
      <SettingsCategoryRail
        filteredCategories={[
          { id: "general", num: "01", label: "General", icon: () => <svg />, description: "Gen desc" },
          { id: "danger", num: "10", label: "Danger", icon: () => <svg />, description: "Danger desc", danger: true }
        ]}
        activeCategory="general"
        settingsSearch="danger"
        onSwitchCategory={onSwitch}
      />
    );
    const dangerBtn = screen.getByText("Danger").closest("button");
    expect(dangerBtn).toHaveClass("bg-status-red/[0.03]");

    fireEvent.click(dangerBtn!);
    expect(onSwitch).toHaveBeenCalledWith("danger");
  });
});

describe("SettingsFormFields Row with Disabled", () => {
  it("shows disabledReason text", () => {
    render(
      <Row label="Test" disabledReason="Disabled due to test">
        <div>Child</div>
      </Row>
    );
    expect(screen.getByText("Disabled due to test")).toBeInTheDocument();
  });
});

describe("OverrideBadge", () => {
  it("renders badge and reset button, and calls onReset", () => {
    const onReset = vi.fn();
    render(<OverrideBadge label="Project override" contextLabel="My Setting" onReset={onReset} />);
    const btn = screen.getByTitle("Delete project override (revert to system default)");
    expect(btn).toHaveAttribute("aria-label", "Delete project override for My Setting");
    fireEvent.click(btn);
    expect(onReset).toHaveBeenCalled();
  });
});

describe("PillChoiceGroup", () => {
  it("passes aria attributes and disables buttons", () => {
    render(
      <PillChoiceGroup
        value="A"
        onChange={() => {}}
        options={[{ value: "A", label: "Option A" }, { value: "B", label: "Option B" }]}
        disabled={true}
        aria-label="Pill Label"
        aria-description="Pill Desc"
      />
    );
    const btnA = screen.getByText("Option A").closest("button");
    expect(btnA).toHaveAttribute("disabled");
    expect(btnA).toHaveAttribute("aria-label", "Pill Label");
    expect(btnA).toHaveAttribute("aria-description", "Pill Desc");
  });
});

describe("SettingsFormFields Invalid State", () => {
  it("NumberInput passes aria-invalid", () => {
    render(
      <NumberInput
        value={10}
        onChange={() => {}}
        aria-invalid="true"
      />
    );
    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("TextInput passes aria-invalid", () => {
    render(
      <TextInput
        value="test"
        onChange={() => {}}
        aria-invalid="true"
      />
    );
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});
