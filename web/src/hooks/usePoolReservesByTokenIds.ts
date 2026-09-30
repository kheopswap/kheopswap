import { bind } from "@react-rxjs/core";
import { map } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getPoolReserves$ } from "../services/pools/reserves";

type UsePoolReservesByTokenIdsProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

type UsePoolReservesByTokenIdsResult = {
	data: [bigint, bigint] | null | undefined;
	isLoading: boolean;
};

const [usePoolReserves] = bind(
	(tokenId1: TokenId | null, tokenId2: TokenId | null) =>
		getPoolReserves$(tokenId1, tokenId2).pipe(
			map(
				({ reserves, isLoading }): UsePoolReservesByTokenIdsResult => ({
					data: reserves,
					isLoading,
				}),
			),
		),
	{ data: undefined, isLoading: true } as UsePoolReservesByTokenIdsResult,
);

export const usePoolReservesByTokenIds = ({
	tokenId1,
	tokenId2,
}: UsePoolReservesByTokenIdsProps): UsePoolReservesByTokenIdsResult =>
	usePoolReserves(tokenId1 ?? null, tokenId2 ?? null);
