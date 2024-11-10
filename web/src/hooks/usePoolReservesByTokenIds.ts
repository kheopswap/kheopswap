import { useMemo } from "react";

import { usePoolReserves } from "./usePoolReserves";
import { usePoolsByChainId } from "./usePoolsByChainId";
import { useToken } from "./useToken";

import type { TokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";

type UsePoolReservesByTokenIdsProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

export const usePoolReservesByTokenIds = ({
	tokenId1,
	tokenId2,
}: UsePoolReservesByTokenIdsProps) => {
	const stop = logger.cumulativeTimer("usePoolReservesByTokenIds");

	const { data: token1, isLoading: isLoadingToken1 } = useToken({
		tokenId: tokenId1,
	});
	const { data: token2, isLoading: isLoadingToken2 } = useToken({
		tokenId: tokenId2,
	});

	const { data: pools, isLoading: isLoadingPool } = usePoolsByChainId({
		chainId: token1?.chainId === token2?.chainId ? token1?.chainId : null,
	});

	const pool = useMemo(() => {
		if (!pools || !token1 || !token2 || token1 === token2) return null;
		return pools.find(
			(pool) =>
				pool.tokenIds.includes(token1.id) && pool.tokenIds.includes(token2.id),
		);
	}, [pools, token1, token2]);

	const { data: reserves, isLoading: isLoadingReserves } = usePoolReserves({
		pool,
	});

	const output = useMemo(
		() => ({
			isLoading:
				isLoadingToken1 ||
				isLoadingToken2 ||
				isLoadingPool ||
				isLoadingReserves,
			data:
				reserves && token1
					? token1.type === "native"
						? reserves // native to asset
						: (reserves.slice().reverse() as [bigint, bigint]) // asset to native
					: null,
		}),
		[
			isLoadingPool,
			isLoadingReserves,
			isLoadingToken1,
			isLoadingToken2,
			reserves,
			token1,
		],
	);

	stop();

	return output;
};
