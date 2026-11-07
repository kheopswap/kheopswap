import { useMemo } from "react";
import { combineLatest, map, type Observable, of } from "rxjs";
import type { Token, TokenId } from "../registry/tokens/types";
import { getTokenById$ } from "../services/tokens/service";
import { getStablePlancks$ } from "../state/prices";
import { stableToken$ } from "../state/relay";
import { bindSerialized } from "../utils/bindSerialized";
import { isBigInt } from "../utils/isBigInt";
import { plancksToTokens } from "../utils/plancks";

type UseStablePrice = {
	tokenId: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

type StableValue = {
	isLoading: boolean;
	token: Token | null | undefined;
	stableToken: Token | undefined;
	stablePlancks: bigint | null | undefined;
};

const NO_TOKEN = { token: null, status: "loaded" } as const;
const NO_PLANCKS = { stablePlancks: undefined, isLoadingStablePlancks: false };

const useStableValue = bindSerialized(
	(tokenId: TokenId | null, plancks: bigint | null): Observable<StableValue> =>
		combineLatest([
			tokenId ? getTokenById$(tokenId) : of(NO_TOKEN),
			stableToken$,
			tokenId && isBigInt(plancks)
				? getStablePlancks$(tokenId, plancks)
				: of(NO_PLANCKS),
		]).pipe(
			map(
				([
					{ token, status },
					stableToken,
					{ stablePlancks, isLoadingStablePlancks },
				]) => ({
					isLoading: status !== "loaded" || isLoadingStablePlancks,
					token,
					stableToken,
					stablePlancks,
				}),
			),
		),
	(): StableValue => ({
		isLoading: true,
		token: undefined,
		stableToken: undefined,
		stablePlancks: undefined,
	}),
);

export const useStablePlancks = ({ tokenId, plancks }: UseStablePrice) =>
	useStableValue(tokenId ?? null, plancks ?? null);

export const useStablePrice = ({ tokenId, plancks }: UseStablePrice) => {
	const { isLoading, token, stableToken, stablePlancks } = useStablePlancks({
		tokenId,
		plancks,
	});

	return useMemo(
		() => ({
			isLoading,
			token,
			stableToken,
			price:
				isBigInt(stablePlancks) && stableToken
					? plancksToTokens(stablePlancks, stableToken.decimals)
					: undefined,
		}),
		[isLoading, token, stableToken, stablePlancks],
	);
};
