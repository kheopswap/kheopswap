import type { TokenIdsPair } from "@kheopswap/registry";
import { getPoolSupplies$ } from "@kheopswap/services/poolSupplies";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { LoadingState } from "src/types";

type UsePoolSuppliesProps = {
	pairs: TokenIdsPair[] | undefined;
};

type PoolSupplyState = {
	pair: TokenIdsPair;
	isLoading: boolean;
	supply: bigint | undefined;
};

type UsePoolSuppliesResult = LoadingState<PoolSupplyState[]>;

// Parse pairs from serialized key
const parsePairsKey = (key: string): TokenIdsPair[] => {
	if (!key) return [];
	return key.split(",,").map((item) => {
		const [t0, t1] = item.split("||");
		return [t0, t1] as TokenIdsPair;
	});
};

// bind() only receives the serialized key
const [usePoolSuppliesInternal] = bind(
	(pairsKey: string) => {
		const pairs = parsePairsKey(pairsKey);
		return getPoolSupplies$(pairs).pipe(
			map((poolSupplies) => ({
				data: poolSupplies.map((ps) => ({
					pair: ps.pair,
					supply: ps.supply,
					isLoading: ps.status !== "loaded",
				})),
				isLoading: poolSupplies.some((b) => b.status !== "loaded"),
			})),
		);
	},
	// Default value factory
	(pairsKey): UsePoolSuppliesResult => {
		const pairs = parsePairsKey(pairsKey);
		return {
			isLoading: !!pairs.length,
			data: [],
		};
	},
);

export const usePoolSupplies = ({
	pairs,
}: UsePoolSuppliesProps): UsePoolSuppliesResult => {
	const safePairs = pairs ?? [];
	// Serialize pairs for stable caching key (use || and ,, as separators since tokenIds contain ::)
	const pairsKey = safePairs.map((p) => `${p[0]}||${p[1]}`).join(",,");
	return usePoolSuppliesInternal(pairsKey);
};
