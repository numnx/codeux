import * as fs from "fs/promises";
import * as path from "path";
import type { IDockerRunner } from "./docker-runner.js";
import { resolveCodexOutputPath, cleanupCodexOutputPath } from "./provider-runtime-artifacts.js";
import type { CliWorkflowSettings } from "../../../contracts/app-types.js";
import type { CliProviderId } from "./provider-command-specs.js";

export interface ProviderWorkspaceInput {
  cwd: string;
  repoPath: string;
  sessionId: string;
  workspaceSessionId?: string;
  provider: CliProviderId;
  workflowSettings: Pick<CliWorkflowSettings, "executionMode">;
}

export function shouldPreserveSessionWorkspace(input: Pick<ProviderWorkspaceInput, "workflowSettings" | "cwd">): boolean {
  return input.workflowSettings.executionMode === "DOCKER"
    && !input.cwd.startsWith("docker-volume://");
}

export async function executeWithWorkspace<T>(
  dockerRunner: IDockerRunner,
  input: ProviderWorkspaceInput,
  callback: (prepared: { cwd: string; cleanup: () => Promise<void> }, outputPath: string | null) => Promise<T>
): Promise<T> {
  const preserveSessionWorkspace = shouldPreserveSessionWorkspace(input);
  const prepared = input.workflowSettings.executionMode === "DOCKER"
    ? await dockerRunner.ensureWorkspace({
      cwd: input.cwd,
      repoPath: input.repoPath,
      sessionId: input.workspaceSessionId || input.sessionId,
      preserve: preserveSessionWorkspace,
      reuseExisting: preserveSessionWorkspace,
    })
    : { cwd: input.cwd, cleanup: async () => undefined };

  const outputPath = resolveCodexOutputPath(input as any);

  if (outputPath && !outputPath.startsWith("/workspace/")) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
  }

  try {
    return await callback(prepared, outputPath);
  } finally {
    await prepared.cleanup();
    await cleanupCodexOutputPath(
      outputPath,
      input.workflowSettings.executionMode,
      prepared.cwd,
      dockerRunner.removeWorkspaceDir ? dockerRunner.removeWorkspaceDir.bind(dockerRunner) : undefined
    );
  }
}
