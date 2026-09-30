import { values } from "lodash-es";
import { map } from "rxjs";
import type { ChainId } from "../registry/chains/types";
import type { Token } from "../registry/tokens/types";
import { getTokensByChains$ } from "../services/tokens/service";
import type { ChainTokensState } from "../services/tokens/state";
import { bindSerialized } from "../utils/bindSerialized";

type UseTokensByChainIdsProps = {
	chainIds: ChainId[];
};

type UseTokensByChainIdsResult = {
	isLoading: boolean;
	data: Record<string, Token>;
};

const useTokensByChains = bindSerialized(
	({ chainIds }: UseTokensByChainIdsProps) =>
		getTokensByChains$(chainIds).pipe(
			map((tokensByChains): UseTokensByChainIdsResult => {
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
	({ chainIds }): UseTokensByChainIdsResult => ({
		isLoading: !!chainIds.length,
		data: {},
	}),
);

export const useTokensByChainIds = ({
	chainIds,
}: UseTokensByChainIdsProps): UseTokensByChainIdsResult =>
	useTokensByChains({ chainIds });
