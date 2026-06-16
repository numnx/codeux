import type { FunctionComponent } from "preact";
import type { SystemSettings } from "../../../../types.js";
import { Choice, ToggleRow } from "./SharedComponents.js";

interface AutomationStepProps {
  settings: SystemSettings | null;
  updateSettings: (recipe: (current: any) => any) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export const AutomationStep: FunctionComponent<AutomationStepProps> = ({ settings, updateSettings, onNext, onPrev }) => {
  if (!settings) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Choice title="Automation level" value={settings.defaults.automationLevel} options={[
        ["ALWAYS_ASK", "Manual"],
        ["SEMI_AUTO", "Semi-auto"],
        ["FULL", "Full auto"],
      ]} onChange={(value) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, automationLevel: value as SystemSettings["defaults"]["automationLevel"] } }))} />
      <Choice title="Feature PR automerge" value={settings.defaults.ciIntelligence.featurePrAutoMergeMode} options={[
        ["OFF", "Off"],
        ["CREATE_PR", "Create PR"],
        ["WHEN_GREEN", "When green"],
        ["ALWAYS", "Always"],
      ]} onChange={(value) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, ciIntelligence: { ...current.defaults.ciIntelligence, featurePrAutoMergeMode: value as SystemSettings["defaults"]["ciIntelligence"]["featurePrAutoMergeMode"] } } }))} />
      <Choice title="Main PR automerge" value={settings.defaults.ciIntelligence.mainBranchAutoMergeMode} options={[
        ["OFF", "Off"],
        ["CREATE_PR", "Create PR"],
        ["WHEN_GREEN", "When green"],
        ["ALWAYS", "Always"],
      ]} onChange={(value) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, ciIntelligence: { ...current.defaults.ciIntelligence, mainBranchAutoMergeMode: value as SystemSettings["defaults"]["ciIntelligence"]["mainBranchAutoMergeMode"] } } }))} />
      <ToggleRow title="Auto-approve plans" description="Let planning continue without manual approval when the generated plan is available." checked={settings.defaults.automationInterventions.autoApprovePlan} onChange={(checked) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, automationInterventions: { ...current.defaults.automationInterventions, autoApprovePlan: checked } } }))} />
      <ToggleRow title="Memory system" description="Capture sprint and agent learnings for later retrieval." checked={settings.defaults.memory.enabled} onChange={(checked) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, memory: { ...current.defaults.memory, enabled: checked } } }))} />
      <ToggleRow title="Resolve main merge conflicts" description="Let a virtual worker attempt conflicts on the main branch merge gate before escalating." checked={settings.defaults.ciIntelligence.resolveMainMergeConflicts} onChange={(checked) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, ciIntelligence: { ...current.defaults.ciIntelligence, resolveMainMergeConflicts: checked } } }))} />
      <ToggleRow title="Resolve feature merge conflicts" description="Let a virtual worker resolve feature PR conflicts against the sprint branch when safe." checked={settings.defaults.ciIntelligence.resolveMergeConflicts} onChange={(checked) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, ciIntelligence: { ...current.defaults.ciIntelligence, resolveMergeConflicts: checked } } }))} />
      <ToggleRow title="Enable QA agent" description="Run quality-assurance reviews after task and sprint completion events." checked={settings.defaults.agents.qualityAssurance.enabled} onChange={(checked) => updateSettings((current) => ({ ...current, defaults: { ...current.defaults, agents: { ...current.defaults.agents, qualityAssurance: { ...current.defaults.agents.qualityAssurance, enabled: checked } } } }))} />
    </div>
  );
};
