import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import { TokenDetailsRowValue } from "./TokenDetailsRow";

const token = (id: string, symbol: string, decimals: number) =>
	({ id, symbol, decimals, type: "native", chainId: "pah" }) as Token;

const usdc = token("asset::pah::1337", "USDC", 6);
const dot = token("native::pah", "DOT", 10);
const batc = token("asset::pah::50001010", "BATC", 10);

vi.mock("../../state/relay", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../state/relay")>()),
	useRelayChains: () => ({ stableToken: usdc }),
}));

const summary = (
	tokenPlancks: bigint | null,
	valuation:
		| { status: "priced"; stablePlancks: bigint }
		| { status: "unpriced"; stablePlancks: null },
): BalanceWithStableSummary => ({
	tokenId: batc.id,
	tokenPlancks,
	isLoadingTokenPlancks: false,
	isLoadingStablePlancks: false,
	isInitializing: false,
	...valuation,
});

describe("TokenDetailsRowValue", () => {
	it("prints a tiny price in full, as the row does", () => {
		const { container } = render(
			<TokenDetailsRowValue
				{...summary(5200n, { status: "priced", stablePlancks: 1n })}
				token={dot}
				isPrice
			/>,
		);
		expect(container.textContent).toContain("0.00000052 DOT");
	});

	it("shows a zero amount alone, without a value or a label", () => {
		const { container } = render(
			<TokenDetailsRowValue
				{...summary(null, { status: "unpriced", stablePlancks: null })}
				token={batc}
			/>,
		);
		expect(container.textContent).toBe("0 BATC");
	});

	it("labels a held amount that has no price", () => {
		const { container } = render(
			<TokenDetailsRowValue
				{...summary(10_000_000_000n, {
					status: "unpriced",
					stablePlancks: null,
				})}
				token={batc}
			/>,
		);
		expect(container.textContent).toBe("1 BATCNo price");
	});
});
