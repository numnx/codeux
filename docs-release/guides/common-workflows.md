# Common Workflows

This guide outlines common workflows for interacting with the Jules Sprint OS and its features.

## Prerequisites
- Node.js 20+
- pnpm
- Valid credentials set in system settings.

## Setting Up and Running a First Sprint

1. **Configure Settings:** Open the Dashboard System Settings. Configure any global AI provider routing or credentials needed. Apply project-specific settings under Project Settings.
2. **Create a Sprint:** Define the new sprint in the Sprint OS dashboard and add related tasks. Sprint OS automatically prepares a feature branch.
3. **Connect Workers:** Run the worker client in `listen` mode to monitor inbox tasks.
4. **Start Orchestration:** Trigger the sprint.
5. **Manage Protocols:** Monitor the dashboard for "Action Required" merge/review protocols and manually resume the sprint after handling blocked items.

## Troubleshooting
- **Missing API Keys:** Ensure your key is correctly exported as `JULES_API_KEY` or configured in the system settings UI.
- **Port Conflicts:** Provide a custom port using the `DASHBOARD_PORT` environment variable if 4444 is already in use.
