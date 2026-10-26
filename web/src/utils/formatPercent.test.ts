import { describe, expect, it } from "vitest";
import { formatFixedPercent, formatPercent } from "./formatPercent";

describe("formatPercent", () => {
	it("formats zero", () => {
		expect(formatPercent(0)).toBe("0%");
	});

	it("formats a whole percent", () => {
		expect(formatPercent(0.1)).toBe("10%");
	});

	it("formats fractional percent", () => {
		expect(formatPercent(0.05123)).toBe("5.12%");
	});

	it("formats 100% ratio", () => {
		expect(formatPercent(1)).toBe("100%");
	});

	it("formats small ratio", () => {
		expect(formatPercent(0.001)).toBe("0.1%");
	});
});

describe("formatFixedPercent", () => {
	it.each([
		[0.53, "53.00%"],
		[0.53004, "53.00%"],
		[0.1054, "10.54%"],
		[-0.001, "-0.10%"],
	])("formats %s as %s", (ratio, text) => {
		expect(formatFixedPercent(ratio)).toBe(text);
	});
});
