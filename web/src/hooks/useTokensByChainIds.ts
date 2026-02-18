import { values } from "lodash-es";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { getTokensByChains$ } from "../services/tokens/service";
import type { ChainTokensState } from "../services/tokens/state";

type UseTokensByChainIdsProps = {
	chainIds: ChainId[];
};

type UseTokensByChainIdsResult = {
	isLoading: boolean;
	data: Record<string, Token>;
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
