import { describe, expect, it } from "vitest";
import { formatDecimals } from "./formatDecimals";

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
