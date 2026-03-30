import { describe, expect, it } from "vitest";
import { SqliteDialect } from "../../../../src/repositories/db/sql-dialect.js";

describe("SqliteDialect", () => {
  it("generates json extract sql", () => {
    expect(SqliteDialect.jsonExtract("payload_json", "$.key")).toBe("json_extract(payload_json, '$.key')");
  });

  it("generates upsert sql", () => {
    expect(SqliteDialect.upsert(["id"], ["name", "status"])).toBe("ON CONFLICT(id) DO UPDATE SET name = excluded.name, status = excluded.status");
  });

  it("generates current timestamp sql", () => {
    expect(SqliteDialect.currentTimestamp()).toBe("STRFTIME('%Y-%m-%dT%H:%M:%fZ', 'now')");
  });
});
