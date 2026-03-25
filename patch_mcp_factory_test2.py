import re

with open("tests/backend/app/dependency-factory/mcp-factory.test.ts", "r") as f:
    content = f.read()

# Replace any occurrence that doesn't have the 4th arg
content = re.sub(r"createMcpDependencies\(([^,]+),\s*([^,]+),\s*([^)]+)\)", r"createMcpDependencies(\1, \2, \3, { executionControlService: {} } as any)", content)

with open("tests/backend/app/dependency-factory/mcp-factory.test.ts", "w") as f:
    f.write(content)
