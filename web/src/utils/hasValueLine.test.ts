import { describe, expect, it } from "vitest";
import { hasValueLine } from "./hasValueLine";

describe("hasValueLine", () => {
	it("values a non-zero amount of any token but the stable one", () => {
		expect(hasValueLine("native::ppeople", "native::pasah", 5n)).toBe(true);
		expect(hasValueLine("native::pasah", "native::pasah", 5n)).toBe(false);
	});

	it("never values a zero amount, and keeps room for an amount still loading", () => {
		expect(hasValueLine("asset::pasah::7", "native::pasah", 0n)).toBe(false);
		expect(hasValueLine("asset::pasah::7", "native::pasah", null)).toBe(true);
	});
});
