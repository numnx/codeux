with open("src/app/dependency-factory/sprint-factory.ts", "r") as f:
    content = f.read()

imports = """import { SprintService } from "../../domain/sprint/sprint-service.js";
import { SprintRepository } from "../../infrastructure/repositories/sprint-repository.js";
"""
content = content.replace('import { SprintOrchestrator } from "../../sprint/sprint-orchestrator.js";', imports + 'import { SprintOrchestrator } from "../../sprint/sprint-orchestrator.js";')

interface_addition = """  sprintOrchestrator: SprintOrchestrator;
  sprintService: SprintService;"""
content = content.replace("  sprintOrchestrator: SprintOrchestrator;", interface_addition)

instantiation = """  const sprintOrchestrator = new SprintOrchestrator({
"""
sprint_service_init = """  const sprintService = new SprintService(
    coreDeps.projectManagementRepository,
    new SprintRepository()
  );

  const sprintOrchestrator = new SprintOrchestrator({
"""
content = content.replace(instantiation, sprint_service_init)

export_addition = """    workerInboxReplyService,
    sprintService,
    sprintOrchestrator,"""
content = content.replace("    workerInboxReplyService,\n    sprintOrchestrator,", export_addition)

with open("src/app/dependency-factory/sprint-factory.ts", "w") as f:
    f.write(content)
