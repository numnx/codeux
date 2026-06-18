function parseStatsDateInput(value, edge) {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}Z`);
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
console.log(parseStatsDateInput("2024-01-01", "start"));
