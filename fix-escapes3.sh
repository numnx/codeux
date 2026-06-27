cat << 'REPLACE' > /tmp/replace.ts
    const lines = [
      `The final merge of \`${args.featureBranch}\` into \`${args.defaultBranch}\` is blocked by failing CI checks.`,
      args.prNumber ? `PR: ${args.prUrl ?? `#${args.prNumber}`}` : null,
      args.failedChecks.length > 0 ? `Failed checks: ${args.failedChecks.join(", ")}` : null,
      "",
      `Check out \`${args.featureBranch}\`, reproduce and fix the failing checks (these run against the integrated branch, so the failure may only appear when all sprint tasks are combined), then push so the checks re-run.`,
    ];
REPLACE
# manually replace lines 572-578
head -n 571 src/domain/sprint/orchestrator/sprint-finalization-service.ts > /tmp/fixed.ts
cat /tmp/replace.ts >> /tmp/fixed.ts
tail -n +579 src/domain/sprint/orchestrator/sprint-finalization-service.ts >> /tmp/fixed.ts
mv /tmp/fixed.ts src/domain/sprint/orchestrator/sprint-finalization-service.ts
