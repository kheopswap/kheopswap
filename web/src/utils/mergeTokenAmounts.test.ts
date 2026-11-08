import { describe, expect, it } from "vitest";
import { mergeTokenAmounts } from "./mergeTokenAmounts";

describe("mergeTokenAmounts", () => {
	it("sums amounts per token in first-seen order and drops empty totals", () => {
		expect(
			mergeTokenAmounts([
				{ tokenId: "native::pah", plancks: 5n },
				{ tokenId: "asset::pah::1337", plancks: 0n },
				{ tokenId: "native::pah", plancks: 2n },
			]),
		).toEqual([{ tokenId: "native::pah", plancks: 7n }]);
	});
});
