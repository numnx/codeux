import * as fs from "node:fs";
import * as path from "node:path";
import { validateSafeClonePath, validateNonEmptyDir } from "../../utils/path-validator.js";
import { runCommandStrict } from "../../services/cli-process-runner.js";

/**
 * Builds the contents of the seed README committed into a freshly initialized
 * repository. A real tracked file (rather than an empty commit) is required so
 * that sprints have a non-empty tree to check out, diff, and build against — an
 * empty-tree repo leaves agents, project setup, and build steps with nothing to
 * work with.
 */
function buildSeedReadme(projectName: string): string {
  const title = projectName.trim() || "Project";
  return `# ${title}\n\nInitialized with Code UX.\n`;
}

/**
 * Initializes a new local git repository at the specified path.
 * Sets up a default branch and creates an initial commit containing a seed
 * README so the repository starts with real, tracked content.
 *
 * @param dirPath - The absolute path where the repository should be initialized.
 * @param defaultBranch - The name of the initial branch (defaults to "main").
 * @param projectName - Optional human-readable name used as the README title.
 */
export async function initLocalRepo(dirPath: string, defaultBranch = "main", projectName?: string): Promise<void> {
  validateSafeClonePath(dirPath);
  validateNonEmptyDir(dirPath);
  try {
    fs.mkdirSync(dirPath, { recursive: true });

    // 1. Initialize the repository
    try {
      await runCommandStrict("git", ["init", `--initial-branch=${defaultBranch}`], dirPath);
    } catch (error) {
      // Fallback for git versions < 2.28 which do not support --initial-branch
      await runCommandStrict("git", ["init"], dirPath);
      await runCommandStrict("git", ["checkout", "-b", defaultBranch], dirPath);
    }

    // 2. Configure local user for this repository only
    await runCommandStrict("git", ["config", "user.email", "code-ux@local"], dirPath);
    await runCommandStrict("git", ["config", "user.name", "Code UX"], dirPath);

    // 3. Seed a README so the initial commit has real tracked content.
    fs.writeFileSync(path.join(dirPath, "README.md"), buildSeedReadme(projectName ?? path.basename(dirPath)));
    await runCommandStrict("git", ["add", "README.md"], dirPath);
    await runCommandStrict("git", ["commit", "-m", "Initial commit"], dirPath);
  } catch (cause: any) {
    throw new Error(`Failed to initialize local repo at ${dirPath}: ${cause.message}`);
  }
}
