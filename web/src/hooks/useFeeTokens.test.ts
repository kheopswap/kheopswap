import { act, renderHook } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { Token, TokenId } from "../registry/tokens/types";
import { useFeeTokens } from "./useFeeTokens";

const HYDRATION_DOT = "hydration-asset::hydration::5";
const PAYER = "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w";
const OTHER_PAYER = "15oF4uVJwmo4TdGW7VfQxNLavjCXviqxT9S1MgbjMNHr6Sp5";

const chain = vi.hoisted(() => ({
	currency: undefined as unknown as BehaviorSubject<string>,
	tokenStates: new Map<string, unknown>(),
	tokensByChain: new Map<string, unknown>(),
	poolsByChain: new Map<string, unknown>(),
}));

vi.mock("../services/pools/service", () => ({
	getPoolsByChain$: (chainId: string) => chain.poolsByChain.get(chainId),
}));

vi.mock("../state/hydrationFees", () => ({
	getHydrationFeeCurrencyTokenId$: () => chain.currency,
}));

vi.mock("../services/tokens/service", () => ({
	getTokenById$: (tokenId: TokenId) => chain.tokenStates.get(tokenId),
	getTokensByChain$: (chainId: string) => {
		const tokens = chain.tokensByChain.get(chainId);
		if (!tokens)
			throw new Error("Hydration fee tokens must not list the chain's tokens");
		return tokens;
	},
}));

const hydrationDot = KNOWN_TOKENS_MAP[HYDRATION_DOT];
if (!hydrationDot) throw new Error("Hydration DOT not found");

describe("useFeeTokens on Hydration", () => {
	it("offers only the account's fee currency, once the registry resolves it", () => {
		chain.currency = new BehaviorSubject(HYDRATION_DOT);
		const dotState = new BehaviorSubject<{
			status: string;
			token: Token | undefined;
		}>({ status: "loading", token: undefined });
		chain.tokenStates.set(HYDRATION_DOT, dotState);

		const { result } = renderHook(() =>
			useFeeTokens({ chainId: "hydration", address: PAYER }),
		);
		expect(result.current).toEqual({ isLoading: true, data: undefined });

		act(() => dotState.next({ status: "loaded", token: hydrationDot }));
		expect(result.current).toEqual({ isLoading: false, data: [hydrationDot] });
	});
});

describe("useFeeTokens on Asset Hub", () => {
	const pah = KNOWN_TOKENS_MAP["native::pah"];
	const usdc = KNOWN_TOKENS_MAP["asset::pah::1337"];
	if (!pah || !usdc) throw new Error("Polkadot Asset Hub tokens not found");
	const unpooled = {
		...usdc,
		id: "asset::pah::9999",
		symbol: "NOPOOL",
	} as Token;
	const unsufficient = {
		...usdc,
		id: "asset::pah::9998",
		symbol: "DUST",
		isSufficient: false,
	} as Token;

	it("offers the native token and the sufficient tokens the chain can convert into it", () => {
		chain.tokensByChain.set(
			"pah",
			new BehaviorSubject({
				status: "loaded",
				tokens: {
					[pah.id]: pah,
					[usdc.id]: usdc,
					[unpooled.id]: unpooled,
					[unsufficient.id]: unsufficient,
				},
			}),
		);
		const pools = new BehaviorSubject({
			status: "loading",
			pools: [] as unknown[],
		});
		chain.poolsByChain.set("pah", pools);

		const { result } = renderHook(() =>
			useFeeTokens({ chainId: "pah", address: PAYER }),
		);
		expect(result.current).toEqual({ isLoading: false, data: [pah] });

		act(() =>
			pools.next({
				status: "loaded",
				pools: [{ tokenIds: [pah.id, usdc.id] }],
			}),
		);
		expect(result.current).toEqual({ isLoading: false, data: [pah, usdc] });
	});

	it("keeps offering the native token when the pools never load", () => {
		chain.tokensByChain.set(
			"pah",
			new BehaviorSubject({
				status: "loaded",
				tokens: { [pah.id]: pah, [usdc.id]: usdc },
			}),
		);
		const pools = new BehaviorSubject({
			status: "stale",
			pools: [] as unknown[],
		});
		chain.poolsByChain.set("pah", pools);

		const { result } = renderHook(() =>
			useFeeTokens({ chainId: "pah", address: OTHER_PAYER }),
		);
		expect(result.current).toEqual({ isLoading: false, data: [pah] });

		act(() => pools.next({ status: "loading", pools: [] }));
		expect(result.current).toEqual({ isLoading: false, data: [pah] });
	});
});
