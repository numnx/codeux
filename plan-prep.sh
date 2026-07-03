grep -n "import { resolveReviewBranch" src/services/quality-assurance-service.ts
sed -n '232,243p' src/services/quality-assurance-service.ts
grep -n "Note: The run budget and retry limit rules" docs/architecture/quality-assurance-agent.md
sed -n '152,154p' docs/architecture/quality-assurance-agent.md
