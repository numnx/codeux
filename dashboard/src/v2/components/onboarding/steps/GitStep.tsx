import type { FunctionComponent } from "preact";
import { GitBranch, Github, Info } from "lucide-preact";
import type { ProjectSettings, SystemSettings } from "../../../../types.js";
import { PillChoiceGroup, Row, TextInput, Toggle } from "../../settings/SettingsFormFields.js";
import { SectionCard } from "../../settings/panels/SharedPanelComponents.js";

interface GitStepProps {
  settings: SystemSettings | null;
  updateSettings: (recipe: (current: SystemSettings) => SystemSettings) => void;
  updateCliWorkflow: (updates: Partial<SystemSettings["defaults"]["cliWorkflow"]>) => void;
  gitMode: ProjectSettings["cliWorkflow"]["gitMode"];
}

export const GitStep: FunctionComponent<GitStepProps> = ({ settings, updateSettings, updateCliWorkflow, gitMode }) => {
  if (!settings) return null;
  return (
    <div className="space-y-4">
      <div data-onboarding-card className="rounded-3xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
        <div className="flex items-start gap-3">
          <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-signal-600 dark:text-signal-300" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-black text-slate-900 dark:text-white">Git mode</div>
            <div className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Remote mode keeps pull requests and CI automation available. Local mode stays repo-local for offline or self-managed workflows.
            </div>
            <div className="mt-4">
              <PillChoiceGroup
                value={gitMode}
                onChange={(value) => updateCliWorkflow({ gitMode: value as ProjectSettings["cliWorkflow"]["gitMode"] })}
                options={[
                  { value: "remote", label: "Remote", hint: "PRs, CI, and remote branch sync stay enabled." },
                  { value: "local", label: "Local", hint: "Disable remote PR orchestration and stay repo-local." },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      {gitMode === "local" ? (
        <div data-onboarding-card className="flex items-start gap-3 rounded-3xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.04)] dark:border-white/[0.06] dark:bg-white/[0.04]">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-300" />
          <div className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Local mode does not support automatic CI or pull requests. Remote mode is recommended for full feature access.
          </div>
        </div>
      ) : null}
      {gitMode !== "local" ? (
        <>
          <div data-onboarding-card>
            <SectionCard title="GitHub" watermark="GIT" icon={<Github strokeWidth={2.4} />}>
              <Row label="GitHub token" description="System token used for GitHub repository, pull request, and CI integration.">
                <TextInput
                  value={settings.integrations.githubToken || ""}
                  onChange={(value) => updateSettings((current) => ({ ...current, integrations: { ...current.integrations, githubToken: value } }))}
                  mono
                />
              </Row>
              <Row label="Mount GitHub auth" description="Copy the host `gh` credential directory into Docker.">
                <Toggle
                  value={settings.defaults.cliWorkflow.containerMountGithubAuth}
                  onChange={() => updateCliWorkflow({ containerMountGithubAuth: !settings.defaults.cliWorkflow.containerMountGithubAuth })}
                />
              </Row>
              <Row label="GitHub auth path" description="Host path copied into the Docker runtime for GitHub CLI auth." last>
                <TextInput
                  value={settings.defaults.cliWorkflow.containerGithubAuthPath}
                  onChange={(value) => updateCliWorkflow({ containerGithubAuthPath: value })}
                  disabled={!settings.defaults.cliWorkflow.containerMountGithubAuth}
                  mono
                />
              </Row>
            </SectionCard>
          </div>
          <div data-onboarding-card>
            <SectionCard title="GitLab" watermark="GLB" icon={<GitBranch strokeWidth={2.4} />}>
              <Row label="GitLab token" description="System token used for GitLab repository, merge request, and CI integration." last>
                <TextInput
                  value={(settings.integrations as any).gitlabToken || ""}
                  onChange={(value) => updateSettings((current) => ({ ...current, integrations: { ...current.integrations, gitlabToken: value } }))}
                  mono
                />
              </Row>
            </SectionCard>
          </div>
        </>
      ) : null}
      <div data-onboarding-card>
        <SectionCard title="Git identity" watermark="ID" icon={<GitBranch strokeWidth={2.4} />}>
          <Row label="Copy local git config" description="Use the host `.gitconfig` in Docker instead of the configured Code UX git identity." last={settings.defaults.cliWorkflow.containerMountGitConfig}>
            <Toggle
              value={settings.defaults.cliWorkflow.containerMountGitConfig}
              onChange={() => updateCliWorkflow({ containerMountGitConfig: !settings.defaults.cliWorkflow.containerMountGitConfig })}
            />
          </Row>
          {!settings.defaults.cliWorkflow.containerMountGitConfig ? (
            <>
              <Row label="Git user name" description="Git author name configured inside provider containers.">
                <TextInput
                  value={settings.defaults.cliWorkflow.containerGitUserName}
                  onChange={(value) => updateCliWorkflow({ containerGitUserName: value })}
                  placeholder="Code UX"
                />
              </Row>
              <Row label="Git email" description="Git author email configured inside provider containers." last>
                <TextInput
                  value={settings.defaults.cliWorkflow.containerGitUserEmail}
                  onChange={(value) => updateCliWorkflow({ containerGitUserEmail: value })}
                  placeholder="agents@codeux.ai"
                  mono
                />
              </Row>
            </>
          ) : null}
        </SectionCard>
      </div>
    </div>
  );
};
