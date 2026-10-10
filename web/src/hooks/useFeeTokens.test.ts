import { act, renderHook } from "@testing-library/react";
import { BehaviorSubject } from "rxjs";
import { describe, expect, it, vi } from "vitest";
import { KNOWN_TOKENS_MAP } from "../registry/tokens/tokens";
import type { Token, TokenId } from "../registry/tokens/types";
import { useFeeTokens } from "./useFeeTokens";

const HYDRATION_DOT = "hydration-asset::hydration::5";
const PAYER = "147vNmBXQQYqcj7TTkuEY4eYEAXG58UyVHPiEFBYKAtkVL8w";

const chain = vi.hoisted(() => ({
	currency: undefined as unknown as BehaviorSubject<string>,
	tokenStates: new Map<string, unknown>(),
}));

vi.mock("../state/hydrationFees", () => ({
	getHydrationFeeCurrencyTokenId$: () => chain.currency,
}));

vi.mock("../services/tokens/service", () => ({
	getTokenById$: (tokenId: TokenId) => chain.tokenStates.get(tokenId),
	getTokensByChain$: () => {
		throw new Error("Hydration fee tokens must not list the chain's tokens");
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
