
/**
 * @vitest-environment jsdom
 */
import { h } from "preact";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/preact";
import "@testing-library/jest-dom/vitest";
import { BranchNameSchemeEditor } from "../../../dashboard/src/v2/components/settings/BranchNameSchemeEditor.js";
import { SprintKeyEditor } from "../../../dashboard/src/v2/components/settings/SprintKeyEditor.js";
import { PillChoiceGroup, NumberInput, TextAreaInput } from "../../../dashboard/src/v2/components/settings/SettingsFormFields.js";

describe("Settings Accessibility", () => {
  it("BranchNameSchemeEditor renders input with accessible name and description", () => {
    render(<BranchNameSchemeEditor value="feature/" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Branch name scheme" });
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby");
  });

  it("SprintKeyEditor renders input with accessible name", () => {
    render(<SprintKeyEditor value="SPR-" onChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Sprint key prefix" });
    expect(input).toBeInTheDocument();
  });

  it("PillChoiceGroup passes aria-label", () => {
    render(<PillChoiceGroup aria-label="Testing pill" value="A" options={[{label: "A", value: "A"}]} onChange={() => {}} />);
    const grp = screen.getByRole("radiogroup", { name: "Testing pill" });
    expect(grp).toBeInTheDocument();
  });
});
