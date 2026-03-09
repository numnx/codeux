import { FileTemplateRepository } from "../infrastructure/repositories/file-template-repository.js";
import { getRelativeSprintOsPath } from "../shared/config/sprint-os-paths.js";

export class GuideRepository {
  private readonly repository: FileTemplateRepository;

  constructor(projectRoot: string) {
    this.repository = new FileTemplateRepository(projectRoot, [getRelativeSprintOsPath("agents")]);
  }

  async getGuideContent(guideName: string, repoPath?: string): Promise<string> {
    try {
      return await this.repository.loadFile(guideName, repoPath);
    } catch {
      throw new Error(`Guide not found: ${guideName}`);
    }
  }
}
