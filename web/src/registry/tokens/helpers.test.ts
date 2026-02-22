import { describe, expect, it } from "vitest";
import {
	getChainIdFromTokenId,
	getTokenId,
	isTokenIdAsset,
	isTokenIdNative,
	parseTokenId,
} from "./helpers";
import type { TokenId } from "./types";

describe("parseTokenId", () => {
	it("parses native token id", () => {
		const result = parseTokenId("native::pah" as TokenId);
		expect(result).toEqual({ type: "native", chainId: "pah" });
	});

	it("parses asset token id", () => {
		const result = parseTokenId("asset::pah::1984" as TokenId);
		expect(result).toEqual({ type: "asset", chainId: "pah", assetId: 1984 });
	});

	it("parses asset token id with zero", () => {
		const result = parseTokenId("asset::kah::0" as TokenId);
		expect(result).toEqual({ type: "asset", chainId: "kah", assetId: 0 });
	});

	it("parses pool-asset token id", () => {
		const result = parseTokenId("pool-asset::wah::42" as TokenId);
		expect(result).toEqual({
			type: "pool-asset",
			chainId: "wah",
			poolAssetId: 42,
		});
	});

	it("parses native token id for all supported chains", () => {
		for (const chainId of ["pah", "kah", "wah", "pasah"]) {
			const result = parseTokenId(`native::${chainId}` as TokenId);
			expect(result).toEqual({ type: "native", chainId });
		}
	});

	it("throws for unsupported chain id", () => {
		expect(() => parseTokenId("native::unknown" as TokenId)).toThrow(
			"Failed to parse token id",
		);
	});

	it("throws for unsupported token type", () => {
		expect(() => parseTokenId("invalid::pah" as TokenId)).toThrow(
			"Failed to parse token id",
		);
	});

	it("throws for invalid asset id (NaN)", () => {
		expect(() => parseTokenId("asset::pah::abc" as TokenId)).toThrow(
			"Failed to parse token id",
		);
	});
});

describe("getTokenId", () => {
	it("creates native token id", () => {
		const id = getTokenId({ type: "native", chainId: "pah" });
		expect(id).toBe("native::pah");
	});

	it("creates asset token id", () => {
		const id = getTokenId({ type: "asset", chainId: "pah", assetId: 1984 });
		expect(id).toBe("asset::pah::1984");
	});

	it("creates pool-asset token id", () => {
		const id = getTokenId({
			type: "pool-asset",
			chainId: "kah",
			poolAssetId: 7,
		});
		expect(id).toBe("pool-asset::kah::7");
	});

	it("roundtrips native token id", () => {
		const original = "native::pah" as TokenId;
		const parsed = parseTokenId(original);
		const rebuilt = getTokenId(parsed);
		expect(rebuilt).toBe(original);
	});

	it("roundtrips asset token id", () => {
		const original = "asset::kah::1984" as TokenId;
		const parsed = parseTokenId(original);
		const rebuilt = getTokenId(parsed);
		expect(rebuilt).toBe(original);
	});

	it("roundtrips pool-asset token id", () => {
		const original = "pool-asset::wah::42" as TokenId;
		const parsed = parseTokenId(original);
		const rebuilt = getTokenId(parsed);
		expect(rebuilt).toBe(original);
	});
});

describe("isTokenIdNative", () => {
	it("returns true for native token id", () => {
		expect(isTokenIdNative("native::pah" as TokenId)).toBe(true);
	});

	it("returns false for asset token id", () => {
		expect(isTokenIdNative("asset::pah::1984" as TokenId)).toBe(false);
	});

	it("returns false for null", () => {
		expect(isTokenIdNative(null)).toBe(false);
	});

	it("returns false for undefined", () => {
		expect(isTokenIdNative(undefined)).toBe(false);
	});
});

describe("isTokenIdAsset", () => {
	it("returns true for asset token id", () => {
		expect(isTokenIdAsset("asset::pah::1984" as TokenId)).toBe(true);
	});

	it("returns false for native token id", () => {
		expect(isTokenIdAsset("native::pah" as TokenId)).toBe(false);
	});

	it("returns false for null", () => {
		expect(isTokenIdAsset(null)).toBe(false);
	});
});

describe("getChainIdFromTokenId", () => {
	it("extracts chain id from native token", () => {
		expect(getChainIdFromTokenId("native::pah" as TokenId)).toBe("pah");
	});

	it("extracts chain id from asset token", () => {
		expect(getChainIdFromTokenId("asset::kah::1984" as TokenId)).toBe("kah");
	});

	it("returns null for null input", () => {
		expect(getChainIdFromTokenId(null)).toBeNull();
	});

	it("returns null for undefined input", () => {
		expect(getChainIdFromTokenId(undefined)).toBeNull();
	});
});
