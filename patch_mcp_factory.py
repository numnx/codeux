with open("src/app/dependency-factory/mcp-factory.ts", "r") as f:
    content = f.read()

# Remove imports
content = content.replace('import { SprintService } from "../../domain/sprint/sprint-service.js";\n', '')
content = content.replace('import { SprintRepository } from "../../infrastructure/repositories/sprint-repository.js";\n', '')

# Remove instantiation
old_instantiation = """  const sprintService = new SprintService(
    coreDeps.projectManagementRepository,
    new SprintRepository()
  );

  const agentToolHandler = new AgentToolHandler({"""

content = content.replace(old_instantiation, "  const agentToolHandler = new AgentToolHandler({")

# Update injection
old_injection = "    sprintService,"
new_injection = "    sprintService: sprintDeps.sprintService,"
content = content.replace(old_injection, new_injection)

with open("src/app/dependency-factory/mcp-factory.ts", "w") as f:
    f.write(content)
