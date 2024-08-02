import { useMemo } from "react";

import { usePoolsByChainId } from "./usePoolsByChainId";

import { ChainId } from "src/config/chains";
import { TokenIdsPair } from "src/config/tokens";

type UsePoolByAssetsProps = {
	chainId: ChainId;
	tokenIds: TokenIdsPair | null | undefined;
};

export const usePoolByTokenIds = ({
	chainId,
	tokenIds,
}: UsePoolByAssetsProps) => {
	const { data: pools, isLoading } = usePoolsByChainId({ chainId });

	const pool = useMemo(
		() =>
			(tokenIds &&
				pools?.find((p) =>
					tokenIds.every((tokenId) => p.tokenIds.includes(tokenId)),
				)) ||
			null,
		[pools, tokenIds],
	);

	return { data: pool, isLoading };
};
