import { cleanup, render, screen } from "@testing-library/react";
import { of } from "rxjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StablePrice } from "./StablePrice";

const usdc = vi.hoisted(() => ({
	id: "asset::pah::1337",
	symbol: "USDC",
	decimals: 6,
	chainId: "pah",
}));

const DOT = 10_000_000_000n;
const USDC = 1_000_000n;

const reservesFromNative: Record<string, [bigint, bigint]> = {
	"asset::pah::1337": [1_000n * DOT, 5_000n * USDC],
	"asset::pah::30": [100n * DOT, 100n * DOT],
	"asset::pah::31": [1n * DOT, 1n * DOT],
};

vi.mock("../state/relay", async () => {
	const { of } = await import("rxjs");
	return {
		useRelayChains: () => ({ stableToken: usdc }),
		assetHub$: of({ id: "pah" }),
		stableToken$: of(usdc),
		relayChains$: of({ assetHub: { id: "pah" }, allChains: [] }),
	};
});

vi.mock("../services/pools/reserves", () => ({
	getPoolReserves$: (_native: string, tokenId: string) =>
		of({ reserves: reservesFromNative[tokenId] ?? null, isLoading: false }),
}));

vi.mock("../papi/getApi", () => ({
	getApi: async () => ({
		constants: { AssetConversion: { LPFee: async () => 3000 } },
	}),
}));

Element.prototype.animate = vi.fn(
	() => ({ play: () => {} }) as unknown as Animation,
);

afterEach(cleanup);

describe("StablePrice", () => {
	it("values an amount at what selling it returns, as the lists do", async () => {
		render(<StablePrice tokenId="asset::pah::30" plancks={50n * DOT} />);

		expect(await screen.findByText("166.33 USDC")).toBeTruthy();
	});

	it("warns instead of valuing an amount that would drain its pool", async () => {
		render(<StablePrice tokenId="asset::pah::31" plancks={50n * DOT} />);

		expect(await screen.findByText("Low liquidity")).toBeTruthy();
	});

	it("prints no value for an empty amount of a token without a pool", () => {
		render(<StablePrice tokenId="asset::pah::32" plancks={0n} />);

		expect(screen.getByText(/USDC/).className).toMatch(/invisible/);
	});
});
