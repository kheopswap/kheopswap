import type { ChainId, Token } from "@kheopswap/registry";
import {
	type ChainTokensState,
	getTokensByChains$,
} from "@kheopswap/services/tokens";
import { bind } from "@react-rxjs/core";
import { values } from "lodash-es";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UseTokensByChainIdsProps = {
	chainIds: ChainId[];
};

type UseTokensByChainIdsResult = LoadingState<Record<string, Token>>;

// Parse chainIds from serialized key
const parseChainIdsKey = (key: string): ChainId[] => {
	if (!key) return [];
	return key.split(",") as ChainId[];
};

// bind() only receives the serialized key
const [useTokensByChainIdsInternal] = bind(
	(chainIdsKey: string) => {
		const chainIds = parseChainIdsKey(chainIdsKey);
		return getTokensByChains$(chainIds).pipe(
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
		);
	},
	// Default value factory
	(chainIdsKey): UseTokensByChainIdsResult => {
		const chainIds = parseChainIdsKey(chainIdsKey);
		return {
			isLoading: !!chainIds.length,
			data: {},
		};
	},
);

export const useTokensByChainIds = ({
	chainIds,
}: UseTokensByChainIdsProps): UseTokensByChainIdsResult => {
	// Serialize chainIds for stable caching key
	const chainIdsKey = chainIds.join(",");
	return useTokensByChainIdsInternal(chainIdsKey);
};
