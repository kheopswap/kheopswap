import { describe, expect, it } from "vitest";
import { getTokenTypeLabel } from "./getTokenTypeLabel";

describe("getTokenTypeLabel", () => {
	it("returns label for native", () => {
		expect(getTokenTypeLabel("native")).toBe("Native Token");
	});

	it("returns label for asset", () => {
		expect(getTokenTypeLabel("asset")).toBe("Asset Token (Asset Hub)");
	});

	it("returns label for pool-asset", () => {
		expect(getTokenTypeLabel("pool-asset")).toBe("Liquidity Pool Token");
	});

	it("returns label for foreign-asset", () => {
		expect(getTokenTypeLabel("foreign-asset")).toBe(
			"Foreign Asset (Asset Hub)",
		);
	});
});
