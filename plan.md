1. **Update `docs/dashboard/design-system-settings.md`**:
   - Use `replace_with_git_merge_diff` to add the missing panels (`SettingsTechstacksPanel`, `SettingsAgentsPanel`, `SettingsMemoryPanel`, `SettingsIntegrationsPanel`, `SettingsMcpPanel`, `SettingsDangerPanel`, `AutomationPanel`, `QAPanel`, `WorkerPanel`, `SettingsModelPricingPanel`) to the Smart Find indexing documentation list.
   - Use `replace_with_git_merge_diff` to add documentation about scoped settings, effective settings, and runtime logs if absent, aligning with the rules in `SettingsContentPanels.tsx` and `SettingsActivePanelStatus`.

2. **Update `docs-web/user/dashboard/settings.md`**:
   - Use `replace_with_git_merge_diff` to update the 'Categories' markdown table to correctly match current categories (General, Appearance, AI Models, Sprint & Git, Browser Preview, Techstacks, Agents, Memory, Integrations, MCP, Danger Zone). Ensure `AutomationPanel` is moved under "General", `QAPanel` and `WorkerPanel` are under "Sprint & Git", and `SettingsModelPricingPanel` is under "AI Models".
   - Use `replace_with_git_merge_diff` to add "Model Pricing", "Automation", "Worker", and "QA" subcategory reference sections under "Settings Subcategory Reference", explicitly describing what they control based on the React components (`dashboard/src/v2/components/settings/panels/*.tsx`).
   - Use `replace_with_git_merge_diff` to ensure the descriptions of scoped editing, effective settings, and Provider configuration correctly mention named provider instances, local/API auth modes, dashboard login, route mapping, and integrations.

3. **Verify the changes**:
   - Run `rg -n "Settings(Mcp|Memory|Browser|ModelPricing|Integrations|Agents|Danger|Sprint|General|Automation|Provider|Worker|QA|Appearance)Panel|Route Mapping|provider instance|override|runtime log" dashboard/src/v2/components/settings docs/dashboard/design-system-settings.md docs-web/user/dashboard/settings.md` and confirm docs cover current panels.
   - Run `pnpm run lint` if dependencies are installed.

4. **Complete Pre-commit steps**:
   - Ensure proper testing, verification, review, and reflection are done by calling the `pre_commit_instructions` tool.

5. **Submit the changes**.
