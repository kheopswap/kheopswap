import { useMemo } from "react";
import type { Pool } from "../services/pools/types";
import { useRelayChains } from "../state/relay";
import { usePoolsByChainId } from "./usePoolsByChainId";

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
