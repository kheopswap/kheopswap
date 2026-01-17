import type { Pool } from "@kheopswap/services/pools";
import { isBigInt } from "@kheopswap/utils";
import { useMemo } from "react";
import { useBalance, useStablePlancks } from "src/hooks";

type UsePoolValuation = {
	pool: Pool | null;
};

export const usePoolValuation = ({ pool }: UsePoolValuation) => {
	const { data: reserve1, isLoading: isLoadingNative } = useBalance({
		address: pool?.owner,
		tokenId: pool?.tokenIds[0],
	});
	const { data: reserve2, isLoading: isLoadingAsset } = useBalance({
		address: pool?.owner,
		tokenId: pool?.tokenIds[1],
	});

	const {
		stablePlancks: valuation1,
		stableToken,
		isLoading: isLoadingStable1,
	} = useStablePlancks({ tokenId: pool?.tokenIds[0], plancks: reserve1 });
	const { stablePlancks: valuation2, isLoading: isLoadingStable2 } =
		useStablePlancks({ tokenId: pool?.tokenIds[1], plancks: reserve2 });

	return useMemo(() => {
		return {
			valuation:
				isBigInt(valuation1) && isBigInt(valuation2)
					? valuation1 + valuation2
					: null,
			isLoading:
				isLoadingNative ||
				isLoadingAsset ||
				isLoadingStable1 ||
				isLoadingStable2,
			stableToken,
		};
	}, [
		isLoadingAsset,
		isLoadingNative,
		isLoadingStable1,
		isLoadingStable2,
		stableToken,
		valuation1,
		valuation2,
	]);
};
