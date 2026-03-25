import re

with open("src/app/dependency-factory/sprint-factory.ts", "r") as f:
    content = f.read()

imports = """import { SprintService } from "../../domain/sprint/sprint-service.js";
import { SprintRepository } from "../../infrastructure/repositories/sprint-repository.js";
import { SprintMarkdownService } from "../../domain/sprint/sprint-markdown-service.js";"""
content = content.replace('import { SprintMarkdownService } from "../../domain/sprint/sprint-markdown-service.js";', imports)

interface_addition = """  sprintMarkdownService: SprintMarkdownService;
  sprintService: SprintService;"""
content = content.replace("  sprintMarkdownService: SprintMarkdownService;", interface_addition)

instantiation = """  const sprintMarkdownService = new SprintMarkdownService(projectManagementRepository);

  const sprintService = new SprintService(
    projectManagementRepository,
    new SprintRepository()
  );"""
content = content.replace("  const sprintMarkdownService = new SprintMarkdownService(projectManagementRepository);", instantiation)

export_addition = """    sprintMarkdownService,
    sprintService,"""
content = content.replace("    sprintMarkdownService,", export_addition)

with open("src/app/dependency-factory/sprint-factory.ts", "w") as f:
    f.write(content)
