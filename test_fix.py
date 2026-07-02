import os

with open("src/domain/qa-review/qa-review-state-transitions.ts", "r") as f:
    content = f.read()

content = content.replace('continuationMode?: "none" | "attached" | "detached";', 'continuationMode?: "none" | "attached" | "detached" | "jules" | "cli";')

with open("src/domain/qa-review/qa-review-state-transitions.ts", "w") as f:
    f.write(content)

print("Fixed typescript error in qa-review-state-transitions.ts")
