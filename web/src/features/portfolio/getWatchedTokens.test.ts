import { describe, expect, it } from "vitest";
import type { Token } from "../../registry/tokens/types";
import type { BalanceWithStableSummary } from "../../types/balances";
import {
	getWatchedTokens,
	isListedRow,
	matchesTokenSearch,
} from "./getWatchedTokens";

const asset = (
	assetId: number,
	symbol: string,
	overrides: Partial<Token> = {},
): Token =>
	({
		id: `asset::pah::${assetId}`,
		type: "asset",
		chainId: "pah",
		assetId,
		symbol,
		name: `${symbol} token`,
		decimals: 6,
		verified: false,
		isSufficient: false,
		...overrides,
	}) as Token;

const native: Token = {
	id: "native::pah",
	type: "native",
	chainId: "pah",
	symbol: "DOT",
	name: "Polkadot",
	decimals: 10,
	verified: undefined,
	isSufficient: true,
};

const usdc = asset(1337, "USDC", { verified: true });
const pooled = asset(42, "PINK");
const held = asset(77, "HELD");
const obscure = asset(999, "OBS");

const tokens = [native, usdc, pooled, held, obscure];

describe("getWatchedTokens", () => {
	it("watches native, verified, pooled and cached held tokens, not the rest", () => {
		const watched = getWatchedTokens({
			tokens,
			poolTokenIds: new Set([pooled.id]),
			heldTokenIds: new Set([held.id]),
			search: "",
		});
		expect(watched.map((t) => t.symbol)).toEqual([
			"DOT",
			"USDC",
			"PINK",
			"HELD",
		]);
	});

	it("adds the tokens matching the search", () => {
		const watched = getWatchedTokens({
			tokens,
			poolTokenIds: new Set(),
			heldTokenIds: new Set(),
			search: "obs",
		});
		expect(watched.map((t) => t.symbol)).toEqual(["DOT", "USDC", "OBS"]);
	});
});

const summary = (token: Token, tokenPlancks: bigint) =>
	({
		tokenId: token.id,
		tokenPlancks,
		isLoadingTokenPlancks: false,
		isLoadingStablePlancks: false,
		isInitializing: false,
		status: "unpriced",
		stablePlancks: null,
	}) satisfies BalanceWithStableSummary;

describe("isListedRow", () => {
	const poolTokenIds = new Set([pooled.id]);
	const row = (
		token: Token,
		{ balance = null as bigint | null, tvl = null as bigint | null } = {},
	) => ({
		token,
		balance: balance === null ? null : summary(token, balance),
		tvl: tvl === null ? null : summary(token, tvl),
		price: null,
	});

	it("lists native, verified and pooled tokens before any balance or reserve loads", () => {
		expect(isListedRow(row(native), poolTokenIds)).toBe(true);
		expect(isListedRow(row(usdc), poolTokenIds)).toBe(true);
		expect(isListedRow(row(pooled), poolTokenIds)).toBe(true);
	});

	it("lists an unverified token outside pools only while it is held", () => {
		expect(isListedRow(row(held, { balance: 5n }), poolTokenIds)).toBe(true);
		expect(isListedRow(row(held, { balance: 0n }), poolTokenIds)).toBe(false);
		expect(isListedRow(row(obscure, { tvl: 5n }), poolTokenIds)).toBe(false);
	});
});

describe("matchesTokenSearch", () => {
	it("matches the symbol, the name or the exact asset id, never an empty search", () => {
		expect(matchesTokenSearch(obscure, "ob")).toBe(true);
		expect(matchesTokenSearch(obscure, "OBS token")).toBe(true);
		expect(matchesTokenSearch(obscure, "999")).toBe(true);
		expect(matchesTokenSearch(obscure, "99")).toBe(false);
		expect(matchesTokenSearch(obscure, "  ")).toBe(false);
	});
});
