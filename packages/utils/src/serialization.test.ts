import { Binary } from "polkadot-api";
import { describe, expect, it } from "vitest";
import { safeParse, safeStringify } from "./serialization";

describe("safeStringify", () => {
	describe("primitive values", () => {
		it("should return empty string for null", () => {
			// safeStringify returns value?.toString() ?? "" for falsy values
			// null?.toString() returns undefined, so ?? "" returns ""
			expect(safeStringify(null)).toBe("");
		});

		it("should return empty string for undefined", () => {
			expect(safeStringify(undefined)).toBe("");
		});

		it("should stringify strings", () => {
			expect(safeStringify("hello")).toBe('"hello"');
		});

		it("should stringify numbers", () => {
			expect(safeStringify(123)).toBe("123");
		});

		it("should stringify booleans", () => {
			expect(safeStringify(true)).toBe("true");
		});
	});

	describe("bigint handling", () => {
		it("should serialize bigint with prefix", () => {
			expect(safeStringify(123n)).toBe('"bigint:123"');
		});

		it("should serialize negative bigint", () => {
			expect(safeStringify(-456n)).toBe('"bigint:-456"');
		});

		it("should serialize bigint in objects", () => {
			const obj = { amount: 1000000000000n, name: "test" };
			const result = safeStringify(obj);
			expect(result).toBe('{"amount":"bigint:1000000000000","name":"test"}');
		});

		it("should serialize bigint in arrays", () => {
			const arr = [1n, 2n, 3n];
			const result = safeStringify(arr);
			expect(result).toBe('["bigint:1","bigint:2","bigint:3"]');
		});
	});

	describe("Binary handling", () => {
		it("should serialize Binary with prefix", () => {
			const binary = Binary.fromHex("0x1234abcd");
			const result = safeStringify(binary);
			expect(result).toBe('"binary:0x1234abcd"');
		});

		it("should serialize Binary in objects", () => {
			const obj = { data: Binary.fromHex("0xdeadbeef") };
			const result = safeStringify(obj);
			expect(result).toBe('{"data":"binary:0xdeadbeef"}');
		});
	});

	describe("complex objects", () => {
		it("should serialize nested objects with bigint", () => {
			const obj = {
				token: { id: "DOT", amount: 100n },
				nested: { deep: { value: 999n } },
			};
			const result = safeStringify(obj);
			expect(result).toContain('"bigint:100"');
			expect(result).toContain('"bigint:999"');
		});
	});

	describe("formatting", () => {
		it("should format with indentation when format=true", () => {
			const obj = { a: 1, b: 2 };
			const result = safeStringify(obj, true);
			expect(result).toContain("\n");
			expect(result).toContain("  ");
		});
	});
});

describe("safeParse", () => {
	describe("primitive values", () => {
		it("should parse strings", () => {
			expect(safeParse('"hello"')).toBe("hello");
		});

		it("should parse numbers", () => {
			expect(safeParse("123")).toBe(123);
		});

		it("should parse booleans", () => {
			expect(safeParse("true")).toBe(true);
		});

		it("should parse null", () => {
			expect(safeParse("null")).toBe(null);
		});
	});

	describe("bigint handling", () => {
		it("should deserialize bigint from prefix", () => {
			expect(safeParse('"bigint:123"')).toBe(123n);
		});

		it("should deserialize negative bigint", () => {
			expect(safeParse('"bigint:-456"')).toBe(-456n);
		});

		it("should deserialize bigint in objects", () => {
			const result = safeParse<{ amount: bigint }>(
				'{"amount":"bigint:1000000000000"}',
			);
			expect(result.amount).toBe(1000000000000n);
		});

		it("should deserialize bigint in arrays", () => {
			const result = safeParse<bigint[]>('["bigint:1","bigint:2","bigint:3"]');
			expect(result).toEqual([1n, 2n, 3n]);
		});
	});

	describe("Binary handling", () => {
		it("should deserialize Binary from prefix", () => {
			const result = safeParse<Binary>('"binary:0x1234abcd"');
			expect(result.asHex()).toBe("0x1234abcd");
		});
	});

	describe("roundtrip", () => {
		it("should roundtrip complex objects", () => {
			const original = {
				amount: 123456789012345678901234567890n,
				data: Binary.fromHex("0xdeadbeef"),
				name: "test",
				count: 42,
			};
			const serialized = safeStringify(original);
			const parsed = safeParse<typeof original>(serialized as string);

			expect(parsed.amount).toBe(original.amount);
			expect(parsed.data.asHex()).toBe(original.data.asHex());
			expect(parsed.name).toBe(original.name);
			expect(parsed.count).toBe(original.count);
		});
	});
});
