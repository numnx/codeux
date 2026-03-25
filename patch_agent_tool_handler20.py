import re

with open("src/mcp/agent-tool-handler.ts", "r") as f:
    content = f.read()

new_method = """
  async handleSprintAgent(args: SprintAgentToolArgs) {
    if (!this.deps.sprintService || !this.deps.executionControlService) {
      return { isError: true, content: [{ type: "text", text: "SprintService and ExecutionControlService must be provided to use sprint_agent" }] };
    }

    if (args.action === "execute_task") {
      if (!args.project_id || !args.sprint_id || !args.goal || !args.instructions || !args.repo_path) {
        return { isError: true, content: [{ type: "text", text: "Missing required arguments for execute_task" }] };
      }
      try {
        await this.deps.sprintService.createSingleTaskSprint(
          args.project_id,
          args.sprint_id,
          args.goal,
          args.instructions,
          args.repo_path
        );
        await this.deps.executionControlService.orchestrateSprint(args.project_id, args.sprint_id);
        return { content: [{ type: "text", text: `Successfully created and started single-task sprint ${args.sprint_id}` }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error executing task: ${e.message}` }] };
      }
    } else if (args.action === "plan" || args.action === "orchestrate") {
      if (!args.project_id || !args.sprint_id) {
        return { isError: true, content: [{ type: "text", text: `Missing project_id or sprint_id for ${args.action}` }] };
      }
      try {
        await this.deps.executionControlService.orchestrateSprint(args.project_id, args.sprint_id);
        return { content: [{ type: "text", text: `Successfully triggered ${args.action} for sprint ${args.sprint_id}` }] };
      } catch (e: any) {
        return { isError: true, content: [{ type: "text", text: `Error executing ${args.action}: ${e.message}` }] };
      }
    } else if (args.action === "status") {
       return { content: [{ type: "text", text: `Status check complete. View the dashboard for full details.` }] };
    }

    return { content: [{ type: "text", text: `Action ${args.action} is not supported.` }] };
  }
"""

# Replace the existing handleSprintAgent method
pattern = r"\s*async handleSprintAgent\([^)]+\) \{[\s\S]*?\}\s*?(?=\s*async handleExecuteWorkerDispatch)"
content = re.sub(pattern, new_method, content, count=1)

with open("src/mcp/agent-tool-handler.ts", "w") as f:
    f.write(content)
