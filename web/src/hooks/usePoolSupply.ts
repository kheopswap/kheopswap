import { useMemo } from "react";

import { usePoolSupplies } from "./usePoolSupplies";

import type { TokenId, TokenIdsPair } from "src/config/tokens";

type UsePoolSupplyProps = {
	tokenId1: TokenId | null | undefined;
	tokenId2: TokenId | null | undefined;
};

type UsePoolSupplyResult = {
	isLoading: boolean;
	data: bigint | undefined;
};

export const usePoolSupply = ({
	tokenId1,
	tokenId2,
}: UsePoolSupplyProps): UsePoolSupplyResult => {
	const pairs = useMemo<TokenIdsPair[]>(
		() =>
			!!tokenId1 && !!tokenId2 ? [[tokenId1, tokenId2] as TokenIdsPair] : [],
		[tokenId1, tokenId2],
	);

	const { data, isLoading } = usePoolSupplies({ pairs });

	return {
		data: data?.[0].supply,
		isLoading,
	};
};
