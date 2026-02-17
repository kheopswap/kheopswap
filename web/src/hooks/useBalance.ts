import type { TokenId } from "@kheopswap/registry";
import { useMemo } from "react";
import { useBalances } from "./useBalances";

type UseBalanceProps = {
	address: string | null | undefined;
	tokenId: TokenId | null | undefined;
};

type UseBalanceResult = {
	isLoading: boolean;
	data: bigint | undefined;
};

export const useBalance = ({
	address,
	tokenId,
}: UseBalanceProps): UseBalanceResult => {
	const balanceDefs = useMemo(
		() => (address && tokenId ? [{ address, tokenId }] : undefined),
		[address, tokenId],
	);

	const { isLoading, data } = useBalances({ balanceDefs });

	return { isLoading, data: data?.[0]?.balance };
};
