import * as fs from "fs/promises";
import * as path from "path";
import { buildCandidatePaths } from "../shared/config/search-paths.js";

export class GuideRepository {
  constructor(private readonly projectRoot: string) {}

  async getGuideContent(guideName: string, repoPath?: string): Promise<string> {
    const relativePath = path.join(".jules-subagents", "agents", guideName);
    const searchPaths = buildCandidatePaths(relativePath, this.projectRoot, repoPath);

    for (const searchPath of searchPaths) {
      try {
        await fs.access(searchPath);
        return await fs.readFile(searchPath, "utf-8");
      } catch {
        continue;
      }
    }

    throw new Error(`Guide not found: ${guideName}`);
  }
}
