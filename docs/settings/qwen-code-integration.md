# Qwen Code Integration

Code UX supports Qwen Code as a first-class virtual CLI provider alongside Gemini, Codex, and Claude Code.

## Provider Identity

- Provider id: `qwen-code`
- Default provider config id: `qwen-code`
- Default local auth path: `~/.qwen`
- Default model: `qwen3-coder-plus`
- Docker fallback install: `npm install -g @qwen-code/qwen-code`

Qwen Code can be selected anywhere a virtual CLI provider is accepted: task coding, planning, dashboard replies, clarification replies, QA review, CI repair, and merge-conflict repair.

## Session Continuation

Code UX launches Qwen Code in documented headless structured-output mode:

```bash
qwen --output-format stream-json -p "<prompt>"
```

Fresh runs let Qwen create and persist its own native conversation. Follow-up runs use:

```bash
qwen --continue --output-format stream-json -p "<prompt>"
```

The runner intentionally does not pass Code UX logical session ids to `qwen --resume <id>`. Qwen only accepts ids for conversations it has saved locally; passing a Code UX UUID can fail with `No saved session found`. The `stream-json` lifecycle events are parsed for Qwen's native `session_id` for telemetry and dashboard display, while the CLI's own `--continue` behavior restores the latest conversation in the prepared workspace.

## Authentication Modes

The system integration entry for each named Qwen instance stores a `qwenAuthMode`.

### Local Auth

`LOCAL_AUTH` copies the host Qwen directory into Docker when `mountAuth` is enabled.

This mode is intended for Qwen OAuth credentials created by:

```bash
qwen auth qwen-oauth
```

The runtime mounts the configured `authPath` to `/opt/credentials/qwen-code` and copies it into `$HOME/.qwen` inside the provider container.

### Alibaba Cloud Coding Plan

`ALIBABA_CODING_PLAN` uses the dedicated Coding Plan API key and region.

- China endpoint: `https://coding.dashscope.aliyuncs.com/v1`
- International endpoint: `https://coding-intl.dashscope.aliyuncs.com/v1`
- Environment key: `BAILIAN_CODING_PLAN_API_KEY`

The Qwen runner launches with `--auth-type openai` and sets `OPENAI_BASE_URL` to the selected Coding Plan endpoint so non-interactive Docker runs can use the configured key.

### Custom Model Provider

`MODEL_PROVIDER` is for Qwen Code `modelProviders` style setup. Each instance can define:

- protocol: `openai`, `anthropic`, or `gemini`
- environment key
- base URL
- API key
- model id registered in Qwen Code `modelProviders`

For OpenAI-compatible providers, Code UX also forwards `OPENAI_API_KEY` and `OPENAI_BASE_URL` to the Qwen process. This covers DashScope compatible mode, OpenRouter, Ollama, vLLM, LM Studio, and similar endpoints.

Custom endpoint instances appear on the AI Models page with their configured model id, such as `glm-4.7-flash`, instead of stale placeholders such as `custom/model` or `local-model`.

Qwen Code custom provider failures use the shared CLI provider error classifier. OpenRouter key exhaustion messages such as `API Error: 403 Key limit exceeded (weekly limit)` are treated as `QUOTA_EXHAUSTED`, so affected runs enter the same quota handling path as Codex, Gemini, Claude Code, and other CLI providers. When the gateway does not include a concrete reset time, Code UX records the task as quota-limited without an active retry timestamp.

When Custom endpoint is selected for a fresh Qwen instance, the settings form pre-fills an Ollama-compatible local endpoint:

- API key: `your_api_key`
- Base URL: `http://127.0.0.1:11434/v1`
- Environment key: `OLLAMA_API_KEY`
- Model id: `glm-4.7-flash`
- Protocol: `openai`

## Docker Runtime

Docker execution prepares Qwen in the same bootstrap path as other CLI providers:

- creates `$HOME/.qwen`
- copies mounted local auth from `/opt/credentials/qwen-code`
- merges generated MCP/settings fragments from `/opt/provider-config/qwen-settings.json`
- writes generated `modelProviders`, selected model, and MCP settings into the mounted settings fragment for custom endpoint and Coding Plan runs
- rewrites loopback URLs in generated Qwen settings from `127.0.0.1` or `localhost` to `host.docker.internal` on Docker Desktop, WSL, macOS, and Windows so local endpoints such as Ollama remain reachable from the provider container
- installs Qwen Code if `qwen` is missing and fallback installs are enabled

The bootstrap merge is additive and preserves existing `mcpServers` entries.

## External Hints

Code UX detects Qwen credentials from:

- `DASHSCOPE_API_KEY`
- `BAILIAN_CODING_PLAN_API_KEY`
- `QWEN_API_KEY`
- local files under `~/.qwen`

Detected keys and local auth availability are surfaced in the Integrations settings page so they can be imported into named provider instances.

## Dashboard Settings

The v2 Integrations page exposes Qwen-specific setup panels:

- Local auth path and Docker copy toggle
- Alibaba Cloud Coding Plan region and endpoint preview
- Custom provider protocol, env key, base URL, and masked generated `settings.json` preview

Provider routing remains instance-based: multiple Qwen instances can coexist, each with its own auth mode, API key, mount path, model, weight, and route overrides.
