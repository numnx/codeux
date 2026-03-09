import type { SprintMarkdownExportBundle, SprintMarkdownImportTask } from "../types.js";

const FILE_MARKER = /^---\s*FILE:\s*(.+?)\s*---$/gm;

export function buildTaskBundle(bundle: SprintMarkdownExportBundle["tasks"]): string {
  return bundle.map((entry) => (
    `--- FILE: ${entry.fileName} ---\n${entry.markdown.trim()}\n`
  )).join("\n");
}

export function parseTaskBundle(text: string): SprintMarkdownImportTask[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const matches = Array.from(trimmed.matchAll(FILE_MARKER));
  if (matches.length === 0) {
    return [{ markdown: trimmed }];
  }

  return matches.map((match, index) => {
    const fileName = match[1]?.trim() || `task-${index + 1}.md`;
    const contentStart = (match.index || 0) + match[0].length;
    const nextMatchIndex = matches[index + 1]?.index ?? trimmed.length;
    const markdown = trimmed.slice(contentStart, nextMatchIndex).trim();
    const taskKey = fileName.replace(/\.md$/i, "");

    return { taskKey, markdown };
  }).filter((entry) => entry.markdown.length > 0);
}
