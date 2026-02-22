import { describe, expect, it } from "vitest";
import { plancksToTokens, tokensToPlancks } from "./plancks";

describe("tokensToPlancks", () => {
	it("converts integer token amount", () => {
		expect(tokensToPlancks("1", 10)).toBe(10_000_000_000n);
	});

	it("converts decimal token amount", () => {
		expect(tokensToPlancks("1.5", 10)).toBe(15_000_000_000n);
	});

	it("converts zero", () => {
		expect(tokensToPlancks("0", 10)).toBe(0n);
	});

	it("handles high precision", () => {
		expect(tokensToPlancks("0.0000000001", 10)).toBe(1n);
	});

	it("handles number input", () => {
		expect(tokensToPlancks(2, 12)).toBe(2_000_000_000_000n);
	});

	it("handles no decimals", () => {
		expect(tokensToPlancks("100", 0)).toBe(100n);
	});

	it("handles large amounts", () => {
		expect(tokensToPlancks("1000000", 10)).toBe(10_000_000_000_000_000n);
	});
});

describe("plancksToTokens", () => {
	it("converts plancks to token string", () => {
		expect(plancksToTokens(10_000_000_000n, 10)).toBe("1");
	});

	it("converts fractional plancks", () => {
		expect(plancksToTokens(15_000_000_000n, 10)).toBe("1.5");
	});

	it("converts zero", () => {
		expect(plancksToTokens(0n, 10)).toBe("0");
	});

	it("converts minimal planck", () => {
		expect(plancksToTokens(1n, 10)).toBe("0.0000000001");
	});

	it("handles string plancks input", () => {
		expect(plancksToTokens("10000000000", 10)).toBe("1");
	});

	it("handles zero decimals", () => {
		expect(plancksToTokens(100n, 0)).toBe("100");
	});

	it("roundtrips through both functions", () => {
		const original = "123.456";
		const plancks = tokensToPlancks(original, 10);
		const tokens = plancksToTokens(plancks, 10);
		expect(tokens).toBe("123.456");
	});
});
