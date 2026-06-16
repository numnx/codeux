import type { FunctionComponent } from "preact";
import { ClipboardList } from "lucide-preact";
import type { SystemSettings } from "../../../../types.js";
import { Row, TextInput, Toggle } from "../../settings/SettingsFormFields.js";
import { SectionCard } from "../../settings/panels/SharedPanelComponents.js";
import { JiraIcon } from "../../icons/JiraIcon.js";

interface JiraStepProps {
  settings: SystemSettings | null;
  jiraSettings: SystemSettings["integrations"]["jira"];
  updateJira: (updates: Partial<SystemSettings["integrations"]["jira"]>) => void;
}

export const JiraStep: FunctionComponent<JiraStepProps> = ({ settings, jiraSettings, updateJira }) => {
  if (!settings) return null;
  return (
    <div className="space-y-4">
      <div data-onboarding-card className="rounded-3xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#0052CC]/18 bg-[#0052CC]/10 text-[#0052CC] dark:border-[#4C9AFF]/18 dark:bg-[#4C9AFF]/10 dark:text-[#4C9AFF]">
            <JiraIcon className="h-5 w-5" />
          </span>
          <div>
            <div className="text-base font-black text-slate-900 dark:text-white">Connect Jira (optional)</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Link an issue tracker to import work as tasks and auto-close issues after a sprint. You can skip this and configure it later in Settings.
            </div>
          </div>
        </div>
      </div>
      <div data-onboarding-card>
        <SectionCard title="Jira Configuration" watermark="JRA" icon={<ClipboardList strokeWidth={2.4} />}>
          <Row label="Jira site URL" description="Base URL for Jira Cloud or Data Center, for example `https://company.atlassian.net`.">
            <TextInput value={jiraSettings.host} onChange={(value) => updateJira({ host: value })} mono />
          </Row>
          <Row label="Account email" description="Email used with Jira Cloud API tokens. Leave empty for bearer-token Jira deployments.">
            <TextInput value={jiraSettings.email} onChange={(value) => updateJira({ email: value })} mono />
          </Row>
          <Row label="API token" description="Jira API token used for issue search, issue context loading, and transitions.">
            <TextInput value={jiraSettings.apiToken} onChange={(value) => updateJira({ apiToken: value })} mono />
          </Row>
          <Row label="Default project" description="Project key used to prefill the Jira import JQL.">
            <TextInput value={jiraSettings.defaultProject} onChange={(value) => updateJira({ defaultProject: value.toUpperCase() })} mono />
          </Row>
          <Row label="Close transition" description="Transition name used when auto-closing linked Jira issues after sprint completion.">
            <TextInput value={jiraSettings.closeTransitionName} onChange={(value) => updateJira({ closeTransitionName: value })} />
          </Row>
          <Row label="Auto-close Jira issues" description="Move linked Jira issues through the configured transition after the sprint completes." last>
            <Toggle value={jiraSettings.autoCloseLinkedIssues} onChange={() => updateJira({ autoCloseLinkedIssues: !jiraSettings.autoCloseLinkedIssues })} />
          </Row>
        </SectionCard>
      </div>
    </div>
  );
};
