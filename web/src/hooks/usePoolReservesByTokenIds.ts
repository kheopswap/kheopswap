import { useMemo } from "react";

import type { TokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import { getPoolReserves$ } from "src/state";

type UsePoolReservesByTokenIdsProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

const DEFAULT_VALUE = { data: undefined, isLoading: true };

export const usePoolReservesByTokenIds = ({
	tokenId1,
	tokenId2,
}: UsePoolReservesByTokenIdsProps) => {
	const stop = logger.cumulativeTimer("usePoolReservesByTokenIds");

	const obs = useMemo(
		() =>
			getPoolReserves$(tokenId1, tokenId2).pipe(
				map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
			),
		[tokenId1, tokenId2],
	);

	const res = useObservable(obs, DEFAULT_VALUE);

	stop();

	return res;
};
