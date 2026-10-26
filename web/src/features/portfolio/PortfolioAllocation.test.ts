import { describe, expect, it } from "vitest";
import type { Token } from "../../registry/tokens/types";
import { formatShare, getLegendLabels } from "./PortfolioAllocation";

const token = (symbol: string, chainId: string) =>
	({ symbol, chainId }) as Token;

describe("getLegendLabels", () => {
	it("qualifies a symbol with its chain only when another slice shares it", () => {
		expect(
			getLegendLabels([
				token("PAS", "pasah"),
				token("PAS", "paspeople"),
				token("MYTH", "pasah"),
			]),
		).toEqual(["PAS (Paseo AH)", "PAS (Paseo People)", "MYTH"]);
	});
});

describe("formatShare", () => {
	it("rounds to whole percents but never shows a held share as 0%", () => {
		expect(formatShare(0.5123)).toBe("51%");
		expect(formatShare(0.0049)).toBe("< 1%");
		expect(formatShare(0.005)).toBe("1%");
		expect(formatShare(0)).toBe("0%");
	});
});
