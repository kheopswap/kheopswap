import { useMemo } from "react";

import { usePoolsByChainId } from "./usePoolsByChainId";
import { useRelayChains } from "./useRelayChains";

import type {
	TokenIdAsset,
	TokenIdForeignAsset,
} from "src/config/tokens/types";
import type { Pool } from "src/services/pools";

type UsePoolByTokenIdProps = {
	tokenId: TokenIdAsset | TokenIdForeignAsset | null | undefined;
};
type UsePoolByTokenIdResult = {
	data: Pool | null;
	isLoading: boolean;
};

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
