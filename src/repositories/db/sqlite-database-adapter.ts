import type { DatabaseSync, StatementSync } from "node:sqlite";
import { DatabaseAdapter, PreparedStatement } from "./database-adapter.js";
import { SqlDialect, SqliteDialect } from "./sql-dialect.js";
import { openSqliteDatabase } from "../sqlite-connection.js";
import * as fs from "fs";
import * as path from "path";

export class SqliteDatabaseAdapter implements DatabaseAdapter {
  public readonly dialect: SqlDialect = SqliteDialect;
  private readonly db: DatabaseSync;
  private readonly cachedStatements = new Map<string, StatementSync>();

  constructor(dbPath: string) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = openSqliteDatabase(dbPath);
  }

  prepare(sql: string): PreparedStatement {
    let stmt = this.cachedStatements.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.cachedStatements.set(sql, stmt);
    }
    return stmt as unknown as PreparedStatement;
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  transaction<T>(fn: () => T): T {
    this.exec("BEGIN");
    try {
      const result = fn();
      this.exec("COMMIT");
      return result;
    } catch (error) {
      this.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }

  /**
   * For backwards compatibility with direct SQLite accesses in tests or specific instances
   */
  getRawDatabase(): DatabaseSync {
    return this.db;
  }
}
