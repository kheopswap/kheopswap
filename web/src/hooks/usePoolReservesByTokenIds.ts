import type { TokenId } from "@kheopswap/registry";
import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import { getPoolReserves$ } from "src/state";
import type { LoadingState } from "src/types";

type UsePoolReservesByTokenIdsProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

type UsePoolReservesByTokenIdsResult = LoadingState<[bigint, bigint] | null>;

const DEFAULT_VALUE: UsePoolReservesByTokenIdsResult = {
	data: null,
	isLoading: true,
};

// bind() with factory function for parameterized observable
const [usePoolReservesInternal] = bind(
	(
		tokenId1: TokenId | null | undefined,
		tokenId2: TokenId | null | undefined,
	) =>
		getPoolReserves$(tokenId1, tokenId2).pipe(
			map(({ reserves, isLoading }) => ({ data: reserves, isLoading })),
		),
	DEFAULT_VALUE,
);

export const usePoolReservesByTokenIds = ({
	tokenId1,
	tokenId2,
}: UsePoolReservesByTokenIdsProps): UsePoolReservesByTokenIdsResult => {
	return usePoolReservesInternal(tokenId1, tokenId2);
};
