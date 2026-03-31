export interface SqlDialect {
  /**
   * Generates a SQL fragment to extract a JSON field.
   * e.g., on sqlite: `json_extract(column, '$.field')`
   */
  jsonExtract(column: string, path: string): string;

  /**
   * Generates a SQL fragment to insert or update on conflict.
   * e.g., on sqlite: `ON CONFLICT(...) DO UPDATE SET ...`
   */
  upsert(conflictColumns: string[], updateColumns: string[]): string;

  /**
   * Generates an expression for the current timestamp in ISO format.
   * e.g., on sqlite: `STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')`
   */
  currentTimestamp(): string;
}

export const SqliteDialect: SqlDialect = {
  jsonExtract(column: string, path: string): string {
    return `json_extract(${column}, '${path}')`;
  },
  upsert(conflictColumns: string[], updateColumns: string[]): string {
    const conflictCols = conflictColumns.join(", ");
    const updateCols = updateColumns.map(col => `${col} = excluded.${col}`).join(", ");
    return `ON CONFLICT(${conflictCols}) DO UPDATE SET ${updateCols}`;
  },
  currentTimestamp(): string {
    return `STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')`;
  }
};
