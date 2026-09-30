import { map } from "rxjs";
import type { TokenIdsPair } from "../registry/tokens/types";
import { getPoolSupplies$ } from "../services/poolSupplies/service";
import { bindSerialized } from "../utils/bindSerialized";

type UsePoolSuppliesProps = {
	pairs: TokenIdsPair[] | undefined;
};
type PoolSupplyState = {
	pair: TokenIdsPair;
	isLoading: boolean;
	supply: bigint | undefined;
};

type UsePoolSuppliesResult = {
	isLoading: boolean;
	data: PoolSupplyState[];
};

const usePoolSuppliesByPairs = bindSerialized(
	({ pairs }: { pairs: TokenIdsPair[] }) =>
		getPoolSupplies$(pairs).pipe(
			map(
				(poolSupplies): UsePoolSuppliesResult => ({
					data: poolSupplies.map((ps) => ({
						pair: ps.pair,
						supply: ps.supply,
						isLoading: ps.status !== "loaded",
					})),
					isLoading: poolSupplies.some((b) => b.status !== "loaded"),
				}),
			),
		),
	({ pairs }): UsePoolSuppliesResult => ({
		isLoading: !!pairs.length,
		data: [],
	}),
);

export const usePoolSupplies = ({
	pairs,
}: UsePoolSuppliesProps): UsePoolSuppliesResult =>
	usePoolSuppliesByPairs({ pairs: pairs ?? [] });
