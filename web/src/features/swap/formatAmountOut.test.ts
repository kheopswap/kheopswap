import { describe, expect, it } from "vitest";
import { formatAmountOut } from "./formatAmountOut";

describe("formatAmountOut", () => {
	it.each([
		["28859.8848080302", "28859.8"],
		["0.09947525", "0.0994752"],
		["1.137336", "1.13733"],
		["123456789.5", "123456789"],
		["0.5", "0.5"],
		["42", "42"],
		["1.000000001", "1"],
		["0.000000012345678", "0.0000000123456"],
		["", ""],
	])("rounds %s down to six significant digits: %s", (amount, formatted) => {
		expect(formatAmountOut(amount)).toBe(formatted);
	});
});
