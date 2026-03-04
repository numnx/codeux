import * as fs from "fs/promises";
import { CliWorkflowSettings } from "../../../contracts/app-types.js";
import { ContainerMount, resolveConfiguredPath } from "../../../services/cli-docker-utils.js";
import {
  CODEX_CREDENTIALS_MOUNT,
  GITHUB_CREDENTIALS_MOUNT,
  GEMINI_CREDENTIALS_MOUNT,
  CLAUDE_CODE_CREDENTIALS_MOUNT,
  GITCONFIG_CREDENTIALS_MOUNT,
} from "./docker-bootstrap-builder.js";

export interface DockerCredentialMountBuilderOptions {
  workflowSettings: CliWorkflowSettings;
  repoPath: string;
  onActivity: (desc: string) => void;
}

export class DockerCredentialMountBuilder {
  async buildMounts(options: DockerCredentialMountBuilderOptions): Promise<ContainerMount[]> {
    const { workflowSettings, repoPath, onActivity } = options;
    if (!workflowSettings.containerMountCredentials) {
      return [];
    }

    const mounts: ContainerMount[] = [];

    const addMount = async (enabled: boolean, source: string, dest: string, label: string) => {
      if (!enabled) return;
      const p = resolveConfiguredPath(repoPath, source);
      try {
        await fs.access(p);
        mounts.push({ source: p, destination: dest, readonly: true });
      } catch {
        onActivity(`Configured ${label} credential mount not found: ${p}`);
      }
    };

    await addMount(workflowSettings.containerMountGitConfig, "~/.gitconfig", GITCONFIG_CREDENTIALS_MOUNT, "gitconfig");
    await addMount(workflowSettings.containerMountGithubAuth, workflowSettings.containerGithubAuthPath, GITHUB_CREDENTIALS_MOUNT, "github");
    await addMount(workflowSettings.containerMountGeminiAuth, workflowSettings.containerGeminiAuthPath, GEMINI_CREDENTIALS_MOUNT, "gemini");
    await addMount(workflowSettings.containerMountCodexAuth, workflowSettings.containerCodexAuthPath, CODEX_CREDENTIALS_MOUNT, "codex");
    await addMount(workflowSettings.containerMountClaudeCodeAuth, workflowSettings.containerClaudeCodeAuthPath, CLAUDE_CODE_CREDENTIALS_MOUNT, "claude-code");

    return mounts;
  }
}
