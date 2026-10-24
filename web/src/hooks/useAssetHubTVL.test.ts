import { describe, expect, it } from "vitest";
import type { Token } from "../registry/tokens/types";
import { getTvlRows } from "./useAssetHubTVL";

const token = (id: string): Token =>
	({ id, type: "asset", chainId: "pah", symbol: id }) as Token;

const pooled = token("asset::pah::1");
const unpooled = token("asset::pah::2");

const locked = {
	tokenId: pooled.id,
	plancks: 500n,
	isLoading: false,
	isInitializing: false,
};

describe("getTvlRows", () => {
	it("keeps a pooled token's row loading until its stable value arrives", () => {
		const [row] = getTvlRows({
			tokens: [pooled],
			lockedTokens: [locked],
			stableValues: [],
			isLoadingInputs: false,
		});
		expect(row).toEqual({
			tokenId: pooled.id,
			tokenPlancks: 500n,
			isInitializing: false,
			isLoadingTokenPlancks: false,
			stablePlancks: null,
			isLoadingStablePlancks: true,
			isLowLiquidity: false,
		});
	});

	it("pairs each locked token with its own stable value", () => {
		const [row] = getTvlRows({
			tokens: [pooled],
			lockedTokens: [locked],
			stableValues: [{ stablePlancks: 1_000n, isLoadingStablePlancks: false }],
			isLoadingInputs: false,
		});
		expect(row).toMatchObject({
			stablePlancks: 1_000n,
			isLoadingStablePlancks: false,
		});
	});

	it("reports a token without a pool as settled with no locked value", () => {
		const [row] = getTvlRows({
			tokens: [unpooled],
			lockedTokens: [locked],
			stableValues: [{ stablePlancks: 1_000n, isLoadingStablePlancks: false }],
			isLoadingInputs: false,
		});
		expect(row).toEqual({
			tokenId: unpooled.id,
			tokenPlancks: null,
			isInitializing: false,
			isLoadingTokenPlancks: false,
			stablePlancks: null,
			isLoadingStablePlancks: false,
			isLowLiquidity: false,
		});
	});

	it("reports every token as initializing while pools and balances load", () => {
		const [row] = getTvlRows({
			tokens: [unpooled],
			lockedTokens: [],
			stableValues: [],
			isLoadingInputs: true,
		});
		expect(row).toMatchObject({
			isInitializing: true,
			isLoadingTokenPlancks: true,
		});
	});
});
