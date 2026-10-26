import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import type { HoldingValuation } from "../../utils/getHoldingValuation";
import { TokenDetailsRowValue } from "./TokenDetailsRow";

const token = (id: string, symbol: string, decimals: number) =>
	({ id, symbol, decimals, type: "native", chainId: "pah" }) as Token;

const usdc = token("asset::pah::1337", "USDC", 6);
const dot = token("native::pah", "DOT", 10);
const batc = token("asset::pah::50001010", "BATC", 10);

const pas = token("native::pasah", "PAS", 10);
const peoplePas = token("native::ppeople", "PAS", 10);
const myth = token("foreign-asset::pasah::myth", "MYTH", 18);

const relay = vi.hoisted(() => ({ stableToken: undefined as unknown }));

beforeEach(() => {
	relay.stableToken = usdc;
});

vi.mock("../../state/relay", async (importOriginal) => ({
	...(await importOriginal<typeof import("../../state/relay")>()),
	useRelayChains: () => ({ stableToken: relay.stableToken }),
}));

vi.mock("../../state/prices", async (importOriginal) => {
	const { of } = await import("rxjs");
	return {
		...(await importOriginal<typeof import("../../state/prices")>()),
		getAssetHubMirrorTokenId$: (tokenId: string) =>
			of(tokenId === "native::ppeople" ? "native::pasah" : tokenId),
	};
});

const summary = (
	tokenPlancks: bigint | null,
	valuation: HoldingValuation,
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

	it("labels a low-liquidity price where the native token is the stable one", () => {
		relay.stableToken = pas;
		const { container } = render(
			<TokenDetailsRowValue
				{...summary(4_864_000_000_000_000n, {
					status: "holding-dwarfs-pool",
					stablePlancks: null,
				})}
				tokenId={myth.id}
				token={pas}
				isPrice
			/>,
		);
		expect(container.textContent).toBe("486.4K PASLow liquidity");
	});

	it("prints no stable value under a mirror of the stable token", () => {
		relay.stableToken = pas;
		const { container } = render(
			<TokenDetailsRowValue
				{...summary(50_010_700_000_000n, {
					status: "priced",
					stablePlancks: 50_010_700_000_000n,
				})}
				tokenId={peoplePas.id}
				token={peoplePas}
			/>,
		);
		expect(container.textContent).toBe("5.001K PAS");
	});
});
