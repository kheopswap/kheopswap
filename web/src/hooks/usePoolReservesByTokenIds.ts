import type { TokenId } from "@kheopswap/registry";
import { useMemo } from "react";
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
	const obs = useMemo(
		() =>
			getPoolReserves$(tokenId1, tokenId2).pipe(
				map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
			),
		[tokenId1, tokenId2],
	);

	return useObservable(obs, DEFAULT_VALUE);
};
