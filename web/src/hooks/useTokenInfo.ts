import { useMemo } from "react";

import type { TokenId, TokenInfo } from "src/config/tokens";
import { useTokenInfos } from "./useTokenInfos";

type UseTokenInfoProps = {
	tokenId: TokenId | null | undefined;
};

type UseTokenInfoResult = {
	isLoading: boolean;
	data: TokenInfo | undefined;
};

export const useTokenInfo = ({
	tokenId,
}: UseTokenInfoProps): UseTokenInfoResult => {
	const tokenIds = useMemo(
		() => [tokenId].filter(Boolean) as TokenId[],
		[tokenId],
	);

	const { isLoading, data } = useTokenInfos({ tokenIds });

	return { isLoading, data: data?.[0]?.tokenInfo };
};
