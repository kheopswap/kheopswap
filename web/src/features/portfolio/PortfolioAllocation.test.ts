import { describe, expect, it } from "vitest";
import type { Token } from "../../registry/tokens/types";
import { getLegendLabels } from "./PortfolioAllocation";

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
