import { SqlDialect } from "./sql-dialect.js";

export interface PreparedStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface DatabaseAdapter {
  readonly dialect: SqlDialect;

  prepare(sql: string): PreparedStatement;
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;

  close(): void;
}
