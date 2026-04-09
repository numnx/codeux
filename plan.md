1. Extracted Repositories Creation:
   a. Read src/repositories/execution-repository.ts and create src/repositories/execution/sprint-run-repository.ts containing createSprintRun, listSprintRuns, listSprintRunsByStatus, getSprintRun, findActiveSprintRun, updateSprintRun, appendSprintRunEvent, listSprintRunEvents, hasActiveTaskDispatches, finalizeSprintRunCancellationIfIdle. Verify with npm run typecheck.
   b. Create src/repositories/execution/task-run-repository.ts containing createTaskDispatch, listTaskDispatches, listTaskDispatchesByStatus, listStaleCancelRequestedDispatches, updateTaskDispatch, getTaskDispatch, claimNextTaskDispatch, createTaskRun, updateTaskRun, getTaskRun, getTaskRunByDispatchId, getLatestTaskRun, listLatestTaskRuns, getLatestTaskRunBySessionId, appendTaskRunEvent, listTaskRunEvents, countRunningTasksPerProvider, listWorkerProjectAffinity. Verify with npm run typecheck.
   c. Create src/repositories/execution/invocation-repository.ts containing createExecutionInvocation, updateExecutionInvocation, getExecutionInvocation, listExecutionInvocations, listExecutionInvocationMessages, appendExecutionInvocationMessage, createProviderInvocationUsage, updateProviderInvocationUsage, getProviderInvocationUsage, getLatestProviderInvocationUsageBySession. Verify with npm run typecheck.
2. Update ExecutionRepository in src/repositories/execution-repository.ts:
   - Remove methods moved in step 1. Retain lease and snapshot methods. Verify with npm run typecheck.
3. Update dependencies in src/app/dependency-factory/core-factory.ts to export new repositories.
4. Update usages in services/controllers/orchestrators exactly based on dependencies.txt by injecting specific repositories where ExecutionRepository was used. Use replace_with_git_merge_diff for each file.
5. Run mandatory quality gates via run_in_bash_session:
   - npm run lint
   - npm run typecheck
   - npm run test
   - npm run test:coverage
   - npm run build
6. Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
