import { describe, expect, it } from "vitest";
import {
  getBuiltinTemplates,
  getCustomTemplates,
  getBuiltinPurposeOptions,
  getActiveBuiltinPurpose,
  getVisibleBuiltinTemplates,
  getCombinedPrompt,
} from "../../../dashboard/src/v2/lib/quicksprint-panel-view-models.js";
import type { QuicksprintTemplateRecord } from "../../../src/contracts/quicksprint-types.js";
import type { AgentPreset } from "../../../dashboard/src/v2/types.js";

describe("Quicksprint Panel View Models", () => {
  describe("Template grouping", () => {
    it("separates builtin and custom templates", () => {
      const templates: QuicksprintTemplateRecord[] = [
        { id: "1", name: "Builtin 1", isBuiltIn: true, agentInstructionMarkdown: "1" },
        { id: "2", name: "Custom 1", isBuiltIn: false, agentInstructionMarkdown: "2" },
        { id: "3", name: "Builtin 2", isBuiltIn: true, agentInstructionMarkdown: "3" },
      ];

      expect(getBuiltinTemplates(templates)).toHaveLength(2);
      expect(getCustomTemplates(templates)).toHaveLength(1);
    });

    it("handles empty lists", () => {
      expect(getBuiltinTemplates([])).toHaveLength(0);
      expect(getCustomTemplates([])).toHaveLength(0);
    });
  });

  describe("Purpose derivation", () => {
    it("extracts unique purposes from builtins", () => {
      const templates: QuicksprintTemplateRecord[] = [
        { id: "1", name: "T1", isBuiltIn: true, agentInstructionMarkdown: "1", purpose: "web", purposeLabel: "Web App" },
        { id: "2", name: "T2", isBuiltIn: true, agentInstructionMarkdown: "2", purpose: "web", purposeLabel: "Web App" },
        { id: "3", name: "T3", isBuiltIn: true, agentInstructionMarkdown: "3", purpose: "mobile", purposeLabel: "Mobile App" },
        { id: "4", name: "T4", isBuiltIn: true, agentInstructionMarkdown: "4" }, // missing purpose falls back to "general"
      ];

      const options = getBuiltinPurposeOptions(templates);
      expect(options).toHaveLength(3);
      expect(options.map(o => o.value)).toEqual(["web", "mobile", "general"]);
      expect(options.find(o => o.value === "general")?.label).toBe("General");
    });

    it("gets active purpose safely", () => {
      const options = [
        { value: "web", label: "Web" },
        { value: "mobile", label: "Mobile" },
      ];
      expect(getActiveBuiltinPurpose(options, "mobile")).toEqual(options[1]);
      expect(getActiveBuiltinPurpose(options, "unknown")).toEqual(options[0]); // fallback to first
      expect(getActiveBuiltinPurpose([], "unknown")).toBeNull();
    });

    it("filters visible templates", () => {
      const templates: QuicksprintTemplateRecord[] = [
        { id: "1", name: "T1", isBuiltIn: true, agentInstructionMarkdown: "1", purpose: "web" },
        { id: "2", name: "T2", isBuiltIn: true, agentInstructionMarkdown: "2", purpose: "mobile" },
      ];

      const active = { value: "mobile", label: "Mobile" };
      expect(getVisibleBuiltinTemplates(templates, active)).toHaveLength(1);
      expect(getVisibleBuiltinTemplates(templates, active)[0].id).toBe("2");
    });
  });

  describe("Combined prompt generation", () => {
    it("returns empty string if no template selected", () => {
      expect(getCombinedPrompt(null, [], "", 5)).toBe("");
    });

    it("combines agent preset, template instructions, additional prompt, and task count", () => {
      const template: QuicksprintTemplateRecord = {
        id: "1",
        name: "Test",
        isBuiltIn: false,
        agentInstructionMarkdown: "Do the core task.",
        agentPresetId: "agent-a",
      };

      const agents: AgentPreset[] = [
        { id: "agent-a", name: "Agent A", instructionMarkdown: "Be helpful." },
      ];

      const combined = getCombinedPrompt(template, agents, "Also do this.", 3);

      expect(combined).toContain('You are operating as the "Agent A" agent.');
      expect(combined).toContain("Be helpful.");
      expect(combined).toContain("Do the core task.");
      expect(combined).toContain("Also do this.");
      expect(combined).toContain("Produce exactly 3 subtasks.");
    });

    it("handles missing optional pieces cleanly", () => {
      const template: QuicksprintTemplateRecord = {
        id: "1",
        name: "Test",
        isBuiltIn: false,
        agentInstructionMarkdown: "Do the core task.",
      };

      const combined = getCombinedPrompt(template, [], "  ", 5);

      expect(combined).not.toContain("Agent Context");
      expect(combined).not.toContain("Additional Instructions");
      expect(combined).toContain("Do the core task.");
      expect(combined).toContain("Produce exactly 5 subtasks.");
    });
  });
});
