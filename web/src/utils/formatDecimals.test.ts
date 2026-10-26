import { describe, expect, it } from "vitest";
import { formatDecimals, formatStableValue } from "./formatDecimals";

describe("formatDecimals", () => {
	it("returns empty string for null", () => {
		expect(formatDecimals(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatDecimals(undefined)).toBe("");
	});

	it("returns '0' for zero", () => {
		expect(formatDecimals(0)).toBe("0");
		expect(formatDecimals("0")).toBe("0");
	});

	it("formats value above 1000 with compact notation", () => {
		expect(formatDecimals("1234.5678")).toBe("1.235K");
	});

	it("formats with custom digits", () => {
		const result = formatDecimals("1.23456", 2);
		expect(result).toMatch(/1\.2/);
	});

	it("shows '< 0.0001' for sub-displayable values with 4 digits", () => {
		expect(formatDecimals("0.00001")).toBe("< 0.0001");
	});

	it("shows '< 0.01' for sub-displayable values with 2 digits", () => {
		expect(formatDecimals("0.001", 2)).toBe("< 0.01");
	});

	it("keeps the sign of a negative value", () => {
		expect(formatDecimals("-1234.5678")).toBe("-1.235K");
		expect(formatDecimals(-0.5)).toBe("-0.5");
		expect(formatDecimals("-0.00001")).toBe("> -0.0001");
	});

	it("formats large numbers with compact notation", () => {
		const result = formatDecimals("1234567");
		expect(result).toMatch(/1\.235M/);
	});

	it("handles string input", () => {
		expect(formatDecimals("42")).toBe("42");
	});

	it("handles number input", () => {
		expect(formatDecimals(42)).toBe("42");
	});
});

describe("formatStableValue", () => {
	it("keeps two fraction digits instead of two significant digits", () => {
		expect(formatStableValue("1.034")).toBe("1.03");
		expect(formatStableValue(10.54)).toBe("10.54");
		expect(formatStableValue("123.45")).toBe("123.45");
		expect(formatStableValue("5092.6")).toBe("5,092.60");
		expect(formatStableValue("0.99")).toBe("0.99");
	});

	it("compacts only from a million", () => {
		expect(formatStableValue(999_999.99)).toBe("999,999.99");
		expect(formatStableValue(1_234_567)).toBe("1.23M");
	});

	it("floors tiny values and prints zero with its fraction", () => {
		expect(formatStableValue("0.001")).toBe("< 0.01");
		expect(formatStableValue(0)).toBe("0.00");
		expect(formatStableValue(null)).toBe("");
	});
});
