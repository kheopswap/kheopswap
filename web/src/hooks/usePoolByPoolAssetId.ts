import { useMemo } from "react";

import { usePoolsByChainId } from "./usePoolsByChainId";

import type { Pool } from "@kheopswap/services/pools";
import { useRelayChains } from "src/state";

type UsePoolByPoolAssetIdProps = {
	poolAssetId: number | null | undefined;
};
type UsePoolByPoolAssetIdResult = {
	data: Pool | null;
	isLoading: boolean;
};

export const usePoolByPoolAssetId = ({
	poolAssetId,
}: UsePoolByPoolAssetIdProps): UsePoolByPoolAssetIdResult => {
	const { assetHub } = useRelayChains();

	const { data: pools, isLoading } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const data = useMemo(
		() => pools?.find((p) => p.poolAssetId === Number(poolAssetId)) ?? null,
		[pools, poolAssetId],
	);

	return { data, isLoading };
};
