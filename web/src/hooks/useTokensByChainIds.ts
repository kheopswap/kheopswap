import type { ChainId, Token } from "@kheopswap/registry";
import {
	type ChainTokensState,
	getTokensByChains$,
} from "@kheopswap/services/tokens";
import { type Dictionary, values } from "lodash";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

type UseTokensByChainIdsProps = {
	chainIds: ChainId[];
};

type UseTokensByChainIdsResult = {
	isLoading: boolean;
	data: Dictionary<Token>;
};

export const useTokensByChainIds = ({
	chainIds,
}: UseTokensByChainIdsProps): UseTokensByChainIdsResult => {
	const tokens$ = useMemo(
		() =>
			getTokensByChains$(chainIds).pipe(
				map((tokensByChains) => {
					const states = values(tokensByChains).filter(
						(v: unknown): v is ChainTokensState => !!v,
					);
					return {
						isLoading: states.some(
							(statusAndTokens) => statusAndTokens.status !== "loaded",
						),
						data: states
							.map((chainTokens) => chainTokens.tokens)
							.reduce((acc, tokens) => Object.assign(acc, tokens), {}),
					};
				}),
			),
		[chainIds],
	);

	const defaultValue = useMemo(
		() => ({ isLoading: !chainIds.length, data: {} }),
		[chainIds],
	);

	return useObservable(tokens$, defaultValue);
};
