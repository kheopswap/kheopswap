import { describe, expect, it } from "vitest";
import { getAssetConvertPlancks } from "./getAssetConvertPlancks";

describe("getAssetConvertPlancks", () => {
	const NATIVE = "native::pah";
	const USDT = "asset::pah::1984";
	const USDC = "asset::pah::1337";

	describe("same token conversion", () => {
		it("should return same amount when converting to same token", () => {
			expect(
				getAssetConvertPlancks(
					1000n,
					USDT,
					NATIVE,
					USDT,
					[100n, 100n],
					[100n, 100n],
				),
			).toBe(1000n);
		});
	});

	describe("zero amount", () => {
		it("should return 0 when converting 0", () => {
			expect(
				getAssetConvertPlancks(
					0n,
					USDT,
					NATIVE,
					USDC,
					[100n, 100n],
					[100n, 100n],
				),
			).toBe(0n);
		});
	});

	describe("native to token conversion", () => {
		it("should convert native to token using reserves", () => {
			// Native to USDT pool: 1000 native = 2000 USDT (1:2 ratio)
			const result = getAssetConvertPlancks(
				100n, // 100 native
				NATIVE,
				NATIVE,
				USDT,
				[1n, 1n], // unused for native->token
				[1000n, 2000n], // 1000 native = 2000 USDT
			);
			expect(result).toBe(200n); // 100 * 2000 / 1000 = 200
		});

		it("should handle 1:1 ratio", () => {
			const result = getAssetConvertPlancks(
				500n,
				NATIVE,
				NATIVE,
				USDT,
				[1n, 1n],
				[1000n, 1000n],
			);
			expect(result).toBe(500n);
		});
	});

	describe("token to native conversion", () => {
		it("should convert token to native using reserves", () => {
			// USDT to Native pool: 2000 USDT = 1000 native (2:1 ratio)
			const result = getAssetConvertPlancks(
				200n, // 200 USDT
				USDT,
				NATIVE,
				NATIVE,
				[1000n, 2000n], // 1000 native = 2000 USDT
				[1n, 1n], // unused when output is native
			);
			// 200 * 1000 / 2000 = 100
			expect(result).toBe(100n);
		});
	});

	describe("token to token conversion (via native)", () => {
		it("should convert through native token", () => {
			// USDT -> Native -> USDC
			// USDT pool: 1000 native = 2000 USDT
			// USDC pool: 1000 native = 1500 USDC
			const result = getAssetConvertPlancks(
				2000n, // 2000 USDT
				USDT,
				NATIVE,
				USDC,
				[1000n, 2000n], // USDT pool
				[1000n, 1500n], // USDC pool
			);
			// USDT to native: 2000 * 1000 / 2000 = 1000 native
			// Native to USDC: 1000 * 1500 / 1000 = 1500 USDC
			expect(result).toBe(1500n);
		});
	});

	describe("edge cases", () => {
		it("should return undefined when reserves contain zero", () => {
			const result = getAssetConvertPlancks(
				100n,
				USDT,
				NATIVE,
				USDC,
				[0n, 100n], // zero in reserves
				[100n, 100n],
			);
			expect(result).toBeUndefined();
		});

		it("should return undefined when reserves are null-ish", () => {
			const result = getAssetConvertPlancks(
				100n,
				USDT,
				NATIVE,
				USDC,
				null as unknown as [bigint, bigint],
				[100n, 100n],
			);
			expect(result).toBeUndefined();
		});

		it("should handle large numbers without overflow", () => {
			const largeAmount = BigInt("1000000000000000000000"); // 10^21
			const result = getAssetConvertPlancks(
				largeAmount,
				NATIVE,
				NATIVE,
				USDT,
				[1n, 1n],
				[1000n, 2000n],
			);
			expect(result).toBe(largeAmount * 2n);
		});
	});
});
