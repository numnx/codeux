1. **Update `sanitizeCustomMcpServers` in `src/mcp/mcp-tool-availability.ts` to include strict validation:**
    * Add regex patterns for `HEADER_NAME_PATTERN`, `ENV_NAME_PATTERN`, `CONTROL_CHAR_PATTERN`, `SHELL_METACHAR_PATTERN`.
    * Ensure HTTP URLs are `http:` or `https:`, contain no embedded credentials (username/password), and have no control characters.
    * For headers, validate names against `HEADER_NAME_PATTERN`, reject CRLF/control characters in values, cap length (e.g., name <= 64, value <= 4096), and cap count (e.g., <= 32).
    * For env variables, validate names against `ENV_NAME_PATTERN`, reject CRLF/control characters in values, cap length (e.g., name <= 64, value <= 4096), and cap count (e.g., <= 64).
    * For stdio command, validate against shell metacharacters and control characters, cap length (e.g., <= 256).
    * For stdio args, validate each against control characters, cap arg length (e.g., <= 4096) and list length (e.g., <= 64).

2. **Add unit tests in `tests/backend/mcp/mcp-tool-availability.test.ts`:**
    * Test HTTP URLs containing credentials, control characters, or non-http(s) schemes are rejected/dropped.
    * Test headers and env variables with invalid names, control characters in values, or exceeding length/count limits are dropped.
    * Test stdio commands with shell metacharacters (e.g., `&`, `|`, `;`, `$`) or control characters are dropped.
    * Test that generated JSON/TOML cannot be injected (e.g., ensure quotes are handled correctly, although this might also be partially covered by `escapeTomlString` already, the strict character validation prevents arbitrary shell injection in stdio commands and args).

3. **Pre-commit steps:**
    * Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

4. **Submit changes**
