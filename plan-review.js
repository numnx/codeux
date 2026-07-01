// 1. We will update src/mcp/mcp-tool-availability.ts to add strict validation.
// - Check that URL starts with http: or https:, has no credentials, no control chars.
// - Headers must match /^[a-zA-Z0-9-]+$/ and not contain control chars. Length <= 64. Count <= 32.
// - Environment variable names must match /^[a-zA-Z_][a-zA-Z0-9_]*$/ and values not contain control chars. Length <= 4096. Count <= 64.
// - Command must not contain shell metacharacters `/[&|;<>$\(\)\`'"\x00-\x1F\x7F]/`. Length <= 256.
// - Args list length <= 64, arg length <= 4096. No control characters.
