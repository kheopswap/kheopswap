import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getPoolReserves$ } from "../state/pools";

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
