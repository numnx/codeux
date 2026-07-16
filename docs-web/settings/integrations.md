# Integrations

Lists automation credentials, providers, git hosts, issue trackers, and read-only importer integrations and exposes manage/add actions.

> Settings area: `integrations`
> Dashboard documentation route: `/docs/settings-integrations`

## What This Area Is For

Lists automation credentials, providers, git hosts, issue trackers, and read-only importer integrations and exposes manage/add actions. This page expands the short Settings-page help text into an operator reference for deciding when to change this area, what behavior the controls affect, and what to verify after saving.

Use it when you are configuring a new project, auditing inherited settings, or debugging behavior that changed after a system, project, or sprint override was saved.

## Controls And Runtime Effect

Cards show connection state, auth hints, active/configured importer status, and management entry points; host hints can import detected local settings. Automation Credentials is the first catalog entry and reports secure-storage unavailable, ready but unconfigured, or configured state for the selected project. Its **Manage** action uses the same detail and back-navigation behavior as every other integration.

| Control Surface | Runtime Effect | Review Before Saving |
| --- | --- | --- |
| Automation Credentials | Used during API calls to services (e.g., Jira, Slack). Validates auth and connection health before saving. | Verify capabilities and scope are correct before granting access. |
| Provider Connections | Used for model routing and AI capability endpoints. | Ensure external API allows connections from Code UX. |
| Importer Configs | Read-only imports trigger immediately. | Review the imported scopes carefully. |

## Automation Credential Management

Credential management is project-aware even when Settings is displaying system scope. Select a project before opening the detail view so Code UX can list only metadata visible to that project and determine whether the project has management authority.

The create form requires an explicit name, kind, project or global scope, capability selection, and—when global scope is selected—an allowlist that retains the managing project. No capability is granted implicitly. Global creation and project-to-global promotion require confirmation because they expand access.

Each project-managed credential supports bounded rename, metadata-only validation test, value rotation, encrypted-state replacement, monotonic access restriction, confirmed promotion, and confirmed revocation. Revocation requires typing `REVOKE` exactly; each lifecycle confirmation starts with cleared confirmation state and returns focus to the credential controls when it closes. Every lifecycle request uses the metadata version shown by the service. If another session wins the compare-and-swap update, the detail view refreshes metadata and asks the operator to review and retry instead of overwriting the newer state.

| Workflow | What the operator supplies | What remains readable afterward |
| --- | --- | --- |
| Create | Name, kind, write-only value, explicit capabilities, and project/global policy | Metadata, configured state, validation state, scope, capabilities, and version only. |
| Update metadata | A bounded display name and current version | Updated metadata; kind and management ownership cannot be changed. |
| Rotate / replace | A new write-only value and current version | New key/version and validation metadata, never either the old or new value. |
| Test | The current version | `valid`, `invalid`, or `unavailable` plus timestamps; no tested value or low-level custody error. |
| Restrict / promote | A monotonic restriction, or a confirmed global allowlist expansion owned by the managing project | Updated non-secret policy metadata. |
| Revoke | Exact confirmation and current version | Revoked status and audit metadata; the stored value cannot be read back. |

Secret inputs are write-only. Create, rotate, and replace fields are never populated from responses, are cleared after successful or failed submissions and project changes, and are removed with the detail view. Notices, metadata cards, browser storage, and reusable drafts contain no secret value. An allowlisted project that is not the management owner sees a **Use only** state and cannot invoke management actions.

Unavailable key custody leaves non-secret metadata visible and disables secret-bearing changes and tests. Follow the inline custody guidance, restore secure storage, then use **Refresh**. See [Automation Credential Security](../operations/credential-security.md) for encryption, authority, recovery, and API behavior.

## Recommended Configuration

Configure provider and importer credentials at system scope and use project overrides only for repository-specific git hosts or importer defaults. Automation credentials follow their own project-aware ownership and allowlist policy rather than Settings inheritance.

For Google Drive, link an existing host-side sync or mount directory and enable the opt-in Docker mount only for projects that need it. The mount defaults to read-only; see [Google Drive Project Mount](./google-drive-mount.md) for access, inheritance, security, and troubleshooting details. This integration does not configure Google Drive API synchronization or credentials.

Configure provider and importer credentials at system scope and use project overrides only for repository-specific git hosts or importer defaults. Automation credentials follow their own project-aware ownership and allowlist policy rather than Settings inheritance.

## Localization And Protected Values

The Integrations interface follows the dashboard language for setup guidance, authentication labels, connection states, importer controls, validation, and accessible feedback. Provider and product names remain unchanged. Credential values, secret placeholders, detected paths, endpoints, repository identifiers, scopes, and diagnostics returned by a provider or API are always shown verbatim and are never passed through translation messages.

## Risks And Gotchas

Imported hints can reveal local auth paths; broad importer tokens can expose external workspaces to search. Saving invalid credentials causes provider dispatches to fail with authentication errors.

## Troubleshooting

If a provider dispatch fails with authentication errors, verify the credentials in the active scope. If an integration is not found, check if it is overridden by the project scope.

## Related Documentation

- [Settings overview](./index.md)
- [Automation Credential Security](../operations/credential-security.md)
- [Google Drive Project Mount](./google-drive-mount.md)
- [Dashboard Settings](../dashboard/design-system-settings.md)
- [Configuration and Storage](./configuration-and-storage.md)
- [Security Hardening](../operations/security-hardening.md)
