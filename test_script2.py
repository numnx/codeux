import re

with open('src/services/quality-assurance-service.ts', 'r') as f:
    content = f.read()

pattern = re.compile(r'setTaskQaPending\(')
matches = pattern.finditer(content)
for match in matches:
    start = max(0, match.start() - 200)
    end = min(len(content), match.end() + 200)
    print(f"Match found at index {match.start()}:\n{content[start:end]}\n---")
