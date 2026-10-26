import { describe, expect, it } from "vitest";
import type { UnvaluedStatus } from "../utils/getHoldingValuation";
import { getValuationExplanation } from "./ValuationLabel";

const STATUSES: UnvaluedStatus[] = [
	"thin-pool",
	"holding-dwarfs-pool",
	"unpriced",
];

describe("getValuationExplanation", () => {
	it.each(STATUSES)(
		"keeps the total out of the price column for %s",
		(status) => {
			expect(getValuationExplanation(status, "price", "USDC")).not.toMatch(
				/total/,
			);
		},
	);

	it.each(STATUSES)("says a %s holding is left out of the total", (status) => {
		expect(getValuationExplanation(status, "holding", "USDC")).toMatch(
			/not counted in your total\.$/,
		);
	});

	it("names the pool floor in the stable token for a thin pool", () => {
		expect(getValuationExplanation("thin-pool", "price", "USDC")).toBe(
			"This token's pool holds under 100 USDC, so its price is unreliable.",
		);
	});
});
