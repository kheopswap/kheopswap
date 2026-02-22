import { describe, expect, it } from "vitest";
import { safeParse, safeStringify } from "./serialization";

describe("safeStringify", () => {
	it("stringifies plain objects", () => {
		expect(safeStringify({ a: 1, b: "hello" })).toBe('{"a":1,"b":"hello"}');
	});

	it("serializes bigint values with prefix", () => {
		const result = safeStringify({ value: 123456789n });
		expect(result).toBe('{"value":"bigint:123456789"}');
	});

	it("handles nested bigint values", () => {
		const result = safeStringify({ nested: { deep: 42n } });
		expect(result).toContain('"bigint:42"');
	});

	it("returns empty string for null", () => {
		expect(safeStringify(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(safeStringify(undefined)).toBe("");
	});

	it("supports formatted output", () => {
		const result = safeStringify({ a: 1 }, true);
		expect(result).toContain("\n");
		expect(result).toContain("  ");
	});

	it("handles arrays with bigint", () => {
		const result = safeStringify([1n, 2n, 3n]);
		expect(result).toBe('["bigint:1","bigint:2","bigint:3"]');
	});
});

describe("safeParse", () => {
	it("parses plain JSON", () => {
		expect(safeParse('{"a":1}')).toEqual({ a: 1 });
	});

	it("revives bigint prefixed values", () => {
		const result = safeParse<{ value: bigint }>('{"value":"bigint:123456789"}');
		expect(result.value).toBe(123456789n);
	});

	it("revives nested bigint values", () => {
		const result = safeParse<{ nested: { deep: bigint } }>(
			'{"nested":{"deep":"bigint:42"}}',
		);
		expect(result.nested.deep).toBe(42n);
	});

	it("roundtrips objects with bigint", () => {
		const original = { amount: 10_000_000_000n, label: "test" };
		const serialized = safeStringify(original);
		const restored = safeParse<typeof original>(serialized);
		expect(restored).toEqual(original);
	});

	it("roundtrips arrays with bigint", () => {
		const original = [1n, 2n, 3n];
		const serialized = safeStringify(original);
		const restored = safeParse<bigint[]>(serialized);
		expect(restored).toEqual(original);
	});
});
