import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";

import { TokenIdsPair } from "src/config/tokens";
import { getPoolSupplies$ } from "src/services/poolSupplies";

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

export const usePoolSupplies = ({
	pairs,
}: UsePoolSuppliesProps): UsePoolSuppliesResult => {
	const poolSupplies$ = useMemo(
		() =>
			getPoolSupplies$(pairs ?? []).pipe(
				map((poolSupplies) => ({
					data: poolSupplies.map((ps) => ({
						pair: ps.pair,
						supply: ps.supply,
						isLoading: ps.status !== "loaded",
					})),
					isLoading: poolSupplies.some((b) => b.status !== "loaded"),
				})),
			),
		[pairs],
	);

	return useObservable(poolSupplies$, { isLoading: !pairs?.length, data: [] });
};
