import type { TokenIdAsset, TokenIdForeignAsset } from "@kheopswap/registry";
import type { Pool } from "@kheopswap/services/pools";
import { useMemo } from "react";
import { useRelayChains } from "src/state";
import type { LoadingState } from "src/types";
import { usePoolsByChainId } from "./usePoolsByChainId";

type UsePoolByTokenIdProps = {
	tokenId: TokenIdAsset | TokenIdForeignAsset | null | undefined;
};

type UsePoolByTokenIdResult = LoadingState<Pool | null>;

export const usePoolByTokenId = ({
	tokenId,
}: UsePoolByTokenIdProps): UsePoolByTokenIdResult => {
	const { assetHub } = useRelayChains();

	const { data: pools, isLoading } = usePoolsByChainId({
		chainId: assetHub.id,
	});

	const data = useMemo(() => {
		if (!tokenId) return null;
		return pools?.find((p) => p.tokenIds.includes(tokenId)) ?? null;
	}, [pools, tokenId]);

	return { data, isLoading };
};
