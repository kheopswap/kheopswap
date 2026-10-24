import { describe, expect, it } from "vitest";
import { formatCountUpFrame } from "./CountUpDecimals";

describe("formatCountUpFrame", () => {
	it("shows the lower bound when the animation rounds a positive total to zero", () => {
		expect(formatCountUpFrame(0, 1e-12)).toBe("< 0.01");
	});

	it("keeps a zero total at zero and formats running frames as they are", () => {
		expect(formatCountUpFrame(0, 0)).toBe("0.00");
		expect(formatCountUpFrame(5.5, 10)).toBe("5.50");
	});
});
