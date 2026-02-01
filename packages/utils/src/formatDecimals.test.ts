import { describe, expect, it } from "vitest";
import { formatDecimals } from "./formatDecimals";

describe("formatDecimals", () => {
	it("formats whole numbers", () => {
		expect(formatDecimals(100)).toBe("100");
		expect(formatDecimals(1000)).toBe("1K");
		expect(formatDecimals(1000000)).toBe("1M");
	});

	it("formats decimal numbers with default 4 digits", () => {
		expect(formatDecimals(1.2345)).toBe("1.235");
		expect(formatDecimals(1.23456789)).toBe("1.235");
	});

	it("formats with custom digits", () => {
		expect(formatDecimals(1.23456789, 2)).toBe("1.2");
		expect(formatDecimals(1.23456789, 6)).toBe("1.23457");
	});

	it("handles zero", () => {
		expect(formatDecimals(0)).toBe("0");
		expect(formatDecimals("0")).toBe("0");
	});

	it("handles null and undefined", () => {
		expect(formatDecimals(null)).toBe("");
		expect(formatDecimals(undefined)).toBe("");
	});

	it("handles string input", () => {
		expect(formatDecimals("123.456")).toBe("123.5");
		expect(formatDecimals("1000000")).toBe("1M");
	});

	it("shows less-than for very small numbers", () => {
		expect(formatDecimals(0.00001, 4)).toBe("< 0.0001");
		expect(formatDecimals(0.000001, 4)).toBe("< 0.0001");
	});

	it("formats large numbers with compact notation", () => {
		expect(formatDecimals(1234567890)).toBe("1.235B");
		expect(formatDecimals(12345678901234)).toBe("12.35T");
	});
});
