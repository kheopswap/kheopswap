import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import type { TokenIdsPair } from "../registry/tokens/types";
import { getPoolSupplies$ } from "../services/poolSupplies/service";

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

	const defaultValue = useMemo(
		() => ({ isLoading: !pairs?.length, data: [] }),
		[pairs],
	);

	return useObservable(poolSupplies$, defaultValue);
};
