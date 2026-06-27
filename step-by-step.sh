# Let's extract finalizeSprintRun out of watch-loop-runner.ts properly without missing internal dependencies or causing type errors
# First, let's copy the entire watch-loop-runner.ts into the new service and strip it down.
cp src/domain/sprint/orchestrator/watch-loop-runner.ts src/domain/sprint/orchestrator/sprint-finalization-service.ts
sed -i 's/export class WatchLoopRunner {/export class SprintFinalizationService {/g' src/domain/sprint/orchestrator/sprint-finalization-service.ts
sed -i 's/WatchLoopDependencies/SprintFinalizationDependencies/g' src/domain/sprint/orchestrator/sprint-finalization-service.ts
