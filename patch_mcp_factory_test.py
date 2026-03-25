with open("tests/backend/app/dependency-factory/mcp-factory.test.ts", "r") as f:
    content = f.read()

import_dashboard = 'import { createDashboardDependencies } from "../../../../src/app/dependency-factory/dashboard-factory.js";'
if "DashboardDependencies" not in content:
    content = content.replace('import { createMcpDependencies } from "../../../../src/app/dependency-factory/mcp-factory.js";',
                              'import { createMcpDependencies } from "../../../../src/app/dependency-factory/mcp-factory.js";\n' + import_dashboard)

content = content.replace("createMcpDependencies(mockContext as any, coreDeps as any, sprintDeps as any)",
                          "createMcpDependencies(mockContext as any, coreDeps as any, sprintDeps as any, { executionControlService: {} } as any)")

with open("tests/backend/app/dependency-factory/mcp-factory.test.ts", "w") as f:
    f.write(content)
