import { useMemo } from "react";

import { usePoolsByChainId } from "./usePoolsByChainId";
import { useRelayChains } from "./useRelayChains";

import type { Pool } from "@kheopswap/services/pools";

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
