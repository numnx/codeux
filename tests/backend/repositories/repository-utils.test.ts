import { describe, it, expect } from "vitest";
import {
  parseJsonOr,
  parseJsonThrows,
  parseJsonArray,
  serializePayloadJson,
  parsePayloadJson,
  RepositoryError
} from "../../../src/repositories/repository-utils.js";

describe("repository-utils JSON helpers", () => {
  describe("parseJsonOr", () => {
    it("returns parsed object for valid JSON", () => {
      expect(parseJsonOr('{"a": 1}', {})).toEqual({ a: 1 });
    });

    it("returns fallback for malformed JSON", () => {
      expect(parseJsonOr('{a: 1', { fallback: true })).toEqual({ fallback: true });
    });

    it("returns fallback for null or empty strings", () => {
      expect(parseJsonOr(null, { fallback: true })).toEqual({ fallback: true });
      expect(parseJsonOr("   ", { fallback: true })).toEqual({ fallback: true });
    });
  });

  describe("parseJsonThrows", () => {
    it("returns parsed object for valid JSON", () => {
      expect(parseJsonThrows('{"a": 1}')).toEqual({ a: 1 });
    });

    it("throws RepositoryError for malformed JSON", () => {
      expect(() => parseJsonThrows('{a: 1')).toThrow(RepositoryError);
    });

    it("throws RepositoryError for null or empty strings", () => {
      expect(() => parseJsonThrows(null)).toThrow(RepositoryError);
      expect(() => parseJsonThrows("   ")).toThrow(RepositoryError);
    });
  });

  describe("parseJsonArray", () => {
    it("returns array for valid JSON array", () => {
      expect(parseJsonArray('["a", "b"]')).toEqual(["a", "b"]);
    });

    it("returns empty array for valid JSON object", () => {
      expect(parseJsonArray('{"a": 1}')).toEqual([]);
    });

    it("returns empty array for malformed JSON", () => {
      expect(parseJsonArray('{a: 1')).toEqual([]);
    });

    it("returns empty array for null or empty strings", () => {
      expect(parseJsonArray(null)).toEqual([]);
    });
  });

  describe("parsePayloadJson", () => {
    it("returns object for valid JSON object", () => {
      expect(parsePayloadJson('{"a": 1}')).toEqual({ a: 1 });
    });

    it("returns null for malformed JSON without throwOnError", () => {
      expect(parsePayloadJson('{a: 1')).toBeNull();
    });

    it("throws RepositoryError for malformed JSON with throwOnError", () => {
      expect(() => parsePayloadJson('{a: 1', true)).toThrow(RepositoryError);
    });

    it("returns null for null or empty strings", () => {
      expect(parsePayloadJson(null)).toBeNull();
      expect(parsePayloadJson("   ")).toBeNull();
    });
  });

  describe("serializePayloadJson", () => {
    it("serializes objects cleanly", () => {
      expect(serializePayloadJson({ a: 1 })).toBe('{"a":1}');
    });

    it("returns null for undefined", () => {
      expect(serializePayloadJson(undefined)).toBeNull();
    });
  });
});
