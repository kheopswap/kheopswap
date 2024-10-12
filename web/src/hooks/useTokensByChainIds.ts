import { type Dictionary, values } from "lodash";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

import type { ChainId } from "@kheopswap/registry";
import type { Token } from "@kheopswap/registry";
import { getTokensByChains$ } from "src/services/tokens";

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
				map((tokensByChains) => ({
					isLoading: values(tokensByChains).some(
						(statusAndTokens) => statusAndTokens.status !== "loaded",
					),
					data: values(tokensByChains)
						.map((chainTokens) => chainTokens.tokens)
						.reduce((acc, tokens) => Object.assign(acc, tokens), {}),
				})),
			),
		[chainIds],
	);

	const defaultValue = useMemo(
		() => ({ isLoading: !chainIds.length, data: {} }),
		[chainIds],
	);

	return useObservable(tokens$, defaultValue);
};
