import { describe, expect, it } from "vitest";
import { safeQueryKeyPart } from "./safeQueryKeyPart";

describe("safeQueryKeyPart", () => {
	it("returns null for null", () => {
		expect(safeQueryKeyPart(null)).toBeNull();
	});

	it("returns undefined for undefined", () => {
		expect(safeQueryKeyPart(undefined)).toBeUndefined();
	});

	it("stringifies a string value", () => {
		expect(safeQueryKeyPart("hello")).toBe('"hello"');
	});

	it("stringifies a number value", () => {
		expect(safeQueryKeyPart(42)).toBe("42");
	});

	it("stringifies an object", () => {
		expect(safeQueryKeyPart({ a: 1 })).toBe('{"a":1}');
	});

	it("stringifies bigint values safely", () => {
		expect(safeQueryKeyPart(123n)).toBe('"bigint:123"');
	});
});
